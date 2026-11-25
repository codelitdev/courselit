# Install and build run on the build machine's own platform ($BUILDPLATFORM):
# the output is JavaScript, the same for every target, and emulating arm64 on
# an x86 builder (or the reverse) is several times slower. Only the runtime
# stage below is the target platform, with sharp's native binaries for it.
FROM --platform=$BUILDPLATFORM oven/bun:1.4.4-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/storefront/package.json ./apps/storefront/package.json
COPY packages/api-contract/package.json ./packages/api-contract/package.json
COPY packages/page-blocks/package.json ./packages/page-blocks/package.json
COPY packages/lesson-content/package.json ./packages/lesson-content/package.json
RUN bun install --filter '@courselit/storefront...' --frozen-lockfile

FROM deps AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY apps/storefront ./apps/storefront
COPY packages/api-contract ./packages/api-contract
COPY packages/page-blocks ./packages/page-blocks
COPY packages/lesson-content ./packages/lesson-content
RUN bun --bun run --filter @courselit/storefront build

# sharp (Next.js image optimization) is the one native module traced into the
# standalone output. Fetch its binaries for the target platform, at the
# version the lockfile resolved, without running anything for that platform.
# The runner is Alpine, so fetch the musl builds (on a glibc build machine bun
# would fetch only glibc ones).
ARG TARGETARCH
RUN version=$(sed -n 's/^ *"sharp": \["sharp@\([0-9.]*\)".*/\1/p' bun.lock | head -n 1) \
    && test -n "$version" \
    && mkdir -p /target-sharp && cd /target-sharp \
    && printf '{"dependencies":{"sharp":"%s"}}' "$version" > package.json \
    && bun install --production --os=linux --libc=musl \
        --cpu=$([ "$TARGETARCH" = amd64 ] && echo x64 || echo "$TARGETARCH")

FROM oven/bun:1.4.4-alpine AS runner
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
# Put the target platform's sharp binaries (@img/sharp-*, which include
# libvips) beside each traced copy of sharp. Packages already there (the
# build platform's, or JavaScript ones such as @img/colour) are left as is.
COPY --from=builder /target-sharp/node_modules/@img /tmp/target-img
RUN for dir in $(find node_modules -type d -path '*/node_modules/sharp'); do \
        mkdir -p "$dir/../@img"; \
        for pkg in /tmp/target-img/sharp-*; do \
            [ -e "$dir/../@img/${pkg##*/}" ] || cp -R "$pkg" "$dir/../@img/"; \
        done; \
    done \
    && rm -rf /tmp/target-img

USER bunuser
EXPOSE 3001
CMD ["bun", "apps/storefront/server.js"]
