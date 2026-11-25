# Install and build run on the build machine's own platform ($BUILDPLATFORM):
# the output is JavaScript, and emulating arm64 on an x86 builder (or the
# reverse) is several times slower. Production dependencies, which may carry
# native binaries, are installed for the target platform (prod-deps), and the
# runner is the target platform.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.4-alpine AS base
WORKDIR /app

FROM oven/bun:1.4.4-alpine AS target-base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/api/package.json ./apps/api/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
COPY packages/lesson-content/package.json ./packages/lesson-content/package.json
RUN bun install --filter @courselit/api --filter @courselit/api-contract --filter @courselit/lesson-content --frozen-lockfile

FROM deps AS builder
COPY apps/api ./apps/api
COPY packages/api-contract ./packages/api-contract
COPY packages/lesson-content ./packages/lesson-content
RUN bun --bun run --filter @courselit/api build

FROM target-base AS prod-deps
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/api/package.json ./apps/api/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
COPY packages/lesson-content/package.json ./packages/lesson-content/package.json
RUN bun install --production --filter @courselit/api --filter @courselit/api-contract --filter @courselit/lesson-content --frozen-lockfile

FROM target-base AS runner
ENV NODE_ENV=production
ENV PORT=4000

RUN addgroup -S -g 1001 courselit \
    && adduser -S -u 1001 -G courselit courselit

COPY --from=prod-deps /app/package.json ./package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /app/packages/api-contract/package.json ./packages/api-contract/package.json
COPY --from=prod-deps /app/packages/api-contract/node_modules ./packages/api-contract/node_modules
COPY --from=prod-deps /app/packages/lesson-content/package.json ./packages/lesson-content/package.json
COPY --from=prod-deps /app/packages/lesson-content/node_modules ./packages/lesson-content/node_modules
COPY --from=builder --chown=courselit:courselit /app/apps/api/src ./apps/api/src
COPY --from=builder --chown=courselit:courselit /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder --chown=courselit:courselit /app/apps/api/scripts/migrate.mjs ./apps/api/scripts/migrate.mjs
COPY --from=builder --chown=courselit:courselit /app/packages/api-contract/src ./packages/api-contract/src
COPY --from=builder --chown=courselit:courselit /app/packages/lesson-content/src ./packages/lesson-content/src

# Verify production workspace links and migration imports in the final image.
RUN cd apps/api && bun -e 'try { await import("./scripts/migrate.mjs"); } catch (error) { if (error.message !== "DATABASE_URL_REQUIRED") throw error; }'

USER courselit
EXPOSE 4000
CMD ["bun", "apps/api/src/main.ts"]
