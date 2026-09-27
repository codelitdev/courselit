FROM oven/bun:1.4.1-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/api/package.json ./apps/api/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
RUN bun install --filter @courselit/api --filter @courselit/api-contract --frozen-lockfile

FROM deps AS builder
COPY apps/api ./apps/api
COPY packages/api-contract ./packages/api-contract
RUN bun --bun run --filter @courselit/api build

FROM base AS prod-deps
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/api/package.json ./apps/api/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
RUN bun install --production --filter @courselit/api --filter @courselit/api-contract --frozen-lockfile

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -S -g 1001 courselit \
    && adduser -S -u 1001 -G courselit courselit

COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=prod-deps /app/packages/api-contract/package.json ./packages/api-contract/package.json
COPY --from=builder --chown=courselit:courselit /app/apps/api/src ./apps/api/src
COPY --from=builder --chown=courselit:courselit /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder --chown=courselit:courselit /app/apps/api/scripts/migrate.mjs ./apps/api/scripts/migrate.mjs
COPY --from=builder --chown=courselit:courselit /app/packages/api-contract/src ./packages/api-contract/src

USER courselit
EXPOSE 4000
CMD ["bun", "apps/api/src/main.ts"]
