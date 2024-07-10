FROM node:20-alpine AS builder
WORKDIR /app

# Combine copy commands for efficiency
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/tsconfig /app/packages/tsconfig
COPY packages/common-models /app/packages/common-models
COPY apps/queue /app/apps/queue

# Combine RUN commands to reduce layers
RUN corepack enable && \
	echo 'PNPM version in builder' && \
	pnpm --version && \
	pnpm install && \
	pnpm -r rebuild && \
	pnpm -r --filter=!@courselit/docs run build

# Production image
FROM node:20-alpine as runner
ENV NODE_ENV production
WORKDIR /app

# Copy necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
# If pnpm-workspace.yaml is not needed for runtime, consider removing it
COPY --from=builder /app/packages/common-models/package.json ./packages/common-models/package.json
COPY --from=builder /app/packages/common-models/dist ./packages/common-models/dist
COPY --from=builder /app/apps/queue ./apps/queue

# Install production dependencies only
RUN corepack enable && pnpm install --prod

CMD [ "pnpm", "--filter=@courselit/queue", "start" ]
