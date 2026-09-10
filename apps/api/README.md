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

## Legacy product discussions

`migrate:product-discussions` imports lesson/product discussion comments,
replies, likes, subscriptions, summaries, and reports. It requires the domain,
product, lesson, and learner imports to have established their migration
mappings first. Deleted content remains deleted with empty rendered content;
the importer never invents an author when a legacy identity cannot be resolved,
so those rows are reported for reconciliation instead:

```sh
DATABASE_URL=postgres://... bun --cwd apps/api run migrate:product-discussions \
  --input ./exports/product-discussions.json

DATABASE_URL=postgres://... bun --cwd apps/api run migrate:product-discussions \
  --input ./exports/product-discussions.json --apply
```

## Custom hosts

Owners manage custom hosts through `/v1/school/hosts`. Creating a host returns
one DNS TXT challenge. Add the returned value at the returned name, then call
the host verification endpoint. Only verified hosts resolve learner traffic;
all host changes are audited and hostnames cannot be claimed by another school.
