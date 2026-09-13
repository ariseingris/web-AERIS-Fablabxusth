-- Community feed interaction storage.
-- The backend's recommended/trending endpoints use this table for
-- view/share/interaction history. The table was missing from the current
-- Supabase project, which caused PostgREST relationship errors.

CREATE TABLE IF NOT EXISTS public.community_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'share', 'view')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_interactions_post_id_idx
  ON public.community_interactions(post_id);

CREATE INDEX IF NOT EXISTS community_interactions_user_id_idx
  ON public.community_interactions(user_id);

CREATE INDEX IF NOT EXISTS community_interactions_user_post_idx
  ON public.community_interactions(user_id, post_id);

CREATE INDEX IF NOT EXISTS community_interactions_created_at_idx
  ON public.community_interactions(created_at DESC);

ALTER TABLE public.community_interactions ENABLE ROW LEVEL SECURITY;

-- Backend uses SUPABASE_SERVICE_KEY when configured, so these policies are
-- intentionally limited to authenticated clients. They also make the table
-- safe if the anon/authenticated client is ever used directly.
DROP POLICY IF EXISTS "authenticated can read own community interactions" ON public.community_interactions;
CREATE POLICY "authenticated can read own community interactions"
  ON public.community_interactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "authenticated can insert own community interactions" ON public.community_interactions;
CREATE POLICY "authenticated can insert own community interactions"
  ON public.community_interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Refresh PostgREST schema cache so nested community_posts ->
-- community_interactions selects are immediately recognized.
NOTIFY pgrst, 'reload schema';
