import { drizzle } from "drizzle-orm/bun-sql/postgres";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { pollRates } from "./poll";

const POLL_LOCK_ID = 927_401;
const connection = await db.$client.reserve();

try {
  const lockedDb = drizzle({ client: connection });
  const [lock] = await lockedDb.execute<{ acquired: boolean }>(sql`
    SELECT pg_try_advisory_lock(${POLL_LOCK_ID}) AS acquired
  `);

  if (!lock?.acquired) {
    console.info("Poll already running; skipping");
  } else {
    try {
      console.info(JSON.stringify(await pollRates(lockedDb)));
    } finally {
      await lockedDb.execute(sql`
        SELECT pg_advisory_unlock(${POLL_LOCK_ID})
      `);
    }
  }
} finally {
  connection.release();
  await db.$client.close();
}
