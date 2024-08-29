FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# copy yarn specific files
COPY package.json /app/package.json
COPY .yarn /app/.yarn
COPY yarn.lock /app/yarn.lock
COPY .yarnrc.yml /app/.yarnrc.yml

# copy project related files
COPY packages/icons /app/packages/icons
COPY packages/tailwind-config /app/packages/tailwind-config
COPY packages/tsconfig /app/packages/tsconfig
COPY packages/common-models /app/packages/common-models
COPY packages/common-widgets /app/packages/common-widgets
COPY packages/components-library /app/packages/components-library
COPY packages/state-management /app/packages/state-management
COPY packages/text-editor /app/packages/text-editor
COPY packages/utils /app/packages/utils
COPY apps/web /app/apps/web

# Install dependencies based on the preferred package manager
RUN corepack enable yarn
RUN yarn install;

FROM base as builder
WORKDIR /app

COPY --from=deps /app/ ./

# Build all workspaces
RUN yarn run build

# Production image
FROM base as runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.js ./apps/web
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.js ./

USER nextjs

ENV PORT ${PORT:-3000}

CMD HOSTNAME="0.0.0.0" node apps/web/server.js