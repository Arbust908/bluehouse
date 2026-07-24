import { drizzle } from "drizzle-orm/bun-sql/postgres";
import { migrate } from "drizzle-orm/bun-sql/postgres/migrator";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const db = drizzle(databaseUrl);

try {
  await migrate(db, {
    migrationsFolder: `${import.meta.dir}/../drizzle`,
  });

  console.info("Database migrations completed");
} finally {
  await db.$client.close();
}