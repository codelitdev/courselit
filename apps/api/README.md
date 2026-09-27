# CourseLit API

Product-owned application services live here.

## FrontLit and SendLit provisioning

School creation commits the CourseLit school first and queues an idempotent
FrontLit team-provisioning job. Run the API worker alongside the API process:

```sh
bun run dev:worker
```

The worker stores the returned FrontLit team key encrypted, claims the school
subdomain, and verifies CourseLit's three system pages in FrontLit:
homepage, terms, and privacy. FrontLit-specific pages are outside this
provisioning contract.
CourseLit's SendLit team provisioning is a separate integration and is not a
dependency of this flow. A FrontLit outage therefore leaves the school usable
and converges when FrontLit is available again. The default local settings match
`docker-compose.local.yml`; production must provide an explicit
`FRONTLIT_SERVER`, `FRONTLIT_APIKEY`, and `INTEGRATIONS_ENCRYPTION_KEY`.
Optionally set `FRONTLIT_CUSTOM_DOMAIN_CNAME_TARGET` and
`FRONTLIT_CUSTOM_DOMAIN_TXT_RECORD_NAME` to supply DNS instructions for custom
domains on newly provisioned FrontLit teams. Use a stable CourseLit ingress
alias; the TXT setting is a relative DNS record label.

### Local SendLit shared delivery

`docker-compose.local.yml` can bootstrap a local SendLit organization, create
the two scoped organization keys, and configure a shared SMTP ESP backed by
Mailpit. Build the local SendLit image first from the sibling checkout:

```sh
docker build -t codelit/sendlit-api:esp-control \
  -f ../sendlit/apps/api/Dockerfile ../sendlit
```

Compose has stable, local-only defaults for both organization API keys, so no
secret generation is needed. Their values are:

| Setting | Local development value |
|---|---|
| `BOOTSTRAP_DELIVERY_SETUP_API_KEY` | `sl_org_live_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` |
| `BOOTSTRAP_TEAM_PROVISIONING_API_KEY` | `sl_org_live_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb` |

These are deliberately predictable and must only be used for the local stack.
Compose uses them when the variables are unset or empty. Set
`BOOTSTRAP_ORGANIZATION_OWNER_EMAIL` in the repository-root `.env` if the
initial owner should not be `admin@example.com`.

If this Compose stack is adopting an already-bootstrapped SendLit database,
the owner email must match so bootstrap uses the same organization. If that
database was bootstrapped with different keys, set those same values in the
root `.env` to keep using them. Changing to the static defaults registers
additional keys; it does not replace or revoke existing keys.

Start the local stack with `docker compose -f docker-compose.local.yml up -d`.
The SendLit init job hashes/registers the configured keys; the delivery setup
job uses only the delivery key to test and activate the Mailpit ESP, then sets
it as the default for new teams with automatic grants. Mailpit is available at
`http://localhost:8026`; test messages default to `admin@example.com` and can
be redirected with `SENDLIT_DELIVERY_TEST_TO` in the root `.env`. SMTP stays
inside the Compose network at `mailpit:1025`.
Wait for `sendlit-delivery-init` to complete before starting the host-run
CourseLit API/worker; Compose also gates the FrontLit API on that setup job.

FrontLit receives the team-provisioning key from Compose. CourseLit’s API and
worker run on the host and read their SendLit settings from the environment;
they do not inherit the Compose values. Set `SENDLIT_SERVER` and
`SENDLIT_ORGANIZATION_API_KEY` in `apps/api/.env` explicitly. For local use,
set the organization key to the same value as
`BOOTSTRAP_TEAM_PROVISIONING_API_KEY` in the repository-root `.env`. The
runtime key has only `organization:read`, `teams:provision`, and `teams:read`;
do not give the delivery setup key to CourseLit runtime processes.
Fresh provisioning returns a team key and works with these scopes. One
recovery path is not covered yet: if CourseLit has lost a previously issued
team key, its adapter calls `/provisioning/teams/:teamId/keys`, which requires
SendLit’s separate `teams:keys` scope. That path will receive `403` until the
runtime role or recovery flow is deliberately updated.

Bootstrap validates the same configured secret against its existing key
record on restarts. Keep both values stable while using the local database;
rotation requires switching consumers to a newly registered key before
revoking the old one. Delivery setup persists a marker in a named local volume
and preserves a different default ESP if an operator has already selected
one. To deliberately run setup again, remove only its `state.json` marker from
the dedicated setup volume after stopping the local stack. Avoid
`docker compose down -v`, which also removes the database volumes.

## Local database

The API owns PostgreSQL migrations. From the repository root, apply the Drizzle
migration with:

```sh
DATABASE_URL=postgres://... bun run --cwd apps/api db:migrate
```

The schema source is `src/db/schema`, the generated SQL migration is
`apps/api/drizzle/0000_baseline.sql`, and Drizzle metadata lives under
`apps/api/drizzle/meta`. Generate schema changes with:

```sh
bun run --cwd apps/api db:generate
```

Production startup keeps the migration runner separate so a deployment can fail
before serving traffic when the schema cannot be upgraded. The API development
command runs the same migration runner before starting the watcher, so local
schema changes are applied automatically.

## Legacy domain import

`migrate:domains` imports a JSON export of the legacy `Domain` collection. It is
school-scoped, owner-matched, restartable through the legacy-ID mapping table,
and dry-runs by default:

```sh
DATABASE_URL=postgres://... bun --cwd apps/api run migrate:domains \
  --input ./exports/domains.json

DATABASE_URL=postgres://... bun --cwd apps/api run migrate:domains \
  --input ./exports/domains.json --apply
```

The command prints a JSON report and exits with status `2` when any source row
is rejected. Deleted domains are reported for archival rather than imported.
The importer requires exactly one target admin account for each owner email;
it does not create or guess identities. Apply-mode imports of legacy custom
domains that were not verified include a one-time DNS challenge in the report
so operators can complete re-verification before routing traffic.

## Legacy community import

`migrate:communities` imports a school-scoped community export containing
communities, community plans, memberships, posts, comments/replies, reactions,
post subscriptions, and reports. It is dry-run by default and preserves each
source public ID in the migration mapping table:

```sh
DATABASE_URL=postgres://... bun --cwd apps/api run migrate:communities \
  --input ./exports/communities.json

DATABASE_URL=postgres://... bun --cwd apps/api run migrate:communities \
  --input ./exports/communities.json --apply
```

Replies are stored with flat parent-comment context. Embedded community media is
accepted only when a legacy-media-to-MediaLit catalog mapping already exists;
otherwise the row is rejected for reconciliation instead of being imported
without its attachment.

`migrate:learners` should run before the community importer when the export uses
legacy user IDs. It imports learner identity fields only; legacy sessions are
not copied and learners authenticate again in the target system:

```sh
DATABASE_URL=postgres://... bun --cwd apps/api run migrate:learners \
  --input ./exports/learners.json --apply
```

`migrate:notifications` imports unread notifications and read notifications
from the latest 12 months, plus notification preferences. Older read records
are counted as archived and legacy session state is never copied:

```sh
DATABASE_URL=postgres://... bun --cwd apps/api run migrate:notifications \
  --input ./exports/notifications.json --apply
```

## Custom hosts

Owners manage custom hosts through `/v1/school/hosts`. Creating a host returns
one DNS TXT challenge. Add the returned value at the returned name, then call
the host verification endpoint. Only verified hosts resolve learner traffic;
all host changes are audited and hostnames cannot be claimed by another school.
