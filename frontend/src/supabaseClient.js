import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const client = createClient(supabaseUrl, supabaseKey)

// Community moderation historically used both `published` and `approved`
// as public states. Keep the client compatible with both while excluding
// moderation-only states such as `pending`, `uncertain`, `hidden`, `removed`.
function wrapCommunityQuery(query) {
  return new Proxy(query, {
    get(target, prop, receiver) {
      if (prop === 'then' || prop === 'catch' || prop === 'finally') {
        const value = Reflect.get(target, prop, receiver)
        return typeof value === 'function' ? value.bind(target) : value
      }

      if (prop === 'in') {
        return (column, values) => {
          if (
            column === 'status' &&
            Array.isArray(values) &&
            values.includes('published')
          ) {
            // Canonical public states: published + legacy approved.
            return wrapCommunityQuery(
              target.in(column, ['published', 'approved'])
            )
          }
          return wrapCommunityQuery(target.in(column, values))
        }
      }

      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value

      return (...args) => {
        const result = value.apply(target, args)
        return result && typeof result === 'object'
          ? wrapCommunityQuery(result)
          : result
      }
    },
  })
}

const originalFrom = client.from.bind(client)
client.from = (table) => {
  const query = originalFrom(table)
  return table === 'community_posts' ? wrapCommunityQuery(query) : query
}

export const supabase = client
