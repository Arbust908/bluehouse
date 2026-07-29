# Stage 1: install deps
FROM oven/bun:1 AS builder
WORKDIR /repo
COPY package.json bun.lock ./
COPY apps/web-dash/package.json apps/web-dash/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

# Step 2: copy
COPY apps/web-dash ./apps/web-dash
COPY packages/shared ./packages/shared

ENV NITRO_PRESET=bun
RUN bun --cwd apps/web-dash run build

# Stage 3: runtime
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
COPY --from=builder --chown=bun:bun \
  /repo/apps/web-dash/.output ./.output
USER bun
EXPOSE 3000
CMD ["bun", "run", "./server/index.mjs"]