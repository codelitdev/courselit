---
title: Developers
description: Build on CourseLit with the REST API or the MCP server, and find the right page for authentication, errors, pagination and common tasks.
nav_order: 10
---

CourseLit has two programmatic interfaces to a school: a **REST API** for your own code, and an **MCP server** for AI assistants such as Claude and ChatGPT. Both run on the same service, use the same credentials, apply the same permission checks and expose the same operations.

## What you can build

Use the API to create and publish courses and downloads, manage sections, lessons and payment plans, grant learners access, read learner progress and sales figures, manage contacts and segments, work with the media library, and edit the school website. The API reference lists every operation with its parameters and example responses.

## Base URL and versioning

Every operation that acts on a school lives under the `/v1` path of the API host.

| Where you run CourseLit | Base URL |
| --- | --- |
| CourseLit's hosted service | `https://api.courselit.app` |
| A self-hosted deployment | The value of `PUBLIC_API_URL` that your operator configured, see [Self-hosting](/docs/self-hosting) |

Requests and responses are JSON. Send `Content-Type: application/json` on requests with a body. The API rejects JSON bodies larger than 32 KB.

The service also answers three unversioned paths without credentials.

| Path | Returns |
| --- | --- |
| `/health` | `status`, `service`, `time` and the running `version` |
| `/ready` | Readiness of the database |
| `/openapi.json` | The OpenAPI document for the API |

The host also serves an interactive Swagger UI at `/docs`.

## How a request is scoped to a school

A CourseLit account can own or belong to several schools, and every call acts on exactly one of them.

- An **API key** belongs to one school and always acts on that school. Nothing else needs to be sent.
- An **OAuth access token** belongs to a person, so the request names the school with the `X-School-ID` header. If the header is missing, the API uses the school that person last selected in the admin.

The API never infers the school from the `Host` header. See [Authentication](/docs/developers/authentication) for the details.

## Operation groups

The reference groups operations by area.

| Area | What it covers |
| --- | --- |
| Products and courses | Products, sections, lessons, payment plans, customers, progress and analytics |
| Learners | Granting learners access to products, plus the learner-facing operations the school website uses |
| Communities | Communities, spaces, members, posts, comments, reports and community plans |
| Contacts and marketing | Contacts, segments, tags, email sequences, templates and mailing settings |
| School website | Pages, blog posts, branding, themes and custom code |
| Media | Upload authorizations, the media library and where each file is used |
| Certificates | Certificate templates |
| School and team | School settings, domains, team, invitations and API keys |

<Callout type="note" title="Not every operation accepts an API key">

Operations that move money, change who can sign in, or run code on the learner site are limited to signed-in people. The reference shows, for each operation, whether it accepts an API key and an OAuth token. See [Permissions and scopes](/docs/developers/permissions-and-scopes).

</Callout>

## Where to go next

<Cards>

<Card title="Authentication" href="/docs/developers/authentication" icon="KeyRound">

Create an API key or use OAuth.

</Card>

<Card title="Make your first request" href="/docs/developers/first-request" icon="Terminal">

List products and create one with curl.

</Card>

<Card title="Errors" href="/docs/developers/errors" icon="TriangleAlert">

The error format and every error code.

</Card>

<Card title="MCP server" href="/docs/developers/mcp-server" icon="Plug">

Connect Claude, ChatGPT or another assistant.

</Card>

<Card title="Create and publish a course" href="/docs/developers/create-and-publish-a-course" icon="GraduationCap">

A complete workflow from an empty school to a live course.

</Card>

</Cards>

## Not available yet

CourseLit does not send outgoing webhooks to your own endpoints and does not support idempotency keys. See [Webhooks and events](/docs/developers/webhooks) and [Rate limits and retries](/docs/developers/rate-limits-and-retries) for what to do instead.
