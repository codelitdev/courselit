FROM node:20-alpine AS builder
WORKDIR /app

# copy yarn specific files
COPY package.json /app/package.json
COPY .yarn /app/.yarn
COPY yarn.lock /app/yarn.lock
COPY .yarnrc.yml /app/.yarnrc.yml

# copy project related files
COPY packages/tsconfig /app/packages/tsconfig
COPY packages/common-models /app/packages/common-models
COPY packages/utils /app/packages/utils
COPY apps/queue /app/apps/queue

RUN cd /app && echo 'Yarn version in builder' && yarn --version

# Build all workspaces
RUN yarn rebuild
RUN yarn build

# Production image
FROM node:20-alpine as runner

ENV NODE_ENV production
WORKDIR /app

# copy yarn specific files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml

# copy project related files
COPY --from=builder /app/packages/common-models/package.json ./packages/common-models/package.json
COPY --from=builder /app/packages/common-models/dist ./packages/common-models/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder /app/apps/queue ./apps/queue

RUN yarn workspaces focus --all --production 

CMD [ "yarn", "workspace", "@courselit/queue", "start" ]
