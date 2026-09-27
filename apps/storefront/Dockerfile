FROM oven/bun:1.4.1-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/storefront/package.json ./apps/storefront/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
COPY packages/page-blocks/package.json ./packages/page-blocks/package.json
RUN bun install --filter '@courselit/storefront...' --frozen-lockfile

FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/storefront ./apps/storefront
COPY packages/api-contract ./packages/api-contract
COPY packages/page-blocks ./packages/page-blocks
RUN bun --bun run --filter @courselit/storefront build

FROM oven/bun:1.4.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3001

RUN addgroup -S -g 1001 bunjs \
    && adduser -S -u 1001 -G bunjs bunuser

COPY --from=builder --chown=bunuser:bunjs /app/apps/storefront/.next/standalone ./
COPY --from=builder --chown=bunuser:bunjs /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder --chown=bunuser:bunjs /app/apps/storefront/public ./apps/storefront/public

USER bunuser
EXPOSE 3001
CMD ["bun", "apps/storefront/server.js"]
