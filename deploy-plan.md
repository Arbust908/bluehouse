# Deployment Plan — Poller Docker Image

## Context

The project is a Bun monorepo with:

- `apps/poller/` — scheduled DolarAPI ingestion worker
- `packages/shared/` — schemas, validators, domain types
- `drizzle/` — committed PostgreSQL migrations
- `scripts/migrate.ts` — runtime migration runner

There is no web/API service yet. The poller needs a Docker image so Dokploy can deploy it and run scheduled jobs (`bun run poll`) via `docker exec`. Dokploy requires a running container for scheduled jobs — the container itself does not auto-poll on startup; it idles with `sleep infinity`.

## What we're building

1. **`apps/poller/Dockerfile`**

   Multi-stage build using `oven/bun`:

   ```dockerfile
   # Stage 1: install dependencies
   FROM oven/bun:1 AS deps
   WORKDIR /repo
   COPY package.json bun.lock ./
   COPY apps/poller/package.json apps/poller/
   COPY packages/shared/package.json packages/shared/
   RUN bun install --frozen-lockfile --production
   ```

   ```dockerfile
   # Stage 2: runtime
   FROM oven/bun:1-slim
   WORKDIR /repo
   COPY --from=deps /repo/node_modules node_modules
   COPY package.json bun.lock ./
   COPY apps/poller apps/poller
   COPY packages/shared packages/shared
   COPY scripts scripts
   COPY drizzle drizzle
   COPY tsconfig.json ./
   CMD ["sleep", "infinity"]
   ```

   **Why two stages?** The first stage installs only production deps. The slim runtime image is smaller. We copy `node_modules` from the deps stage rather than re-installing.

   **Why `--production`?** We don't need `drizzle-kit` or `typescript` at runtime — those are devDependencies used during build/development only.

   **Why `sleep infinity`?** Dokploy scheduled jobs execute commands inside running containers. The container must stay alive. It should NOT auto-poll on startup — that's the scheduler's job.

2. **`.dockerignore`**

   Prevents secrets and local files from entering the Docker build context:

   ```
   .env
   .env.*
   !.env.example
   docker-compose*.yml
   *.md
   .git
   .gitignore
   node_modules
   dist
   out
   *.tgz
   .DS_Store
   Screenshot*.png
   .idea
   coverage
   ```

   **Why the negation `!.env.example`?** We want `.env.example` committed and available, but all other `.env*` files (`.env`, `.env.local`, etc.) excluded.

3. **Verify before building**

   Run these before the Docker build — they must pass:

   ```bash
   bun test            # all tests pass
   bun run typecheck   # tsc --noEmit succeeds
   ```

4. **Build and test the image locally**

   ```bash
   # Build from repo root (build context must be root because poller imports packages/shared)
   docker build -f apps/poller/Dockerfile -t bluehouse-poller:local .

   # Test migration
   docker run --rm --env-file .env.local bluehouse-poller:local bun run db:migrate

   # Test poll
   docker run --rm --env-file .env.local bluehouse-poller:local bun run poll
   ```

5. **Commit and push**

   ```bash
   git add apps/poller/Dockerfile .dockerignore
   git commit -m "Add poller Dockerfile and .dockerignore"
   git push origin main
   ```

## Files to create/modify

| File | Action |
|------|--------|
| `apps/poller/Dockerfile` | Create — multi-stage Bun image |
| `.dockerignore` | Create — exclude secrets, local files |

No existing files need modification.

## Verification

1. `bun test` passes (existing test suite)
2. `bun run typecheck` passes (`tsc --noEmit`, zero errors)
3. `docker build -f apps/poller/Dockerfile -t bluehouse-poller:local .` succeeds
4. `docker run --rm --env-file .env.local bluehouse-poller:local bun run db:migrate` connects to local Postgres and runs migrations
5. `docker run --rm --env-file .env.local bluehouse-poller:local bun run poll` fetches rates, inserts into local DB
6. `docker run --rm bluehouse-poller:local sleep 1` confirms the image doesn't auto-poll
7. No `.env` files appear in `docker history bluehouse-poller:local`

## Teaching notes (what to explain as we build)

- **Build context**: Must be repo root because `packages/shared` is imported as a workspace dependency
- **`.dockerignore` matters**: Without it, a local `.env` with real credentials gets baked into the image layer — visible in `docker history`
- **`--frozen-lockfile`**: Ensures the Docker build uses the exact same dependency versions as development — reproducible builds
- **Why COPY order matters**: Docker caches layers. Copying `package.json` and `bun.lock` first means `bun install` only re-runs when deps change, not when source code changes
- **`sleep infinity` pattern**: This is a Dokploy-specific requirement. A normal worker would run its main loop. But Dokploy cron jobs need a running container to `docker exec` into
- **Runtime vs dev deps**: `drizzle-kit` is only needed to generate migrations (dev). `scripts/migrate.ts` uses drizzle-orm's runtime migrator — no `drizzle-kit` needed in the image
- **Multi-stage builds**: The build stage installs deps, the runtime stage is slim — smaller final image, fewer attack surfaces