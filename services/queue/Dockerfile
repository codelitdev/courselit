FROM node:22-alpine AS base

# Install pnpm in base image
RUN corepack enable pnpm

FROM base AS builder
WORKDIR /app

# copy pnpm specific files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# copy project related files
COPY packages/tsconfig ./packages/tsconfig
COPY packages/common-models ./packages/common-models
COPY packages/common-logic ./packages/common-logic
COPY packages/utils ./packages/utils
COPY apps/queue ./apps/queue

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Production image
FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

# Copy all necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/queue ./apps/queue

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

CMD ["pnpm", "--filter", "@courselit/queue", "start"]
