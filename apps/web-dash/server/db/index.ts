import { drizzle } from 'drizzle-orm/node-postgres'

let _db: ReturnType<typeof drizzle> | null = null

export function useDb() {
  console.log('useDb called')
  if (!_db) {
    console.log('Initializing database connection')
    const config = useRuntimeConfig()

    if (!config.databaseUrl) {
      throw new Error('NUXT_DATABASE_URL is required')
    }
    console.log('Database URL:', config.databaseUrl)

    _db = drizzle(config.databaseUrl)
  }
  console.log('Returning database connection')
  return _db
}
