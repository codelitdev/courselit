FROM oven/bun:1.4.1-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
COPY packages/components-library/package.json ./packages/components-library/package.json
COPY packages/page-blocks/package.json ./packages/page-blocks/package.json
RUN bun install --filter '@courselit/admin...' --frozen-lockfile

FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/admin ./apps/admin
COPY packages/api-contract ./packages/api-contract
COPY packages/components-library ./packages/components-library
COPY packages/page-blocks ./packages/page-blocks
RUN bun --bun run --filter @courselit/admin build

FROM oven/bun:1.4.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup -S -g 1001 bunjs \
    && adduser -S -u 1001 -G bunjs bunuser

COPY --from=builder --chown=bunuser:bunjs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=bunuser:bunjs /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder --chown=bunuser:bunjs /app/apps/admin/public ./apps/admin/public

USER bunuser
EXPOSE 3000
CMD ["bun", "apps/admin/server.js"]
