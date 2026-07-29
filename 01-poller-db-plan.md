# Poller Database Plan

## Goal

Build and deploy only this first vertical slice:

```text
DolarAPI
  -> Bun poller
  -> validation
  -> PostgreSQL
```

Redis, Nuxt, caching, and the dashboard remain out of scope until this works reliably.

## 1. Secure PostgreSQL

The database password is visible in one of the screenshots. Before committing or deploying anything:

1. Rotate the PostgreSQL password in Dokploy.
2. Do not commit the screenshots.
3. Keep PostgreSQL private. The poller should use Dokploy's internal connection URL.
4. Create `.gitignore` entries for `.env`, screenshots, logs, and dependencies.
5. Store the new URL only in local `.env` and Dokploy environment variables.

Use:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD:PORT/DATABASE
DOLAR_API_URL=https://dolarapi.com/v1/dolares
```

Copy Dokploy's internal URL rather than constructing it manually.

## 2. Bootstrap the Workspace

Use the current `bluehouse-project` directory as the repository root.

Target structure:

```text
bluehouse-project/
├── apps/
│   └── poller/
│       ├── src/
│       │   ├── db.ts
│       │   ├── fetch-rates.ts
│       │   ├── index.ts
│       │   └── poll.ts
│       ├── test/
│       │   └── fixtures/
│       │       └── dolar-api.json
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── domain.ts
│       │   ├── schema.ts
│       │   └── validators.ts
│       └── package.json
├── drizzle/
│   └── migrate.ts
├── .env.example
├── .gitignore
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── bun.lock
```

Initialize it:

```bash
git init
bun init -y
mkdir -p apps/poller/src
mkdir -p apps/poller/test/fixtures
mkdir -p packages/shared/src
mkdir -p scripts
mkdir -p drizzle
```

## 3. Configure Packages

The root package should be named `bluehouse`, be private, and declare workspaces:

```json
{
  "name": "bluehouse",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "poll": "bun --cwd apps/poller poll",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "bun drizzle/migrate.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  }
}
```

Dependencies:

```bash
bun add -d drizzle-kit typescript @types/bun
bun add drizzle-orm zod
```

`apps/poller/package.json`:

```json
{
  "name": "@bluehouse/poller",
  "private": true,
  "type": "module",
  "scripts": {
    "poll": "bun src/index.ts"
  },
  "dependencies": {
    "@bluehouse/shared": "workspace:*",
    "drizzle-orm": "workspace:^",
    "zod": "workspace:^"
  }
}
```

`packages/shared/package.json`:

```json
{
  "name": "@bluehouse/shared",
  "private": true,
  "type": "module",
  "exports": {
    "./domain": "./src/domain.ts",
    "./schema": "./src/schema.ts",
    "./validators": "./src/validators.ts"
  }
}
```

Run:

```bash
bun install
```

**Checkpoint:** `bun install --frozen-lockfile` must succeed.

## 4. Define the Domain and Validation

Create `packages/shared/src/domain.ts` with the seven supported rate types:

- `oficial`
- `blue`
- `bolsa`
- `contadoconliqui`
- `mayorista`
- `cripto`
- `tarjeta`

Create `packages/shared/src/validators.ts` using Zod.

The upstream contract must require:

- `moneda`: exactly `"USD"`
- `casa`: one of the seven supported values
- `nombre`: non-empty string
- `compra`: finite non-negative number or `null`
- `venta`: finite non-negative number or `null`
- `fechaActualizacion`: ISO datetime

Validate the entire array before opening a database transaction.

Add the live response as a sanitized fixture:

```text
apps/poller/test/fixtures/dolar-api.json
```

**Checkpoint:**

- The fixture passes validation.
- Missing fields fail validation.
- Unknown `casa` values fail validation.
- Negative and non-finite rates fail validation.

## 5. Define PostgreSQL Tables

Create `packages/shared/src/schema.ts` with:

### `poll_runs`

- `id`
- `status`: `running | success | failed`
- `started_at`
- `completed_at`
- `rows_received`
- `rows_inserted`
- `error_code`
- `error_message`

### `rate_observations`

- `id`
- `poll_run_id`
- `currency`
- `casa`
- `name`
- `buy numeric(14,4)`
- `sell numeric(14,4)`
- `upstream_updated_at`
- `observed_at`

Add:

```sql
UNIQUE(casa, upstream_updated_at)
INDEX(casa, observed_at)
INDEX(upstream_updated_at)
```

The unique constraint makes repeated polling idempotent.

## 6. Generate and Test the Migration

Configure `drizzle.config.ts` to read the shared schema and write committed migrations under `drizzle/`.

Generate:

```bash
bun run db:generate
```

Review the generated SQL before applying it.

Do not initially test migrations against production. Start a disposable local PostgreSQL database:

```bash
docker run --name bluehouse-postgres \
  -e POSTGRES_USER=bluehouse \
  -e POSTGRES_PASSWORD=bluehouse \
  -e POSTGRES_DB=bluehouse \
  -p 5432:5432 \
  -d postgres:18-alpine
```

Set local `.env`:

```dotenv
DATABASE_URL=postgresql://bluehouse:bluehouse@localhost:5432/bluehouse
DOLAR_API_URL=https://dolarapi.com/v1/dolares
```

Apply:

```bash
bun run db:migrate
```

**Checkpoint:**

- Both tables exist.
- The migration is recorded by Drizzle.
- Running `bun run db:migrate` again makes no changes.

The migration runner should use Drizzle's runtime migrator. This allows the production image to run migrations without shipping `drizzle-kit`.

## 7. Implement Fetching

Create `apps/poller/src/fetch-rates.ts`.

Requirements:

1. Read `DOLAR_API_URL`, with the official endpoint as its default.
2. Set an explicit `Accept: application/json` header.
3. Use a 10-second timeout.
4. Reject non-success HTTP responses.
5. Parse the body as `unknown`.
6. Validate it through the shared Zod schema.
7. Return validated records only.

Initially avoid retries. First prove one deterministic attempt works. Bounded retries can be added afterward for timeouts, HTTP 429, and HTTP 5xx only.

**Checkpoint:** `bun --cwd apps/poller test` must validate the fixture without calling the live API.

## 8. Implement Persistence

Create `apps/poller/src/db.ts` with one database client per process.

Create `apps/poller/src/poll.ts` with this sequence:

1. Insert a `poll_runs` row with `running`.
2. Fetch and validate the complete response.
3. Open a transaction.
4. Insert all observations.
5. Use `ON CONFLICT DO NOTHING` against `(casa, upstream_updated_at)`.
6. Commit the transaction.
7. Update the poll run to `success`.
8. Record rows received and rows inserted.
9. On failure, update the run to `failed`.
10. Re-throw failures so Dokploy sees a non-zero exit status.

Rates must be converted to decimal strings before insertion. Do not persist JavaScript floating-point calculations.

**Checkpoint:**

```bash
bun run poll
bun run poll
```

Expected first run:

```text
received: 7
inserted: 7
```

Expected immediate second run:

```text
received: 7
inserted: 0
```

## 9. Prevent Overlapping Runs

Use a PostgreSQL advisory lock in `apps/poller/src/index.ts`.

> [!IMPORTANT]
> Reserve one PostgreSQL connection and use that same connection to:
>
> 1. Acquire `pg_try_advisory_lock`.
> 2. Run the poll.
> 3. Release `pg_advisory_unlock`.

Do not acquire and release a session lock through separate pooled `db.execute()` calls. The pool could assign different PostgreSQL sessions.

Behavior:

- Lock acquired: execute poll.
- Lock unavailable: log `skipped` and exit 0.
- Poll failed: log failure and exit non-zero.
- Always: release reserved connection.

Use JSON logs:

```json
{
  "level": "info",
  "event": "poll.completed",
  "runId": "...",
  "received": 7,
  "inserted": 7,
  "durationMs": 420
}
```

Never log `DATABASE_URL`, passwords, or full upstream payloads.

## 10. Add Integration Tests

Use the disposable local PostgreSQL database.

Required tests:

1. Valid payload inserts seven observations.
2. Repeated payload inserts zero duplicates.
3. A malformed payload inserts no observations.
4. A failed run is recorded in `poll_runs`.
5. A database insertion failure leaves no partial observations.
6. Two concurrent poll attempts cannot both acquire the lock.
7. Numeric values retain four-decimal precision.

Verification:

```bash
bun test
bun run typecheck
```

Both must pass before containerization.

## 11. Build the Poller Image

The Dockerfile must use the repository root as build context because the poller imports `packages/shared`.

The image must contain:

- `apps/poller`
- `packages/shared`
- `drizzle`
- `scripts/migrate.ts`
- Production dependencies
- `bun.lock`

The container must remain running because Dokploy scheduled application jobs execute commands through `docker exec`.

Use an idle Bun process or `sleep infinity` as the container command. It should not automatically poll on startup.

Build locally:

```bash
docker build \
  -f apps/poller/Dockerfile \
  -t bluehouse-poller:local \
  .
```

Test migration from the image:

```bash
docker run --rm \
  --env-file .env \
  bluehouse-poller:local \
  bun run db:migrate
```

Test polling:

```bash
docker run --rm \
  --env-file .env \
  bluehouse-poller:local \
  bun run poll
```

**Checkpoint:**

- Image builds from a clean checkout.
- Migration command works.
- Poll command exits successfully.
- A duplicate run inserts zero rows.
- No secrets are stored in image layers.

## 12. Push the Repository

Before committing:

```bash
git status
git diff
git check-ignore .env
git check-ignore "Screenshot 2026-07-22 at 10.33.26 AM.png"
```

Confirm screenshots and `.env` are excluded.

Commit these artifacts:

- Source code
- Tests and fixture
- Dockerfile
- Generated migration
- `.env.example`
- `bun.lock`
- Configuration files

Do not commit:

- `.env`
- Database credentials
- Screenshots containing credentials
- Test database files

Push the repository to the Git provider connected to Dokploy.

## 13. Create the Dokploy Poller

Create an Application named `bluehouse-poller`.

Configure:

| Setting | Value |
| --- | --- |
| Repository | `bluehouse` repository |
| Branch | `main` |
| Build context | `/` |
| Dockerfile | `/apps/poller/Dockerfile` |
| Public domain | None |
| Replicas | `1` |

Environment:

```dotenv
DATABASE_URL=<Dokploy internal PostgreSQL URL>
DOLAR_API_URL=https://dolarapi.com/v1/dolares
```

Deploy and confirm the container remains running.

## 14. Apply Production Migrations

Before polling production:

1. Verify PostgreSQL backups are configured.
2. Open the poller application terminal or create a temporary manual job.
3. Run `bun run db:migrate`.
4. Run it a second time to verify idempotency.
5. Inspect PostgreSQL and confirm both tables exist.

Do not use `drizzle-kit push` in production.

## 15. Run the First Production Poll

From the poller terminal or a manually triggered Dokploy job:

```bash
bun run poll
```

Verify:

```sql
SELECT status, rows_received, rows_inserted, started_at, completed_at
FROM poll_runs
ORDER BY started_at DESC
LIMIT 5;
```

Verify observations:

```sql
SELECT casa, buy, sell, upstream_updated_at, observed_at
FROM rate_observations
ORDER BY casa;
```

Run the poll again and confirm:

```text
rows_received = 7
rows_inserted = 0
status = success
```

## 16. Schedule the Poller

Dokploy application jobs require the target container to be running.

Create two scheduled jobs with the command:

```bash
bun run poll
```

Desired Buenos Aires times:

- `10:30 America/Argentina/Buenos_Aires`
- `16:30 America/Argentina/Buenos_Aires`

First determine the Dokploy server scheduler timezone. If it is UTC, use:

```cron
30 13 * * *
30 19 * * *
```

Name the jobs:

- `bluehouse-poll-morning`
- `bluehouse-poll-afternoon`

After the first scheduled execution, verify:

- Dokploy records exit status 0.
- JSON output appears in job logs.
- A successful `poll_runs` record exists.
- No duplicate observations were inserted unnecessarily.

## Completion Criteria

The poller milestone is complete when:

- Seven DolarAPI `casa` values are validated.
- The first run inserts seven observations.
- Duplicate runs insert zero observations.
- Polling failures leave no partial rate rows.
- Concurrent executions cannot overlap.
- Migrations are committed and repeatable.
- The Dokploy container remains private and running.
- Two scheduled jobs execute successfully.
- PostgreSQL has a confirmed backup policy.

Only then proceed to the next slice: Nuxt `GET /api/v1/rates` reading the latest observation per `casa`.
