---
title: Configuration
description: Reference for the environment variables of the CourseLit API, worker, admin and storefront, with what is required and what has a default.
nav_order: 30
---

CourseLit is configured with environment variables. The API and the worker share one set, and the admin and the storefront each need only the address of the API.

The tables mark a variable as **Required** when the process will not start, or cannot do its core job, without it.

## API and worker

The worker is the API image started with `bun apps/api/src/worker.ts`. Give it the same variables as the API.

### Core

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Required | none | PostgreSQL connection string |
| `AUTH_SECRET` | Required | none | Secret for sessions and tokens. At least 32 characters. |
| `API_KEY_PEPPER` | Required | none | Secret mixed into the stored hash of every school API key. Use a long random value and keep it. |
| `PUBLIC_API_URL` | Recommended | `http://127.0.0.1:` followed by `PORT` | The public address of the API. It is the OAuth issuer and the base of the MCP server address, so it must be the address clients really use, including `https`. |
| `WEB_ORIGIN` | Recommended | `http://localhost:3000` | The public origin of the admin. Used for sign-in redirects, trusted origins and the default payment webhook address. |
| `PORT` | Optional | `4000` | The port the API listens on |
| `NODE_ENV` | Optional | `production` in the image | Set to `production` for deployments. In other modes, system mail is printed to the log instead of sent. |
| `INTEGRATIONS_ENCRYPTION_KEY` | Recommended | `AUTH_SECRET` | Key that encrypts credentials that schools save, such as payment provider keys. Use a dedicated random value. |
| `BILLING_MODE` | Recommended | `cloud` | Use `oss` for a self-hosted deployment. `cloud` is for CourseLit's hosted service and requires its billing provider settings. |
| `SEED` | Do not set | unset | Seeds sample data for development. Leave it unset. |

### Domains

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PLATFORM_SITE_DOMAIN` | Required in production | `localhost` in development | The domain whose subdomains serve school websites, for example `example.com`. Some checks fall back to `courselit.app` when it is unset, so always set it. |
| `STOREFRONT_PORT` | Optional | none | Only for non-standard storefront ports, such as local setups. Added to storefront addresses the API builds. |
| `CUSTOM_DOMAIN_CNAME_TARGET` | Optional | `sites.` followed by `PLATFORM_SITE_DOMAIN` | The hostname schools point their custom domain to |
| `CUSTOM_DOMAIN_TXT_RECORD_NAME` | Optional | `_courselit-verification` | The name of the DNS TXT record that proves a school owns its domain |
| `CUSTOM_DOMAIN_A_RECORDS` | Optional | none | Comma-separated IP addresses shown to schools as A records for apex domains |
| `PAYMENT_WEBHOOK_BASE_URL` | Optional | `WEB_ORIGIN` followed by `/api` | The public address payment providers call with events. Set it when the admin origin cannot be reached from the internet. |

### Media storage

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MEDIALIT_SERVER` | Required | none | The address of the media storage service |
| `MEDIALIT_APIKEY` | Required | none | Its API key. It stays on the server and is never sent to browsers. |

### Email

System mail covers sign-in codes, team invitations and other essential messages. Use one of the two transports. If both are set, the team key wins.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `SENDLIT_PLATFORM_TEAM_API_KEY` | One transport is required | none | Sends system mail through the email service. Needs `SENDLIT_SERVER`. |
| `EMAIL_HOST` | One transport is required | none | SMTP host |
| `EMAIL_PORT` | Optional | `587` | SMTP port |
| `EMAIL_USER` | Optional | none | SMTP user |
| `EMAIL_PASS` | Optional | none | SMTP password |
| `EMAIL_FROM` | Optional | the SMTP server's default | The sender address |

Email marketing, contacts and segments use the email service for each school.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `SENDLIT_SERVER` | Needed for email marketing | none | The address of the email service |
| `SENDLIT_ORGANIZATION_API_KEY` | Needed for email marketing | none | An organization key that lets the worker provision an email team for each new school |

### Optional integrations

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Turn on Google sign-in. Set both. The Google redirect address is `PUBLIC_API_URL` followed by `/api/auth/callback/google`. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Turn on Cloudflare Turnstile on sign-in and public forms. Set both. |
| `UNSPLASH_ACCESS_KEY` | Turn on the Unsplash image search in the media picker |
| `GIPHY_API_KEY` | Turn on GIF search in community posts |

### Limits and logging

| Variable | Default | Purpose |
| --- | --- | --- |
| `RATE_LIMIT_PER_MINUTE` | `1200` per address in production, 10,000 otherwise | Requests per client address per minute. See [Rate limits and retries](/docs/developers/rate-limits-and-retries). |
| `LOG_LEVEL` | `info` | Log verbosity |
| `POSTHOG_API_KEY`, `POSTHOG_HOST` | unset | Send product analytics and error reports to PostHog |
| `OTLP_LOGS_ENDPOINT`, `OTLP_LOGS_AUTHORIZATION` | unset | Send logs to an OpenTelemetry endpoint |

Payment provider keys for learner purchases are not environment variables. Each school enters its own Stripe, Lemon Squeezy or Razorpay credentials in the admin, and CourseLit stores them encrypted in the database.

## Admin

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `API_URL` | Required | `http://127.0.0.1:4000` | The address of the API that the admin server calls. It is read at runtime. |
| `PORT` | Optional | `3000` in the image | The listening port |
| `POSTHOG_API_KEY`, `POSTHOG_HOST` | Optional | unset | Browser analytics |
| `DEPLOY_ENV` | Optional | none | A label for the environment, passed to analytics |

## Storefront

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `API_URL` | Required | `http://127.0.0.1:4000` | The address of the API that the storefront server calls |
| `PORT` | Optional | `3001` in the image | The listening port |
| `SCORM_CACHE_DIR` | Optional | A `courselit-scorm` folder in the system temp directory | Where SCORM packages are unpacked for learners |
