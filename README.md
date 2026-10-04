# CourseLit

Generated from CodeLit Platform `templates/saas-product`. Product-owned
application code lives in `apps/**` and `packages/api-contract/**`. The only
Platform-managed file is `.github/workflows/platform-conformance.yml`; update it
with `bunx @codelitdev/platform-cli@<version> sync`.

## Local development

1. Start the local dependencies:

   ```sh
   docker compose -f docker-compose.local.yml up -d
   ```

   This starts PostgreSQL, SendLit, FrontLit, and Mailpit. MediaLit is an
   external service, not a Compose service; configure `MEDIALIT_APIKEY` in the
   root `.env` if you need its integration. CourseLit's host-run API also needs
   `SENDLIT_SERVER` and `SENDLIT_ORGANIZATION_API_KEY` in `apps/api/.env`. Use
   the same organization key as `BOOTSTRAP_TEAM_PROVISIONING_API_KEY` in the
   root `.env`; see [the API README](apps/api/README.md) for SendLit setup details.

2. Apply CourseLit database migrations:

   ```sh
   bun --filter @courselit/api db:migrate
   ```

3. Start the API, worker, Admin app, and Storefront app, each in its own terminal:

   ```sh
   bun dev:api
   bun dev:worker
   bun dev:admin
   bun dev:storefront
   ```
