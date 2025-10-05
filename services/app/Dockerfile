FROM node:22-alpine AS base

# Install pnpm in base image
RUN corepack enable pnpm

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# copy pnpm specific files
COPY package.json /app/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml
COPY pnpm-workspace.yaml /app/pnpm-workspace.yaml

# copy project related files
COPY packages/icons /app/packages/icons
COPY packages/tailwind-config /app/packages/tailwind-config
COPY packages/tsconfig /app/packages/tsconfig
COPY packages/page-models /app/packages/page-models
COPY packages/email-editor /app/packages/email-editor
COPY packages/common-models /app/packages/common-models
COPY packages/common-logic /app/packages/common-logic
COPY packages/page-primitives /app/packages/page-primitives
COPY packages/page-blocks /app/packages/page-blocks
COPY packages/components-library /app/packages/components-library
COPY packages/text-editor /app/packages/text-editor
COPY packages/utils /app/packages/utils
COPY apps/web /app/apps/web

# Install dependencies based on the preferred package manager
RUN pnpm install

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/ ./

# Build all workspaces
RUN pnpm run build

# Production image
FROM node:24-bullseye-slim AS runner
WORKDIR /app

# Install minimal Chrome dependencies for headless PDF generation
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
      --no-install-recommends \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /opt/google/chrome/chrome-sandbox \
    && rm -rf /opt/google/chrome/chrome-wrapper \
    && rm -rf /opt/google/chrome/chrome-sandbox-wrapper

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

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

ENV PORT=${PORT:-3000}

CMD ["node", "apps/web/server.js"]