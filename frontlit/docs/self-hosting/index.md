---
title: Self-hosting
description: Understand what a self-hosted CourseLit deployment consists of, what it depends on, and how mature the self-hosting path is today.
nav_order: 10
---

You can run CourseLit on your own infrastructure. The platform is open source, and each release publishes ready-made container images. This section describes the pieces, the configuration they need and how they fit together, so that you can deploy them with the tools you already use.

<Callout type="warning" title="Self-hosting is for experienced operators today">

CourseLit 1.0 is in pre-release. The repository does not ship a production Compose file or a reverse-proxy configuration, and a deployment depends on external services for media storage and email. There is no one-command installer. Expect to assemble the services yourself, and expect details to change between pre-releases.

</Callout>

## What runs

A deployment has five parts.

| Part | Image or service | Default port | Role |
| --- | --- | --- | --- |
| API | `codelit/courselit-api` | 4000 | The REST API, the MCP server, authentication and all business logic |
| Worker | The same `codelit/courselit-api` image, started with another command | none | Background jobs such as drip emails and connecting new schools to the email service |
| Admin | `codelit/courselit-admin` | 3000 | The dashboard where you manage the school |
| Storefront | `codelit/courselit-storefront` | 3001 | The public school websites that learners use |
| PostgreSQL | Your own database | 5432 | The only data store of CourseLit |

The admin and the storefront do not talk to the database. They call the API, at the address you set in `API_URL`.

One deployment serves many schools. Each school gets a subdomain of your platform domain, and can attach a custom domain.

## External services

The API needs two services outside the containers.

- **Media storage.** Uploaded files, such as videos, PDFs and images, are stored by a separate media service that the API calls with a server address and an API key. The API does not start without `MEDIALIT_SERVER` and `MEDIALIT_APIKEY`. The worker needs them too.
- **Email delivery.** CourseLit sends sign-in codes, invitations and other system mail either through SMTP or through a team key of an email service. In production the API cannot send mail until you configure one of them, which means nobody can sign in with an emailed code.

Email marketing features such as sequences, broadcasts and segments are powered by a separate email service, which you connect with `SENDLIT_SERVER` and `SENDLIT_ORGANIZATION_API_KEY`. See [Configuration](/docs/self-hosting/configuration).

## Versions and image tags

Images are tagged with the release version, such as `1.0.0-alpha.0`, for the three images `codelit/courselit-api`, `codelit/courselit-admin` and `codelit/courselit-storefront`. Pre-release versions never move the `latest` tag, and `latest` still points at the older 0.x line of CourseLit, which is a different product architecture. Always pin an explicit version tag, and use the same version for all three images.

## Where to go next

<Cards>

<Card title="Deploy the services" href="/docs/self-hosting/deploy" icon="Server">

Run the migration, the API, the worker, the admin and the storefront.

</Card>

<Card title="Configuration" href="/docs/self-hosting/configuration" icon="Settings">

Every environment variable, grouped by service.

</Card>

<Card title="Domains and reverse proxy" href="/docs/self-hosting/domains-and-proxy" icon="Globe">

How hostnames reach the right service, and how custom domains work.

</Card>

</Cards>

If you only need to use CourseLit and not operate it, create a school on the hosted service instead, see [Getting started](/docs/getting-started).
