# Refined architecture

Build this as a **Nuxt 4 monorepo with one full-stack application and one polling worker**:

```text
dolar-tracker/
├── apps/
│   ├── web/              # Nuxt dashboard + public API
│   └── poller/           # Scheduled DolarAPI ingestion worker
├── packages/
│   └── shared/           # Schemas, validators, domain types
├── drizzle/              # PostgreSQL migrations
├── docker/
├── package.json
└── bun.lock
```

Runtime topology:

```text
Internet
   │
   ▼
Nuxt application
   ├── Dashboard pages
   ├── /api/v1/* endpoints
   ├── PostgreSQL reads
   ├── Redis cache
   └── SQLite request logs
          │
          └── Persistent volume

Poller container
   ├── DolarAPI fetch
   ├── Validation
   ├── PostgreSQL writes
   └── Redis invalidation

PostgreSQL
   └── Historical source of truth

Redis
   ├── API response cache
   ├── rate limiting
   ├── poller locks
   └── ingestion state
```

Nuxt already provides server endpoints and middleware through Nitro/H3, so the dashboard and API belong naturally in the same application. Files under `server/api` become `/api/*` endpoints, while `server/middleware` runs before route handlers. ([Nuxt][1])

This preserves the original goals: historical rates, monthly comparisons, conversion tools, durable caching, and API usage analytics. 

---

# Important architecture decisions

## 1. Nuxt owns reads; poller owns writes

The Nuxt application should treat PostgreSQL rate data as read-only.

The poller is the only service allowed to:

* Call DolarAPI.
* Insert rate observations.
* Record polling runs.
* Invalidate affected Redis keys.

This gives you a clean operational boundary:

```text
Nuxt:
GET data → cache it → expose it

Poller:
fetch data → validate it → persist it → invalidate cache
```

It prevents API requests from accidentally triggering external fetches and makes ingestion failures independent from dashboard availability.

## 2. PostgreSQL stores observations, not “the current rate”

Every upstream response becomes an immutable observation. Do not update the previous row to represent the latest value.

That enables:

* Historical charts.
* Change calculations.
* Auditing.
* Detecting upstream corrections.
* Rebuilding aggregates.

The only mutable records should be operational metadata such as polling status.

## 3. Redis is an optimization, never the source of truth

A Redis loss should cause temporary PostgreSQL reads, not data loss.

Use Redis for:

* Latest-rate responses.
* Historical query responses.
* Chart aggregates.
* Rate limiting.
* Distributed poller locks.
* Conditional polling/backoff state.

## 4. SQLite analytics require a single Nuxt replica

A local SQLite database is appropriate while the Nuxt application runs as one container. Bun provides a built-in SQLite driver, and WAL mode improves concurrent reads with a single writer. ([Bun][2])

However:

```text
Nuxt replica A → /data/logs.db
Nuxt replica B → /data/logs.db
```

must not happen over a regular shared network volume. SQLite is not the right coordination mechanism for multiple application replicas.

Therefore:

* **MVP:** one Nuxt replica with persistent SQLite volume.
* **Scale-out:** move API analytics to PostgreSQL, ClickHouse, or an external analytics system.

Document this constraint explicitly.

## 5. Start with polling twice daily

There is little value in polling every 15 minutes if the goal is primarily historical daily data.

Start with:

```text
10:30 America/Argentina/Buenos_Aires
16:30 America/Argentina/Buenos_Aires
```

Later, increase the cadence only when you have a concrete feature requiring intraday data.

Dokploy scheduled jobs can execute commands inside application containers and record each execution result. ([Dokploy][3])

---

# Phase 1 — Bootstrap the monorepo

## Step 1: Create the workspace

```bash
mkdir dolar-tracker
cd dolar-tracker

bun init -y

mkdir -p apps packages
bunx nuxi@latest init apps/web
mkdir -p apps/poller/src
mkdir -p packages/shared/src
```

Root `package.json`:

```json
{
  "name": "dolar-tracker",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "bun --cwd apps/web dev",
    "build": "bun --cwd apps/web build",
    "preview": "bun --cwd apps/web preview",
    "poll": "bun --cwd apps/poller poll",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "typecheck": "bun --cwd apps/web typecheck",
    "test": "bun test"
  }
}
```

Use Nuxt’s current `app/` convention:

```text
apps/web/
├── app/
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── pages/
│   └── app.vue
├── server/
├── public/
└── nuxt.config.ts
```

Nuxt 4 creates page routes from files under `app/pages/`. ([Nuxt][4])

## Step 2: Create package manifests

`packages/shared/package.json`:

```json
{
  "name": "@dolar/shared",
  "private": true,
  "type": "module",
  "exports": {
    "./domain": "./src/domain.ts",
    "./validators": "./src/validators.ts",
    "./schema": "./src/schema.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.0",
    "zod": "^4.0.0"
  }
}
```

`apps/poller/package.json`:

```json
{
  "name": "@dolar/poller",
  "private": true,
  "type": "module",
  "scripts": {
    "poll": "bun src/index.ts"
  },
  "dependencies": {
    "@dolar/shared": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "zod": "^4.0.0"
  }
}
```

`apps/web/package.json` should include:

```json
{
  "dependencies": {
    "@dolar/shared": "workspace:*",
    "drizzle-orm": "^0.44.0",
    "zod": "^4.0.0"
  }
}
```

Then:

```bash
bun install
```

---

# Phase 2 — Establish local infrastructure

## Step 3: Add PostgreSQL and Redis

Create `docker-compose.local.yml`:

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: dolar
      POSTGRES_PASSWORD: dolar
      POSTGRES_DB: dolar
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dolar -d dolar"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:8-alpine
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Run:

```bash
docker compose -f docker-compose.local.yml up -d
```

Root `.env`:

```dotenv
DATABASE_URL=postgresql://dolar:dolar@localhost:5432/dolar
REDIS_URL=redis://localhost:6379

DOLAR_API_URL=https://dolarapi.com/v1/dolares

IP_HASH_SALT=replace-with-a-long-random-secret
LOG_DATABASE_PATH=./data/logs.db

NUXT_PUBLIC_API_BASE=/api/v1
```

Also commit `.env.example`, but never `.env`.

---

# Phase 3 — Model the domain

## Step 4: Define domain types

`packages/shared/src/domain.ts`:

```ts
export const CASAS = [
  'oficial',
  'blue',
  'bolsa',
  'contadoconliqui',
  'mayorista',
  'cripto',
  'tarjeta',
] as const

export type Casa = (typeof CASAS)[number]

export interface RateObservation {
  provider: 'dolarapi' | 'ambito'
  casa: Casa
  currency: 'USD'
  name: string
  buy: string | null
  sell: string | null
  upstreamUpdatedAt: Date
  observedAt: Date
  sourceFingerprint: string
}
```

Use strings for decimal values in transport and persistence-facing types. JavaScript floating-point arithmetic is not appropriate for monetary calculations.

Ámbito provides calendar dates rather than instants. Convert those dates to midnight in `America/Argentina/Buenos_Aires` with an IANA-timezone-aware conversion. Do not parse `DD/MM/YYYY` with the JavaScript `Date` constructor or assume Argentina has always used a fixed UTC offset.

`sourceFingerprint` is a SHA-256 hash of a stable JSON tuple containing provider, currency, casa, upstream instant, buy, and sell values. It makes repeated imports idempotent while retaining corrections and distinct same-day Ámbito observations.

## Step 5: Validate the upstream response

`packages/shared/src/validators.ts`:

```ts
import { z } from 'zod'
import { CASAS } from './domain'

export const dolarApiRateSchema = z.object({
  moneda: z.literal('USD'),
  casa: z.enum(CASAS),
  nombre: z.string().min(1),
  compra: z.number().finite().nonnegative().nullable(),
  venta: z.number().finite().nonnegative().nullable(),
  fechaActualizacion: z.iso.datetime(),
})

export const dolarApiResponseSchema = z.array(dolarApiRateSchema).min(1)

export type DolarApiRate = z.infer<typeof dolarApiRateSchema>
```

Validation must happen before opening a database transaction. A malformed upstream payload should produce a failed polling run, not partial inserts.

---

# Phase 4 — Design PostgreSQL

## Step 6: Create the Drizzle schema

`packages/shared/src/schema.ts`:

```ts
import {
  bigint,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const casaEnum = pgEnum('casa', [
  'oficial',
  'blue',
  'bolsa',
  'contadoconliqui',
  'mayorista',
  'cripto',
  'tarjeta',
])

export const providerEnum = pgEnum('provider', [
  'dolarapi',
  'ambito',
])

export const pollStatusEnum = pgEnum('poll_status', [
  'running',
  'success',
  'failed',
  'skipped',
])

export const pollRuns = pgTable('poll_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: pollStatusEnum('status').notNull(),
  startedAt: timestamp('started_at', {
    withTimezone: true,
  }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', {
    withTimezone: true,
  }),
  upstreamStatus: bigint('upstream_status', {
    mode: 'number',
  }),
  rowsReceived: bigint('rows_received', {
    mode: 'number',
  }),
  rowsInserted: bigint('rows_inserted', {
    mode: 'number',
  }),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
})

export const rateObservations = pgTable(
  'rate_observations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pollRunId: uuid('poll_run_id')
      .notNull()
      .references(() => pollRuns.id),

    currency: text('currency').notNull().default('USD'),
    provider: providerEnum('provider').notNull(),
    casa: casaEnum('casa').notNull(),
    name: text('name').notNull(),
    sourceFingerprint: text('source_fingerprint').notNull(),

    buy: numeric('buy', {
      precision: 14,
      scale: 4,
    }),

    sell: numeric('sell', {
      precision: 14,
      scale: 4,
    }),

    upstreamUpdatedAt: timestamp('upstream_updated_at', {
      withTimezone: true,
    }).notNull(),

    observedAt: timestamp('observed_at', {
      withTimezone: true,
    }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex('rate_observation_source_fingerprint_unique')
      .on(table.sourceFingerprint),

    index('rate_observation_casa_date_idx')
      .on(table.casa, table.observedAt),

    index('rate_observation_upstream_date_idx')
      .on(table.upstreamUpdatedAt),
  ],
)
```

The uniqueness rule is a canonical source fingerprint:

```text
sha256(JSON.stringify([provider, currency, casa, upstream_updated_at, buy, sell]))
```

This makes repeated polls and imports idempotent without collapsing every row for the same casa and instant. Exact Ámbito duplicates are ignored, while different prices on the same historical date remain separate immutable observations. Provider identity prevents DolarAPI and Ámbito records from colliding.

Drizzle supports PostgreSQL through drivers including `node-postgres` and `postgres.js`, with schema definitions and generated migrations stored separately. ([Drizzle ORM][5])

## Step 7: Configure Drizzle

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './packages/shared/src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
})
```

Generate and apply:

```bash
bun run db:generate
bun run db:migrate
```

Commit generated migrations.

Do not use `drizzle-kit push` as the production deployment strategy. Production should apply committed migrations deterministically.

---

# Phase 5 — Add database connections

## Step 8: Create the Nuxt database client

`apps/web/server/utils/db.ts`:

```ts
import { drizzle } from 'drizzle-orm/bun-sql'
import * as schema from '@dolar/shared/schema'

let instance: ReturnType<typeof drizzle<typeof schema>> | undefined

export function useDb() {
  if (!instance) {
    const config = useRuntimeConfig()

    instance = drizzle({
      connection: {
        url: config.databaseUrl,
      },
      schema,
    })
  }

  return instance
}
```

`apps/web/nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    ipHashSalt: process.env.IP_HASH_SALT,
    logDatabasePath:
      process.env.LOG_DATABASE_PATH ?? '/data/logs.db',

    public: {
      apiBase: '/api/v1',
    },
  },

  typescript: {
    strict: true,
  },
})
```

Use one module-level pool per process. Do not create a new database connection for each HTTP request.

## Step 9: Create the poller database client

`apps/poller/src/db.ts`:

```ts
import { drizzle } from 'drizzle-orm/bun-sql'
import * as schema from '@dolar/shared/schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

export const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL,
  },
  schema,
})
```

Bun’s SQL API supports PostgreSQL connection pooling, transactions, and parameterized tagged-template queries. ([Bun][6])

---

# Phase 6 — Implement the poller

## Step 10: Separate fetching from persistence

`apps/poller/src/fetch-rates.ts`:

```ts
import {
  dolarApiResponseSchema,
  type DolarApiRate,
} from '@dolar/shared/validators'

const REQUEST_TIMEOUT_MS = 10_000

export async function fetchRates(): Promise<DolarApiRate[]> {
  const url =
    process.env.DOLAR_API_URL ??
    'https://dolarapi.com/v1/dolares'

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'dolar-tracker/1.0',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Upstream returned HTTP ${response.status}`)
  }

  const payload: unknown = await response.json()

  return dolarApiResponseSchema.parse(payload)
}
```

## Step 11: Implement one atomic polling run

`apps/poller/src/poll.ts`:

```ts
import { eq, sql } from 'drizzle-orm'
import {
  createObservationFingerprint,
  pollRuns,
  rateObservations,
} from '@dolar/shared/schema'
import { db } from './db'
import { fetchRates } from './fetch-rates'

export async function pollRates() {
  const [run] = await db
    .insert(pollRuns)
    .values({
      status: 'running',
    })
    .returning({ id: pollRuns.id })

  try {
    const rates = await fetchRates()

    const inserted = await db.transaction(async tx => {
      return tx
        .insert(rateObservations)
        .values(
          rates.map(rate => ({
            pollRunId: run.id,
            provider: 'dolarapi',
            currency: rate.moneda,
            casa: rate.casa,
            name: rate.nombre,
            buy:
              rate.compra === null
                ? null
                : rate.compra.toString(),
            sell:
              rate.venta === null
                ? null
                : rate.venta.toString(),
            upstreamUpdatedAt: new Date(
              rate.fechaActualizacion,
            ),
            sourceFingerprint: createObservationFingerprint({
              provider: 'dolarapi',
              currency: rate.moneda,
              casa: rate.casa,
              upstreamUpdatedAt: rate.fechaActualizacion,
              buy: rate.compra,
              sell: rate.venta,
            }),
          })),
        )
        .onConflictDoNothing({
          target: rateObservations.sourceFingerprint,
        })
        .returning({ id: rateObservations.id })
    })

    await db
      .update(pollRuns)
      .set({
        status: 'success',
        completedAt: new Date(),
        rowsReceived: rates.length,
        rowsInserted: inserted.length,
      })
      .where(eq(pollRuns.id, run.id))

    return {
      runId: run.id,
      received: rates.length,
      inserted: inserted.length,
    }
  } catch (error) {
    await db
      .update(pollRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
        errorCode:
          error instanceof Error
            ? error.name
            : 'UNKNOWN_ERROR',
        errorMessage:
          error instanceof Error
            ? error.message.slice(0, 1_000)
            : 'Unknown polling error',
      })
      .where(eq(pollRuns.id, run.id))

    throw error
  }
}
```

Remove the unused `sql` import when implementing this directly.

## Step 12: Prevent overlapping poll runs

Use a PostgreSQL advisory lock or Redis lock.

A PostgreSQL advisory lock is enough here because PostgreSQL is already mandatory:

```ts
import { sql } from 'drizzle-orm'
import { db } from './db'
import { pollRates } from './poll'

const POLL_LOCK_ID = 927_401

const [lock] = await db.execute<{ acquired: boolean }>(sql`
  SELECT pg_try_advisory_lock(${POLL_LOCK_ID}) AS acquired
`)

if (!lock.acquired) {
  console.log('Poll already running; skipping')
  process.exit(0)
}

try {
  const result = await pollRates()
  console.log(JSON.stringify(result))
} finally {
  await db.execute(sql`
    SELECT pg_advisory_unlock(${POLL_LOCK_ID})
  `)
}
```

This protects against:

* Double-clicking the job.
* Overlapping cron executions.
* Multiple poller containers.

## Step 13: Add retries carefully

Retry only:

* Network failures.
* Timeouts.
* HTTP 429.
* HTTP 5xx.

Do not retry:

* Schema validation errors.
* HTTP 400/404.
* Database constraint mistakes.

Use a small bounded sequence:

```text
Attempt 1 → immediate
Attempt 2 → 2 seconds
Attempt 3 → 10 seconds
```

Do not make the scheduled job retry indefinitely.

---

# Phase 7 — Build the query/service layer

## Step 14: Keep SQL out of API handlers

```text
server/api     → HTTP concerns
server/services → business/query operations
server/repositories → database queries
```

Suggested structure:

```text
apps/web/server/
├── api/
│   └── v1/
│       ├── rates/
│       │   ├── index.get.ts
│       │   └── [casa]/
│       │       ├── latest.get.ts
│       │       ├── history.get.ts
│       │       └── summary.get.ts
│       ├── convert.get.ts
│       └── health.get.ts
├── repositories/
│   └── rates.repository.ts
├── services/
│   ├── rates.service.ts
│   └── conversion.service.ts
├── middleware/
├── plugins/
└── utils/
```

## Step 15: Implement latest-per-casa correctly

Avoid fetching all observations and deduplicating them in JavaScript.

Use PostgreSQL `DISTINCT ON`:

```sql
SELECT DISTINCT ON (casa)
  casa,
  name,
  buy,
  sell,
  upstream_updated_at,
  observed_at
FROM rate_observations
ORDER BY casa, upstream_updated_at DESC;
```

Repository:

```ts
import { sql } from 'drizzle-orm'
import type { Casa } from '@dolar/shared/domain'
import { useDb } from '../utils/db'

export interface LatestRateRow {
  casa: Casa
  name: string
  buy: string | null
  sell: string | null
  upstreamUpdatedAt: Date
  observedAt: Date
}

export async function findLatestRates() {
  const db = useDb()

  return db.execute<LatestRateRow>(sql`
    SELECT DISTINCT ON (casa)
      casa,
      name,
      buy,
      sell,
      upstream_updated_at AS "upstreamUpdatedAt",
      observed_at AS "observedAt"
    FROM rate_observations
    ORDER BY casa, upstream_updated_at DESC
  `)
}
```

## Step 16: Define API DTOs separately

Do not return raw Drizzle records.

```ts
export interface RateDto {
  currency: 'USD'
  casa: string
  name: string
  buy: number | null
  sell: number | null
  updatedAt: string
  observedAt: string
}
```

Mapper:

```ts
export function toRateDto(row: LatestRateRow): RateDto {
  return {
    currency: 'USD',
    casa: row.casa,
    name: row.name,
    buy: row.buy === null ? null : Number(row.buy),
    sell: row.sell === null ? null : Number(row.sell),
    updatedAt: row.upstreamUpdatedAt.toISOString(),
    observedAt: row.observedAt.toISOString(),
  }
}
```

The database can retain exact decimals while the public JSON remains convenient.

---

# Phase 8 — Define the API

## Step 17: Implement the first endpoints

### `GET /api/v1/rates`

Returns the latest observation for every casa.

```ts
export default defineEventHandler(async event => {
  const rates = await getLatestRates(event)

  return {
    data: rates,
    meta: {
      count: rates.length,
      generatedAt: new Date().toISOString(),
    },
  }
})
```

### `GET /api/v1/rates/:casa/latest`

Returns one latest rate.

### `GET /api/v1/rates/:casa/history`

Parameters:

```text
from=2026-01-01
to=2026-07-20
interval=raw|day|week|month
field=buy|sell|mid
```

Set sensible limits:

```text
raw: maximum 90 days
day: maximum 2 years
week: maximum 5 years
month: unrestricted
```

### `GET /api/v1/rates/:casa/summary`

Example response:

```json
{
  "data": {
    "casa": "blue",
    "latest": {
      "buy": 1505,
      "sell": 1525
    },
    "changes": {
      "day": 0.83,
      "week": 2.14,
      "month": -1.22
    },
    "spread": {
      "absolute": 20,
      "percentage": 1.32
    }
  }
}
```

### `GET /api/v1/convert`

Parameters:

```text
amount=100
from=USD
to=ARS
casa=blue
side=sell
at=latest
```

Rules:

* USD → ARS uses the selected rate directly.
* ARS → USD divides by the selected rate.
* Require explicit `side=buy|sell|mid`.
* Never silently pick buy or sell.
* Include the rate and timestamp used in the response.

### `GET /api/v1/health`

Return application liveness only:

```json
{
  "status": "ok"
}
```

Optionally add `/api/v1/ready` that verifies PostgreSQL and Redis.

## Step 18: Validate every query

Example:

```ts
import { z } from 'zod'
import { CASAS } from '@dolar/shared/domain'

const historyQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  interval: z
    .enum(['raw', 'day', 'week', 'month'])
    .default('day'),
  field: z
    .enum(['buy', 'sell', 'mid'])
    .default('sell'),
})

export default defineEventHandler(async event => {
  const casa = getRouterParam(event, 'casa')

  if (!CASAS.includes(casa as never)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Unknown rate type',
    })
  }

  const query = historyQuerySchema.parse(getQuery(event))

  if (query.from > query.to) {
    throw createError({
      statusCode: 400,
      statusMessage: '`from` must precede `to`',
    })
  }

  // Query service...
})
```

Create a global error formatter so Zod and domain errors produce one consistent shape:

```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "The query parameters are invalid",
    "details": []
  }
}
```

---

# Phase 9 — Build caching deliberately

## Step 19: Define cache policy per endpoint

| Endpoint                 |        TTL | Reason                       |
| ------------------------ | ---------: | ---------------------------- |
| Latest rates             |  5 minutes | Changes only after polling   |
| Single latest            |  5 minutes | Same                         |
| Current summary          | 10 minutes | Derived from latest/history  |
| Historical raw range     |     1 hour | Immutable after ingestion    |
| Daily/monthly aggregates |   24 hours | Historical data is immutable |
| Health                   |       None | Must reflect current process |

## Step 20: Use explicit cache keys

```text
rates:latest:v1
rates:latest:v1:blue
rates:history:v1:blue:2026-01-01:2026-07-01:day:sell
rates:summary:v1:blue
```

Include a schema/version marker in every key. Changing response shape then becomes:

```text
v1 → v2
```

instead of requiring a risky global cache flush.

## Step 21: Return cache metadata

During development, expose:

```http
X-Cache: HIT
X-Cache: MISS
```

Optionally keep it in production because it helps API consumers and supports your analytics.

Your wrapper should use explicit `null` checks:

```ts
if (cached !== null)
```

not:

```ts
if (cached)
```

because valid cached values can be falsy.

## Step 22: Invalidate only volatile keys

After a successful poll that inserted at least one row:

```text
delete rates:latest:v1
delete rates:latest:v1:{affected-casa}
delete rates:summary:v1:{affected-casa}
```

Do not flush all history keys. Previously cached ranges remain valid because old observations never change.

For the first version, TTL-only history caching is enough. Avoid building a complex cache-key registry prematurely.

---

# Phase 10 — Add request analytics

## Step 23: Create SQLite tables

Use two tables:

```sql
CREATE TABLE IF NOT EXISTS api_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  method TEXT NOT NULL,
  route TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  cache_source TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  user_agent_family TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS api_requests_created_idx
ON api_requests(created_at);

CREATE INDEX IF NOT EXISTS api_requests_route_created_idx
ON api_requests(route, created_at);
```

Do not store the raw URL because query parameters may contain sensitive or high-cardinality values.

Prefer:

```text
/api/v1/rates/:casa/history
```

over:

```text
/api/v1/rates/blue/history?from=...
```

## Step 24: Hash IP addresses with rotating periods

Instead of one permanent hash:

```text
hash(IP + permanent salt)
```

use:

```text
hash(IP + secret + YYYY-MM)
```

This lets you estimate monthly unique consumers without creating a persistent cross-year identifier.

```ts
function hashIp(ip: string, salt: string, now = new Date()) {
  const period = now.toISOString().slice(0, 7)

  return new Bun.CryptoHasher('sha256')
    .update(`${period}:${salt}:${ip}`)
    .digest('hex')
    .slice(0, 24)
}
```

Call this metric **estimated unique clients**, not unique users. NAT, VPNs, mobile networks, and multiple devices make IP-based user counting approximate.

## Step 25: Log after the response

Capture:

* Request ID.
* Normalized endpoint.
* Response status.
* Cache source.
* Duration.
* Hashed IP.
* Timestamp.

Never let logging failure break the API.

Be careful with “fire and forget”: unhandled promises can still fail noisily. Use an explicit catch and structured error log.

## Step 26: Roll up and expire raw analytics

Daily job:

1. Aggregate yesterday’s requests.
2. Store:

   * Requests by route.
   * Estimated unique clients.
   * Cache hit ratio.
   * Error rate.
   * p50/p95 duration.
3. Delete raw request logs older than 30 days.

Keep daily aggregates indefinitely.

---

# Phase 11 — Add rate limiting and HTTP correctness

## Step 27: Add Redis rate limiting

Start with:

```text
Public API:
120 requests/minute/IP hash

Dashboard internal requests:
300 requests/minute/IP hash

Health endpoint:
excluded
```

A fixed-window limiter is adequate for the MVP:

```text
rl:{period}:{ipHash}
```

Return:

```http
429 Too Many Requests
Retry-After: 27
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 0
```

## Step 28: Add response headers

For public GET endpoints:

```http
Cache-Control: public, max-age=60, stale-while-revalidate=300
ETag: "..."
Vary: Accept-Encoding
```

Redis caches server-side database work. HTTP cache headers reduce repeated traffic before it reaches the application. They solve different problems.

Do not rely solely on Nuxt `routeRules` for the public API cache because you want explicit cache hit/miss tracking. Nuxt does support route-level caching through `routeRules`, but a custom wrapper gives you the observability required by this project. ([Nuxt][1])

---

# Phase 12 — Build the dashboard

## Step 29: Create the initial pages

```text
app/pages/
├── index.vue
├── rates/
│   └── [casa].vue
├── compare.vue
├── converter.vue
├── api.vue
└── status.vue
```

### `/`

Show:

* Current rate cards.
* Last upstream update.
* Day/month change.
* Buy/sell spread.
* Data freshness warning.

### `/rates/[casa]`

Show:

* Historical line chart.
* Buy and sell series.
* Date range selector.
* Day/week/month aggregation.
* Absolute and percentage change.
* Min/max/average for the selected period.

### `/compare`

Allow 2–4 casas on the same normalized chart.

A useful normalized mode:

```text
first value in selected range = 100
```

This compares relative movement despite different absolute values.

### `/converter`

Fields:

* Amount.
* ARS/USD direction.
* Casa.
* Buy/sell/mid.
* Latest or historical date.

Always display:

```text
Using Blue sell rate: AR$1,525
Rate timestamp: July 14, 2026 10:56 ART
```

### `/api`

Document endpoints with request and response examples.

## Step 30: Keep dashboard data calls server-friendly

Use:

```ts
const { data, status, error, refresh } = await useFetch(
  '/api/v1/rates',
)
```

For an SSR page, this avoids a redundant client-side request during hydration.

Keep chart components client-only only when the chart library requires browser APIs. The page shell and data can still render server-side.

## Step 31: Add freshness states

Treat freshness as a first-class domain concept:

```text
Fresh:      last observation < 24 hours
Delayed:    24–48 hours
Stale:      > 48 hours
Unavailable: no observations
```

Weekends and holidays may require more nuanced behavior later, but explicit states are better than blindly showing “updated two days ago.”

---

# Phase 13 — Testing strategy

## Step 32: Unit tests

Test pure functions:

* Upstream payload validation.
* ARS/USD conversions.
* Mid-rate calculation.
* Percentage change.
* Date bucket calculation.
* Cache key construction.
* Freshness status.
* Monthly IP hash rotation.

Example:

```ts
import { describe, expect, test } from 'bun:test'
import { convertArsToUsd } from './conversion'

describe('convertArsToUsd', () => {
  test('divides pesos by the selected rate', () => {
    expect(
      convertArsToUsd({
        amount: 152_500,
        rate: 1_525,
      }),
    ).toBe(100)
  })

  test('rejects a zero rate', () => {
    expect(() =>
      convertArsToUsd({
        amount: 10_000,
        rate: 0,
      }),
    ).toThrow()
  })
})
```

## Step 33: Repository integration tests

Use a real temporary PostgreSQL database or dedicated test schema.

Test:

* Duplicate observations are ignored.
* Latest-per-casa returns the correct row.
* History ranges are inclusive/exclusive as documented.
* Aggregation uses the intended timezone.
* Polling failure does not leave partial rate rows.

## Step 34: API tests

Test:

* Valid responses.
* Invalid casas.
* Invalid date ranges.
* Excessively large raw ranges.
* Redis hit and miss behavior.
* Rate-limit responses.
* Cache headers.
* SQLite logging failure does not affect responses.

## Step 35: Poller contract fixture

Store a sanitized upstream response:

```text
apps/poller/test/fixtures/dolar-api.json
```

This gives you stable validation and ingestion tests without depending on the live service.

---

# Phase 14 — Containerization

## Step 36: Nuxt Dockerfile

`apps/web/Dockerfile`:

```dockerfile
FROM oven/bun:1 AS dependencies

WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN bun install --frozen-lockfile


FROM dependencies AS build

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN bun --cwd apps/web build


FROM oven/bun:1-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

COPY --from=build /repo/apps/web/.output .output

RUN mkdir -p /data

EXPOSE 3000

CMD ["bun", ".output/server/index.mjs"]
```

Build context must be the repository root because the application imports `packages/shared`.

## Step 37: Poller Dockerfile

`apps/poller/Dockerfile`:

```dockerfile
FROM oven/bun:1-slim

WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/poller/package.json apps/poller/
COPY packages/shared/package.json packages/shared/

RUN bun install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/poller apps/poller

CMD ["sleep", "infinity"]
```

The persistent poller container exists because Dokploy application jobs execute commands inside an application container. ([Dokploy][3])

The scheduled command becomes:

```bash
bun --cwd apps/poller poll
```

---

# Phase 15 — Dokploy deployment

## Step 38: Create one Dokploy project

```text
Project: dolar-tracker

Services:
├── web
├── poller
├── postgres
└── redis
```

This matches the previously established service organization. 

## Step 39: Configure the web service

```text
Git repository: same monorepo
Build context: /
Dockerfile: /apps/web/Dockerfile
Port: 3000
Replica count: 1
```

Environment:

```dotenv
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
IP_HASH_SALT=...
LOG_DATABASE_PATH=/data/logs.db
```

Persistent volume:

```text
Host/Dokploy volume → /data
```

Expose only this service publicly.

## Step 40: Configure the poller

```text
Build context: /
Dockerfile: /apps/poller/Dockerfile
No public domain
```

Environment:

```dotenv
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
DOLAR_API_URL=https://dolarapi.com/v1/dolares
```

Scheduled jobs:

```cron
30 10 * * *
30 16 * * *
```

Confirm whether Dokploy interprets the cron in server time or a configured timezone. Prefer setting the server/container timezone explicitly or translating the schedule to UTC rather than assuming Buenos Aires time.

Command:

```bash
bun --cwd apps/poller poll
```

## Step 41: Run migrations as a deployment job

Do not have every web startup race to run migrations.

Use an explicit command before releasing a schema-changing build:

```bash
bun run db:migrate
```

Recommended deployment order:

```text
1. Back up PostgreSQL
2. Deploy backward-compatible migration
3. Deploy poller
4. Deploy Nuxt application
5. Verify health/readiness
6. Remove obsolete schema in a later release
```

---

# Phase 16 — Production safeguards

## Step 42: Add structured logs

Every process log should be JSON-shaped:

```json
{
  "level": "info",
  "event": "poll.completed",
  "runId": "...",
  "received": 7,
  "inserted": 3,
  "durationMs": 482
}
```

For API errors:

```json
{
  "level": "error",
  "event": "api.failed",
  "requestId": "...",
  "route": "/api/v1/rates/:casa/history",
  "statusCode": 500,
  "errorCode": "DATABASE_QUERY_FAILED"
}
```

Never log:

* Raw IP addresses.
* Secrets.
* Database URLs.
* Full arbitrary query strings.
* Stack traces to public responses.

## Step 43: Add operational checks

Dashboard/status indicators:

* Last successful poll.
* Last failed poll.
* Rows inserted by last poll.
* Current oldest/latest observations.
* PostgreSQL readiness.
* Redis readiness.
* SQLite writable status.

Alert conditions:

```text
No successful poll for 36 hours
Three consecutive failed polls
Expected casas missing
Latest rates older than 48 hours
PostgreSQL unavailable
Disk volume nearly full
```

## Step 44: Backups

Back up:

* PostgreSQL: mandatory.
* SQLite analytics: optional but useful.
* Redis: not mandatory for correctness.

PostgreSQL is the irreplaceable historical dataset. Redis must remain disposable.

---

# Recommended implementation order

## Milestone 1 — Vertical slice

Build only:

```text
DolarAPI
  → poller
  → PostgreSQL
  → GET /api/v1/rates
  → dashboard current-rate cards
```

Exit criteria:

* Poller inserts all casas.
* Duplicate poll inserts zero duplicate rows.
* API returns latest rate per casa.
* Homepage renders those values through SSR.
* Errors are validated and structured.

## Milestone 2 — Historical API

Build:

```text
GET /rates/:casa/history
GET /rates/:casa/summary
```

Exit criteria:

* Date ranges validated.
* Daily/monthly aggregation works.
* Historical page renders a chart.
* Change percentages have tested definitions.

## Milestone 3 — Redis

Build:

* Cache wrapper.
* Explicit cache keys.
* Poller invalidation.
* Cache headers.
* Source tracking.

Exit criteria:

* Repeated API call produces a cache hit.
* New poll invalidates latest data.
* Redis failure falls back safely to PostgreSQL.

## Milestone 4 — Analytics and limits

Build:

* SQLite request logging.
* IP rotation hash.
* Rate limiting.
* Daily rollups.
* Internal usage dashboard.

Exit criteria:

* API responses are never blocked by logging.
* Cache hit ratio is measurable.
* “Unique users” is labeled as estimated unique clients.
* Raw analytics expire.

## Milestone 5 — Converter and comparison UI

Build:

* Converter endpoint.
* Converter page.
* Multi-casa comparison.
* Historical date conversion.

## Milestone 6 — Production deployment

Build:

* Dockerfiles.
* Dokploy services.
* Persistent volumes.
* Scheduled jobs.
* Database backups.
* Health/readiness routes.
* Failure alerts.

---

# Initial API contract

```text
GET /api/v1/rates
GET /api/v1/rates/:casa/latest
GET /api/v1/rates/:casa/history
GET /api/v1/rates/:casa/summary
GET /api/v1/convert
GET /api/v1/health
GET /api/v1/ready
```

Avoid creating write endpoints initially. The public API is read-only, and ingestion remains an internal scheduled operation.

---

# What I would deliberately postpone

Do not add these during the first implementation:

* Authentication.
* User accounts.
* API keys.
* Multiple Nuxt replicas.
* WebSockets.
* A message queue.
* TimescaleDB.
* Precomputed materialized views.
* GraphQL.
* Admin CRUD for casas.
* A separate API application.
* Complex cache-tag registries.

The first production-worthy version only needs:

```text
Nuxt + PostgreSQL + Redis + poller + SQLite analytics
```

The best first coding target is the **Milestone 1 vertical slice**. It proves the core data flow before caching, charts, analytics, and deployment complexity are introduced.

[1]: https://nuxt.com/docs/4.x/getting-started/server?utm_source=chatgpt.com "Server · Get Started with Nuxt v4"
[2]: https://bun.sh/docs/runtime/sqlite?utm_source=chatgpt.com "SQLite - Bun"
[3]: https://docs.dokploy.com/docs/core/schedule-jobs?utm_source=chatgpt.com "Schedule Jobs | Dokploy"
[4]: https://nuxt.com/docs/4.x/getting-started/routing/?utm_source=chatgpt.com "Routing · Get Started with Nuxt v4"
[5]: https://orm.drizzle.team/docs/get-started/postgresql-new?utm_source=chatgpt.com "Drizzle ORM - PostgreSQL"
[6]: https://bun.sh/docs/runtime/sql?utm_source=chatgpt.com "SQL - Bun"
