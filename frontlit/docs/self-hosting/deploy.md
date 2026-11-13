---
title: Deploy the services
description: Run the database migration, the API, the worker, the admin and the storefront from the published CourseLit container images.
nav_order: 20
---

This page lists, in order, what you need to start a CourseLit deployment from the published images. Read [Self-hosting](/docs/self-hosting) first for what each part does, and keep [Configuration](/docs/self-hosting/configuration) open for the environment variables.

## Before you start

- A PostgreSQL database that the API and the worker can reach. Create an empty database and a user for CourseLit. The local development setup uses PostgreSQL 17.
- A media storage service address and API key.
- Either SMTP details or an email service team key for system mail.
- A domain for the platform, such as `example.com`. School websites live on subdomains of it, and the admin and API need hostnames too. See [Domains and reverse proxy](/docs/self-hosting/domains-and-proxy).
- Two long random strings, which you generate once and keep, for `AUTH_SECRET` and `API_KEY_PEPPER`. `AUTH_SECRET` must be at least 32 characters.

```bash
openssl rand -base64 48
```

<Callout type="warning" title="Keep the secrets stable">

Changing `AUTH_SECRET` signs everybody out. Changing `API_KEY_PEPPER` makes every existing API key stop working. `INTEGRATIONS_ENCRYPTION_KEY` encrypts the payment provider credentials and service keys that schools save. Set it to its own random value, because the credentials become unreadable if it changes. When it is not set, the API uses `AUTH_SECRET` for this, which then cannot be changed either.

</Callout>

<Steps>

<Step>

### Pull the images

Use one version for all three images.

```bash
docker pull codelit/courselit-api:1.0.0-alpha.0
docker pull codelit/courselit-admin:1.0.0-alpha.0
docker pull codelit/courselit-storefront:1.0.0-alpha.0
```

Replace the version with the release you want to run.

</Step>

<Step>

### Apply the database migrations

The API does not create or update its tables when it starts. If the tables are missing it stops with an error that names them. Run the migration command from the API image with only `DATABASE_URL` set.

```bash
docker run --rm \
  -e DATABASE_URL="postgres://courselit:password@db-host:5432/courselit" \
  codelit/courselit-api:1.0.0-alpha.0 \
  bun apps/api/scripts/migrate.mjs
```

It prints a JSON line with `migrated` set to `true` and the list of tables. Run the same command again on every upgrade, before you start the new version.

</Step>

<Step>

### Start the API

The API image listens on port 4000 and runs `bun apps/api/src/main.ts`. It needs the variables for the database, secrets, public addresses, media storage and email.

```bash
docker run -d --name courselit-api -p 4000:4000 \
  -e DATABASE_URL="postgres://courselit:password@db-host:5432/courselit" \
  -e AUTH_SECRET="..." \
  -e API_KEY_PEPPER="..." \
  -e INTEGRATIONS_ENCRYPTION_KEY="..." \
  -e PUBLIC_API_URL="https://api.example.com" \
  -e WEB_ORIGIN="https://admin.example.com" \
  -e PLATFORM_SITE_DOMAIN="example.com" \
  -e BILLING_MODE="oss" \
  -e MEDIALIT_SERVER="https://media.example.com" \
  -e MEDIALIT_APIKEY="..." \
  -e EMAIL_HOST="smtp.example.com" \
  -e EMAIL_PORT="587" \
  -e EMAIL_USER="..." \
  -e EMAIL_PASS="..." \
  -e EMAIL_FROM="CourseLit <no-reply@example.com>" \
  codelit/courselit-api:1.0.0-alpha.0
```

Check that it is healthy.

```bash
curl https://api.example.com/health
curl https://api.example.com/ready
```

`/health` returns the running version, and `/ready` reports whether the database is reachable. Leave the `SEED` variable unset in production, because it creates sample data for development.

`BILLING_MODE=oss` lets you create any number of schools without a CourseLit plan. The default, `cloud`, is for CourseLit's own hosted service and requires a hosted billing provider.

</Step>

<Step>

### Start the worker

The worker uses the same image and the same environment as the API, including the media storage variables. Run one worker. It handles background jobs, including sending drip emails once a minute.

```bash
docker run -d --name courselit-worker \
  --env-file courselit-api.env \
  codelit/courselit-api:1.0.0-alpha.0 \
  bun apps/api/src/worker.ts
```

Here `courselit-api.env` is a file with one `NAME=value` line for each variable you gave the API container, without quotes.

</Step>

<Step>

### Start the admin

The admin image listens on port 3000. It needs only the address of the API.

```bash
docker run -d --name courselit-admin -p 3000:3000 \
  -e API_URL="http://courselit-api:4000" \
  codelit/courselit-admin:1.0.0-alpha.0
```

Use an address that the admin container can reach, such as the API container's name on a shared Docker network. The admin forwards the browser's requests under `/api` to the API.

</Step>

<Step>

### Start the storefront

The storefront image listens on port 3001. It also needs only the address of the API.

```bash
docker run -d --name courselit-storefront -p 3001:3001 \
  -e API_URL="http://courselit-api:4000" \
  codelit/courselit-storefront:1.0.0-alpha.0
```

SCORM lessons are unpacked into a cache directory on the storefront container. Set `SCORM_CACHE_DIR` to a writable path if the default temporary directory is not suitable.

</Step>

<Step>

### Route hostnames to the services

Put a reverse proxy in front of the three services so that your hostnames reach them with HTTPS. See [Domains and reverse proxy](/docs/self-hosting/domains-and-proxy).

</Step>

<Step>

### Create your first school

Open the admin address, sign in with your email address and the code that arrives by email, and create a school, see [Getting started](/docs/getting-started).

</Step>

</Steps>

## The same on one Docker network

This sketch shows how the containers refer to each other on one Docker network. It is a starting point built from the commands above, not an officially tested file. Put the variables from the API step into `courselit-api.env`.

```yaml title="compose.yaml"
services:
  migrate:
    image: codelit/courselit-api:1.0.0-alpha.0
    command: ["bun", "apps/api/scripts/migrate.mjs"]
    environment:
      DATABASE_URL: postgres://courselit:password@db:5432/courselit
    depends_on:
      db:
        condition: service_healthy

  api:
    image: codelit/courselit-api:1.0.0-alpha.0
    env_file: courselit-api.env
    ports: ["4000:4000"]
    depends_on:
      migrate:
        condition: service_completed_successfully

  worker:
    image: codelit/courselit-api:1.0.0-alpha.0
    command: ["bun", "apps/api/src/worker.ts"]
    env_file: courselit-api.env
    depends_on:
      migrate:
        condition: service_completed_successfully

  admin:
    image: codelit/courselit-admin:1.0.0-alpha.0
    environment:
      API_URL: http://api:4000
    ports: ["3000:3000"]

  storefront:
    image: codelit/courselit-storefront:1.0.0-alpha.0
    environment:
      API_URL: http://api:4000
    ports: ["3001:3001"]

  db:
    image: postgres:17
    environment:
      POSTGRES_USER: courselit
      POSTGRES_PASSWORD: password
      POSTGRES_DB: courselit
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U courselit -d courselit"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  db-data:
```

## Upgrade

<Steps>

<Step>

### Back up the database

CourseLit keeps all of its data in PostgreSQL, apart from uploaded files, which live in the media storage service. Back up both.

</Step>

<Step>

### Pull the new version

Pull the three images at the new version tag.

</Step>

<Step>

### Run the migration

Run the migration command from the new API image, then start the new API, worker, admin and storefront containers on the same version.

</Step>

</Steps>

During the pre-release period the database schema can be rewritten instead of migrated, so moving between pre-release versions may not be possible without starting from a fresh database. Read the release notes of the version you are moving to before you upgrade a deployment that holds real data.
