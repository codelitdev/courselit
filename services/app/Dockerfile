FROM node:18-alpine as builder
ENV NODE_ENV production

RUN apk update

WORKDIR /app

# copy yarn specific files
COPY package.json /app/package.json
COPY .yarn /app/.yarn
COPY yarn.lock /app/yarn.lock
COPY .yarnrc.yml /app/.yarnrc.yml

# copy project related files
COPY packages/common-models /app/packages/common-models
COPY packages/common-widgets /app/packages/common-widgets
COPY packages/components-library /app/packages/components-library
COPY packages/state-management /app/packages/state-management
COPY packages/text-editor /app/packages/text-editor
COPY packages/utils /app/packages/utils
COPY apps/web /app/apps/web

RUN cd /app && echo 'Yarn version in builder' && yarn --version

# Build all workspaces
RUN yarn rebuild
RUN yarn build

RUN ls /app/apps/web/.next

# Production image
FROM node:18-alpine as runner

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

RUN yarn workspaces focus --all --production 

ENV PORT ${PORT:-3000}

CMD [ "yarn", "workspace", "@courselit/web", "start" ]
