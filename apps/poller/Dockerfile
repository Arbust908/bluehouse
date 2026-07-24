# Stage 1: install deps
FROM oven/bun:1 AS deps
WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/poller/package.json apps/poller
COPY packages/shared/package.json packages/shared
RUN bun install

# Stage 2: runtime
FROM oven/bun:1-slim
WORKDIR /repo
COPY --from=deps /repo/node_modules node_modules
COPY package.json bun.lock ./
COPY apps/poller apps/poller
COPY packages/shared packages/shared
COPY drizzle drizzle
COPY tsconfig.json ./
CMD ["sleep", "infinity"]
