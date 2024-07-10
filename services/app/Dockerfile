FROM node:20-alpine as builder
WORKDIR /app

# copy project related files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
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

# Build all workspaces
RUN corepack enable && \
    pnpm install && \
    pnpm -r rebuild && \
    pnpm -r build

RUN ls /app/apps/web/.next

# Production image
FROM node:18-alpine as runner
WORKDIR /app

ENV NODE_ENV production

# Copy pnpm specific files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Enable corepack to use pnpm without installing it from the internet
RUN corepack enable

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

RUN corepack enable && pnpm install --prod

ENV PORT ${PORT:-3000}

CMD [ "pnpm", "--filter=@courselit/web", "start" ]
