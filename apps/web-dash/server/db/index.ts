import { drizzle } from 'drizzle-orm/node-postgres'

let _db: ReturnType<typeof drizzle> | null = null

export function useDb() {
  if (!_db) {
    const config = useRuntimeConfig()

    if (!config.databaseUrl) {
      throw new Error('NUXT_DATABASE_URL is required')
    }

    _db = drizzle(config.databaseUrl)
  }
  return _db
}
