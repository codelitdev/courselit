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

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN cd /app && echo 'Yarn version in builder' && yarn --version

# Build all workspaces
RUN yarn run build

# Production image
FROM base as runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# copy yarn specific files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml

# copy project related files
COPY --from=builder /app/packages/icons/package.json ./packages/icons/package.json
COPY --from=builder /app/packages/icons/dist ./packages/icons/dist
COPY --from=builder /app/packages/common-models/package.json ./packages/common-models/package.json
COPY --from=builder /app/packages/common-models/dist ./packages/common-models/dist
COPY --from=builder /app/packages/common-widgets/package.json ./packages/common-widgets/package.json
COPY --from=builder /app/packages/common-widgets/dist ./packages/common-widgets/dist
COPY --from=builder /app/packages/components-library/package.json ./packages/components-library/package.json
COPY --from=builder /app/packages/components-library/dist ./packages/components-library/dist
COPY --from=builder /app/packages/state-management/package.json ./packages/state-management/package.json
COPY --from=builder /app/packages/state-management/dist ./packages/state-management/dist
COPY --from=builder /app/packages/text-editor/package.json ./packages/text-editor/package.json 
COPY --from=builder /app/packages/text-editor/dist ./packages/text-editor/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json 
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/apps/web ./apps/web

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# USER nextjs

# # RUN yarn workspaces focus --all --production 

# ENV PORT ${PORT:-3000}

# # CMD [ "yarn", "workspace", "@courselit/web", "start" ]
CMD HOSTNAME="0.0.0.0" node apps/web/server.js
