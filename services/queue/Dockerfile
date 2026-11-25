# The build runs on the build machine's own platform ($BUILDPLATFORM): its
# output is JavaScript, the same for every target, and emulating arm64 on an
# x86 builder (or the reverse) is several times slower. The runner, and its
# production install, run as the target platform.
FROM node:22-alpine AS base

# Install pnpm in base image
RUN corepack enable pnpm

FROM --platform=$BUILDPLATFORM node:22-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app

# copy pnpm specific files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# copy project related files
COPY packages/tsconfig ./packages/tsconfig
COPY packages/page-models ./packages/page-models
COPY packages/email-editor ./packages/email-editor
COPY packages/common-models ./packages/common-models
COPY packages/common-logic ./packages/common-logic
COPY packages/orm-models ./packages/orm-models
COPY packages/utils ./packages/utils
COPY apps/queue ./apps/queue

# Install dependencies and build
RUN pnpm install
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
