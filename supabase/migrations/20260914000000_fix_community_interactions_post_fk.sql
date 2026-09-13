-- Fix PostgREST relationship discovery for the Community feed.
--
-- The backend uses community_interactions(post_id) when building
-- recommended/trending feeds. The database currently has FKs from
-- community_comments.post_id and community_likes.post_id to
-- community_posts.id, but no FK from community_interactions.post_id.
--
-- This migration is intentionally idempotent and uses NOT VALID so existing
-- orphaned interaction rows do not block deployment. The FK still exists in
-- PostgreSQL metadata, allowing PostgREST to discover the relationship.
-- Existing orphan rows should be audited separately before validating the FK.

DO $$
BEGIN
  IF to_regclass('public.community_interactions') IS NULL THEN
    RAISE EXCEPTION 'Required table public.community_interactions does not exist';
  END IF;

  IF to_regclass('public.community_posts') IS NULL THEN
    RAISE EXCEPTION 'Required table public.community_posts does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'community_interactions'
      AND column_name = 'post_id'
  ) THEN
    RAISE EXCEPTION 'Required column public.community_interactions.post_id does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'community_posts'
      AND column_name = 'id'
  ) THEN
    RAISE EXCEPTION 'Required column public.community_posts.id does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class child ON child.oid = c.conrelid
    JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
    JOIN pg_class parent ON parent.oid = c.confrelid
    JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
    WHERE c.contype = 'f'
      AND child_ns.nspname = 'public'
      AND child.relname = 'community_interactions'
      AND parent_ns.nspname = 'public'
      AND parent.relname = 'community_posts'
      AND c.conkey = ARRAY[
        (SELECT attnum
         FROM pg_attribute
         WHERE attrelid = child.oid
           AND attname = 'post_id'
           AND NOT attisdropped)
      ]::smallint[]
      AND c.confkey = ARRAY[
        (SELECT attnum
         FROM pg_attribute
         WHERE attrelid = parent.oid
           AND attname = 'id'
           AND NOT attisdropped)
      ]::smallint[]
  ) THEN
    EXECUTE 'ALTER TABLE public.community_interactions
             ADD CONSTRAINT community_interactions_post_id_fkey
             FOREIGN KEY (post_id)
             REFERENCES public.community_posts(id)
             NOT VALID';
  END IF;
END $$;

-- Refresh PostgREST's schema cache immediately after the FK change.
NOTIFY pgrst, 'reload schema';
