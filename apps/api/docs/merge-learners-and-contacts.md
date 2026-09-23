# PRD: Merge learners and contacts

## Objective

CourseLit learners and SendLit contacts represent the same school-scoped
person, but they serve different product concerns. CourseLit owns the complete
learner aggregate. SendLit is a downstream CRM and messaging integration that
receives the minimum contact identity and four derived filter fields needed for
marketing.

The target is one school-scoped learner/contact aggregate identified by the
CourseLit school-account ID. A school account activated by learner signup or
newsletter signup is always created first and provisions exactly one SendLit
contact; a SendLit contact never creates a CourseLit account. Staff-only school
accounts do not become marketing contacts until one of those two learner/contact
entry points occurs. Clients consume CourseLit APIs and must not compose the two
systems independently, join them by email, or use SendLit contact IDs.

SendLit may retain the four derived CourseLit custom fields for marketing
filters. That projection is eventually consistent, disposable, and rebuildable.
It must never be consulted to authorize access, calculate progress, reconcile
commerce, or render a core learner workflow.

## Delivery strategy

This is a clean V1 implementation. CourseLit does not have any production
data that must survive the change. The implementation must therefore replace
the current model atomically instead of introducing transitional schemas,
backfills, dual writes, compatibility routes, or legacy DTOs.

The delivery sequence is:

1. Define the final CourseLit learner and SendLit adapter contracts against
   SendLit's existing public API.
2. Rewrite the original CourseLit migrations to create those final
   schemas directly.
3. Replace the domain services, API routes, permissions, event contracts, and
   application clients with their final V1 implementations.
4. Delete the superseded contact/subscriber code and duplicate permissions.
5. Pass static, unit, contract, and integration tests against disposable test
   databases.
6. Stop the CourseLit application processes and remove only CourseLit's local
   containers and volumes.
7. Recreate the CourseLit containers, apply the rewritten baseline migrations,
   and seed a new development world.
8. Start all services and pass the clean-install validation suite.

No implementation phase should preserve invalid intermediate behavior for the
sake of the current development database. Developers must expect all local
CourseLit schools, accounts, purchases, and progress to be deleted during the
rebuild. SendLit contacts are not deleted by the teardown.

SendLit is already in production and is outside the destructive rebuild scope.
This work must not change the SendLit repository, database schema, migrations,
public API, workers, containers, or production data. CourseLit integrates only
through SendLit's existing documented public HTTP API. Tests must mock that API
or use an explicitly isolated SendLit test team; they must never reset SendLit.

## Data ownership

| Data | Source of truth |
| --- | --- |
| School-account ID, authentication link, and verified login email | CourseLit |
| Name, bio, avatar, and learner profile | CourseLit |
| Active or deactivated status | CourseLit |
| Memberships and product or community entitlements | CourseLit |
| Purchases, subscriptions, invoices, payments, and refunds | CourseLit |
| Lesson progress, evaluations, certificates, and community activity | CourseLit |
| Learner filter contract and canonical operational values | CourseLit |
| Marketing consent, suppression state, campaigns, and delivery history | SendLit |
| CRM tags and saved marketing segments | SendLit |
| Contact-list filtering, pagination, and derived CourseLit filter fields | SendLit |
| SendLit contact ID | CourseLit, internally |

The CourseLit API exposes the canonical contact identity and operational
resources through `/v1/contacts`. Its admin Contacts endpoints proxy SendLit's
CRM read model and map each result back to the CourseLit contact ID
(the school-account public ID prefixed with `cnt_`). CRM state never participates
in the contact's operational identity or entitlements.

## Phase 1 — Identity and schema foundation

Use `school_accounts` as the aggregate root for every learner/contact.

- Keep `school_accounts.user_id` non-null. Every learner signup and newsletter
  signup must first create or reuse the canonical CourseLit user identity, then
  create or reuse the school account that references it, and only then enqueue
  SendLit contact provisioning. A SendLit contact must never exist without that
  source school account. Preserve the required user foreign key and do not
  introduce an orphan/contact-only school-account shape.
- Add nullable `learner_registered_at` to `school_accounts`. Newsletter signup
  leaves it null; successful learner registration sets it once. This is the
  school-scoped distinction between a newsletter-only account and an account
  that may authenticate as a learner. Do not infer registration from a nullable
  `user_id`, because every school account has a user identity.
- Store the canonical learner profile directly on `school_accounts`: immutable
  normalized `email`, mutable `display_name` and `bio`, and nullable avatar
  `MediaRef`. Replace the legacy image string rather than introducing a second
  profile table or separate avatar ID and URL columns. Reconcile its uploaded
  media ID through the platform media-reference service under a learner-avatar
  reference role.
- Use account status `active`, `deactivated`, or `deletion_pending`.
- Add nullable `last_active_at`. Set it on successful learner authentication
  and advance it through a throttled authenticated-activity touch. Do not use
  generic profile or account `updated_at` changes as learner activity.
- Add nullable `contact_activated_at`. Learner signup and newsletter signup set
  it once; staff-team creation alone does not. This is the durable signal that
  the account must have a SendLit contact.
- Add nullable `sendlit_contact_id` directly to `school_accounts`, with a unique
  constraint when present. There is exactly one CRM provider and exactly one
  contact per contact-activated school account, so do not add a provider-mapping
  or marketing-cache table. Add a check that a non-null contact ID requires a
  non-null `contact_activated_at`.
- Keep synchronization attempts and errors in the existing integration outbox.
  A reconciliation worker must enqueue any account whose
  `contact_activated_at` is present and contact ID is missing, and must repair a
  mapping when the remote contact was removed.
- Retire the legacy `lrn` public ID prefix and merge it into `cnt`:
  `school_accounts.public_id` represents the unified Contact aggregate root and
  must be generated using `createPublicId(CONTACT_PUBLIC_ID_PREFIX, clock)` where
  `CONTACT_PUBLIC_ID_PREFIX = "cnt"` (exported in `apps/api/src/public-id-prefixes.ts`).
  Replace all `createPublicId("lrn", ...)` calls across `schools.ts`, `learners.ts`,
  `seed.ts`, and domain migration seeders with `"cnt"`. As this is a clean V1
  rewrite with zero production deployment, all school account public IDs are
  consistently formatted as `cnt_<timestamp_base32>`, with no backward-compatible
  aliases or prefix translation layers needed.

### Target Drizzle schema: `school_accounts`

```ts
import type { MediaRef } from "@courselit/api-contract";
import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools.js";
import { user } from "./auth.generated.js";

export const schoolAccounts = pgTable(
  "school_accounts",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(), // Prefix: 'cnt' to match unified contacts aggregate
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatar: jsonb("avatar").$type<MediaRef | null>(),
    status: text("status")
      .$type<"active" | "deactivated" | "deletion_pending">()
      .notNull()
      .default("active"),
    learnerRegisteredAt: timestamp("learner_registered_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    contactActivatedAt: timestamp("contact_activated_at", { withTimezone: true }),
    sendlitContactId: text("sendlit_contact_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolUser: uniqueIndex("school_accounts_school_user_uidx").on(
      table.schoolId,
      table.userId,
    ),
    schoolEmail: uniqueIndex("school_accounts_school_email_uidx").on(
      table.schoolId,
      table.email,
    ),
    schoolSendLitContact: uniqueIndex("school_accounts_school_sendlit_contact_uidx")
      .on(table.schoolId, table.sendlitContactId)
      .where(sql`${table.sendlitContactId} IS NOT NULL`),
    contactActivatedCheck: check(
      "school_accounts_contact_activated_check",
      sql`${table.sendlitContactId} IS NULL OR ${table.contactActivatedAt} IS NOT NULL`,
    ),
    statusCheck: check(
      "school_accounts_status_check",
      sql`${table.status} IN ('active', 'deactivated', 'deletion_pending')`,
    ),
  }),
);
```

Rewrite the CourseLit baseline migration to create this schema directly. Do not
add alteration migrations for the discarded development schema.

## Phase 2 — Use SendLit's existing public contract

Treat SendLit as an immutable production dependency. The CourseLit adapter may
use only the currently documented public contact, tag, custom-field, segment,
broadcast, sequence, template, and reporting endpoints available to a
provisioned team credential.

- Create the minimal SendLit contact through the public contacts endpoint using
  email, name, and the CourseLit filter projection. Both supported account
  creation paths—learner signup and newsletter signup—constitute newsletter
  subscription, so the resulting SendLit contact is subscribed.
- Persist the returned SendLit contact ID on `school_accounts`. Public CourseLit
  APIs continue to expose only the CourseLit contact ID.
- Make CourseLit outbox processing idempotent. Before retrying a contact create
  whose response may have been lost, resolve the contact through the documented
  public contact-list/search endpoint, persist its ID, and continue. Email is a
  recovery lookup only; the stored contact ID is used after linking.
- A signup provisioning command ensures the resolved contact is subscribed and
  carries the complete current projection. Ordinary projection-repair jobs must
  never change subscription state; only learner signup, newsletter signup, or
  an explicit marketing mutation may subscribe or unsubscribe a contact.
- Mirror the CourseLit-owned name through the public contact endpoint. Read and
  write subscription state and tags directly through SendLit's public API; do
  not cache them in CourseLit.
- Do not require a new SendLit webhook, event stream, batch endpoint, external
  ID, or version field.
- Project only the CourseLit fields required by the seven supported filters into
  namespaced SendLit custom fields:
  - `courselit.productIds`: array of immutable product IDs represented by the
    production-compatible product-membership rule
  - `courselit.isCommunityMember`: boolean for active singleton-community access
  - `courselit.lastActive`: ISO 8601 UTC timestamp string of the school
    account's most recent authenticated learner activity, absent when no such
    activity exists
  - `courselit.signedUp`: immutable ISO 8601 UTC timestamp string of account
    creation
- Continue using SendLit's native email, subscription, and tag fields for the
  other three filters.
- Do not copy product names, membership objects, purchases, lesson progress, or
  community records into SendLit.
- Use SendLit's existing custom-field filters, saved segments, and
  broadcast/sequence filters. No new SendLit API capability is required.

CourseLit must never read or write SendLit tables, import SendLit implementation
modules, infer behavior from its workers, or rely on an undocumented endpoint.
If the existing public API cannot express a behavior, CourseLit must omit or
constrain that behavior rather than modify SendLit as part of this project.

The provisioned SendLit team is CourseLit-managed for contacts. Creating a
contact directly in SendLit is outside the supported CourseLit workflow and is
reported as a mapping inconsistency if encountered; it never back-creates a
CourseLit school account.

## Phase 3 — CourseLit filters, saved segments, and mail audiences

CourseLit owns the canonical operational values behind its filters. SendLit
receives only the small derived custom-field projection needed to execute the
admin Contacts list, previews, saved segments, and mail audiences through its
existing public filter APIs.

This projection is the complete V1 integration design for CourseLit-backed
audiences. Do not materialize segment membership, create one tag per segment,
or add audience-revision and sequence-enrollment machinery. SendLit evaluates
the saved filter over the projected contact fields when an audience is needed.

### Filter contract

Use one versioned CourseLit filter contract for the admin Contacts list, saved
segments, audience previews, REST, OpenAPI, and MCP. V1 ports the flat filter
model from the production `main` branch:

```ts
type ContactFilterSet = {
  version: 1;
  aggregator: "and" | "or";
  filters: ContactFilter[];
};

type ContactFilter =
  | {
      name: "email";
      condition: "Is exactly" | "Contains" | "Does not contain";
      value: string;
    }
  | {
      name: "product";
      condition: "Has" | "Does not have";
      value: string; // CourseLit product ID
      valueLabel?: string;
    }
  | {
      name: "community";
      condition: "Is a member" | "Is not a member";
    }
  | {
      name: "lastActive" | "signedUp";
      condition: "Before" | "After" | "On";
      value: string; // YYYY-MM-DD
    }
  | {
      name: "subscription";
      condition: "Subscribed" | "Not subscribed";
    }
  | {
      name: "tag";
      condition: "Has" | "Does not have";
      value: string;
    };
```

The production-derived V1 catalog is:

| Filter | Conditions | Value and evaluation |
| --- | --- | --- |
| Email | `Is exactly`, `Contains`, `Does not contain` | Canonical learner email; contains comparisons are case-insensitive. |
| Product | `Has`, `Does not have` | Immutable CourseLit product ID selected from the product catalog. Production matches existence of a product membership record rather than current access status. |
| Community | `Is a member`, `Is not a member` | Whether the learner has active access to the school's singleton community. Pending and rejected requests are not membership. No community selector or value is required. |
| Last active | `Before`, `After`, `On` | UTC calendar date applied to the school account's dedicated `last_active_at`; an account with no learner activity has no matching timestamp. |
| Signed up | `Before`, `After`, `On` | UTC calendar date applied to account `createdAt`. |
| Subscription | `Subscribed`, `Not subscribed` | Marketing subscription boolean. The condition carries the state; no separate value is required. |
| Tag | `Has`, `Does not have` | Exact tag selected from the available CRM tags. |

The production aggregation and composition rules are also V1 requirements:

- `or` is displayed as **Any**, is the default, and matches when at least one
  filter matches.
- `and` is displayed as **All** and matches only when every filter matches.
- The filter list is flat. V1 does not support nested groups or mixing `and`
  and `or` within one filter set.
- An empty filter list is **Everyone**, regardless of the stored aggregator.
- Multiple filters of the same category are allowed and are combined by the
  selected aggregate like every other condition.
- **Search by email** appends an Email / Contains filter and therefore uses the
  currently selected **Any** or **All** aggregate; it is not a separate query
  clause.
- Individual negative conditions provide exclusion. There is no separate
  top-level `not` aggregate in the production filter builder.
- `valueLabel` is display metadata used for product names. Product IDs, not
  labels, are persisted and evaluated.

Port the production semantics deliberately:

- Product filters retain production membership-row-existence semantics. Do not
  silently change Product to an active-entitlement check; a future
  current-access filter must be introduced as a separate condition.
- Community intentionally adapts production behavior to the singleton model:
  `Is a member` means active community access and `Is not a member` includes no
  membership, pending requests, and rejected requests.
- **Last active** maps to `school_accounts.last_active_at`. Successful learner
  login updates it immediately. Authenticated learner requests may advance it
  through a throttled activity touch so normal use remains visible without a
  database and SendLit write on every request. Profile edits and background
  administrative changes do not count as learner activity.
- Date comparisons use UTC day boundaries exactly as production does: `Before`
  is strictly earlier than the selected day's midnight, `After` is greater than
  or equal to that midnight, and `On` is the half-open interval from that
  midnight to the next day's midnight.
- Subscription and tag filters operate on SendLit's native current state.
- Drop the production Permission filter. The reimplementation has no learner
  permissions, and school-team permissions are an administrative authorization
  concern rather than a learner segmentation attribute.

Reject unknown names, conditions, missing values, invalid dates, cross-school
resource IDs, and over-limit filter counts. The production implementation used
display strings as condition values; V1 preserves them in this contract for
parity and centralizes them as shared constants rather than duplicating string
literals.

The list screen translates unsaved filters and passes them to SendLit's public
filtered-contact endpoint. Saving the current filter creates a saved segment
through SendLit's existing public API. When the segment is loaded in CourseLit,
the adapter reverses that translation into the CourseLit filter contract.
CourseLit never sends domain records or query logic to SendLit.

### Segment persistence

Do not add a `contact_segments` or `learner_segments` table. SendLit is the sole store for saved
marketing segments and already provides team-scoped create, list, get, update,
and delete endpoints. CourseLit accesses those endpoints with the school's
server-side team credential; that credential is never sent to the browser.

The CourseLit segment routes are an authorization and translation adapter. They
return the SendLit `segmentId` as an opaque `id`, without exposing SendLit
credentials or requiring clients to call SendLit directly. CourseLit validates
product IDs and other school-scoped values before creating or updating a
segment.

Do not add a local segment-membership table or evaluate saved filters against
CourseLit rows. For previews and member lists, pass the segment ID to SendLit's
public filtered-contact endpoint and map each returned contact ID through
`school_accounts.sendlit_contact_id`. The provisioned SendLit team is
CourseLit-managed. If an unmapped contact is encountered during listing or
previews, the adapter gracefully omits the unmapped record and enqueues a
high-priority diagnostic reconciliation job to repair the mapping (matching
by school and email); it does not brick the entire admin list request with a
hard 500 error. Hard rejection (`contact_mapping_inconsistent`) is strictly
reserved for mail campaign dispatch (`POST /broadcasts/start` and
`POST /sequences/start`), where audience delivery integrity must be absolute.
Filters that cannot be reverse-translated into the seven supported CourseLit
categories are never partially interpreted: list responses omit those segments
and report an `unsupportedCount`, while direct get, update, preview, or member
requests return an `unsupported_segment_filter` validation error.

### Filter projection and translation

Translate the seven CourseLit filters to SendLit's existing public contact
filter contract:

| CourseLit filter | SendLit filter source |
| --- | --- |
| Email | Native contact email |
| Product | `courselit.productIds` custom field using `has` or `not_has` |
| Community | `courselit.isCommunityMember` custom boolean using `is` with `true` or `false` |
| Last active | `courselit.lastActive` custom date using `before`, `after`, or `on` |
| Signed up | `courselit.signedUp` custom date using `before`, `after`, or `on` |
| Subscription | Native subscribed state |
| Tag | Native contact tags |

The wire translation is exact and reversible:

- Email maps `Is exactly`, `Contains`, and `Does not contain` to `is`,
  `contains`, and `not_contains`.
- Product maps `Has` and `Does not have` to a `customField` condition on
  `courselit.productIds` using `has` and `not_has` with the product ID.
- Community maps to a `customField` condition on `courselit.isCommunityMember`:
  `Is a member` maps to condition `is` with string value `"true"`.
  `Is not a member` maps to condition `is_not` with string value `"true"`
  (leveraging SendLit's native `not(exists(...))` evaluation to match all contacts
  who are not active community members, including those whose boolean flag has
  not yet been synced).
- Last active and Signed up convert the selected UTC date boundary to an
  ISO 8601 UTC timestamp string (`YYYY-MM-DDTHH:mm:ss.sssZ`) and use `before`,
  `after`, or `on` on the respective custom field. SendLit evaluates
  custom-field dates via `new Date(filter.value)`, which requires ISO 8601
  formatting rather than raw millisecond numeric strings.
- Subscription maps to SendLit's `subscription` / `is` condition with value
  `subscribed` or `unsubscribed`.
- Tag maps `Has` and `Does not have` to SendLit's native tag `is` and `is_not`
  conditions.

Map CourseLit `and` to SendLit `and` and CourseLit `or` to SendLit `or` without
rewriting the expression. An empty **Everyone** filter remains an empty SendLit
filter. Note that SendLit's public wire filter schema (`contactFilterSchema`)
strictly expects `{ aggregator: "and" | "or", filters: [...] }` without a
top-level `version` property. The forward translation adapter strips `version`
when submitting filters to SendLit (`POST /segments`, `PATCH /segments/:id`,
`GET /contacts?filter=...`), and the reverse translation adapter injects
`version: 1` when parsing SendLit filters back into CourseLit's `ContactFilterSet`.
Translation must be a pure shared function covered by contract tests and
used by segment saving, recipient previews, broadcasts, and sequences.

CourseLit synchronizes the four custom fields whenever their canonical source
changes. The outbox sends the complete current custom-field values through the
existing public contact-update endpoint, making retries naturally convergent.
Coalesce frequent `lastActive` updates so they do not generate an API request on
every learner action.

SendLit's public contact update replaces the contact's custom-field map. Before
writing, the adapter must read the latest contact through the public API, merge
the four `courselit.*` keys into that map, and write the merged map back. This
preserves custom fields owned by SendLit users or other integrations. Serialize
CourseLit projection writes per contact so two CourseLit jobs cannot overwrite
one another.

Custom fields are a derived projection only:

- CourseLit never reads them to authorize access or calculate learner state.
- CourseLit hides them from ordinary profile and contact-field editing UI.
- Values contain IDs, booleans, and timestamps only, never names or domain
  records.
- A rebuild worker can regenerate all four fields from CourseLit.

### Saving and editing segments

Saving, renaming, editing, listing, and deleting segments call SendLit's
existing public segment endpoints through the CourseLit adapter. There is no
local segment copy, synchronization status, retry table, or reconciliation
worker.

When a segment is selected for a broadcast or sequence, CourseLit fetches the
latest stored filter and copies it into the mail through SendLit's existing
public API. The mail therefore keeps its own filter snapshot; later segment
edits or deletion do not mutate an already configured draft, scheduled mail, or
active sequence.

### Broadcast and sequence audiences

Before starting a broadcast or sequence from a saved segment:

1. Fetch the latest segment filter from SendLit through its public API.
2. Ensure every contact-activated school account has a mapped SendLit contact
   and that no `sync_sendlit_contact` job for the school is pending, processing,
   or failed. This conservative V1 gate prevents a known-stale audience from
   sending.
3. Reverse-translate and validate the filter, then copy the SendLit filter into
   the broadcast or sequence through its existing public API.
4. Obtain the recipient count through SendLit's existing public filtered-contact
   endpoint.
5. Start or schedule the mail through the existing public API.

The mail editor shows SendLit's matching-contact count. Actual delivery can be
lower because SendLit applies current subscription, suppression, bounce, and
complaint eligibility when sending.

For sequences, the segment filter controls eligibility and the trigger remains
a separate SendLit concept. CourseLit exposes only trigger behavior already
documented by SendLit's current public API. This project does not add synthetic
event ingestion, `enrollExisting`, stop-on-exit, or repeat-enrollment machinery.

SendLit downtime does not block CourseLit learner, purchase, progress, or
membership edits. It does block saved-segment CRUD, recipient previews, and
mail operations because those are SendLit-owned marketing concerns.

## Phase 4 — Unified API contract

The management REST API consolidates under `/v1/contacts` and eliminates
"learner" terminology from administrative endpoints, DTOs, and permissions.
CourseLit `school_accounts` remain the aggregate root in the database, and
student-facing portal routes (e.g. `/v1/learner/me`, `/v1/learner/products`,
`/v1/learner/progress`) remain separate student experience surfaces.

Replace the separate learner and contact DTOs with one unified contact DTO:

```ts
type Contact = {
  id: string; // school account public ID (prefixed with 'cnt_')
  schoolId: string;
  email: string;
  name: string;
  bio: string;
  avatar: MediaRef | null;

  status: "active" | "deactivated" | "deletion_pending";
  registrationStatus: "newsletter_only" | "registered";

  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
  marketing: {
    subscribed: boolean;
    tags: string[];
  };
};

type ContactSegment = {
  id: string; // Opaque SendLit segment ID
  name: string;
  filter: ContactFilterSet;
  createdAt: string | null;
  updatedAt: string | null;
};
```

The top-level contact fields are read from CourseLit. `marketing` comes from the
live SendLit contact returned by the adapter; CourseLit does not persist a copy.
Purchases, memberships, progress, and other operational domains remain
CourseLit subresources and are never resolved through this marketing object.

### Route definitions and schemas

Use the CourseLit contact ID (school-account public ID prefixed with `cnt_`) in public routes:

- **`GET /v1/contacts`**
  - **Query**:
    - `q?: string` (search term matched against email or name)
    - `segmentId?: string` (saved segment filter)
    - `filter?: string` (serialized JSON of `ContactFilterSet`)
    - `page?: number` (1-based page number, default 1)
    - `rowsPerPage?: number` (page size, default 20)
  - **Response (200)**:
    ```ts
    {
      items: Contact[];
      total: number;
    }
    ```
  - **Pagination Note**: SendLit's public `listContacts` API uses `offset` as a
    1-based page index (`.offset((Math.max(offset, 1) - 1) * rowsPerPage)`).
    CourseLit passes `page` directly as SendLit's `offset`.

- **`GET /v1/contacts/:contactId`**
  - **Path**: `contactId: string`
  - **Response (200)**: `Contact`
  - **Error (404)**: `platformErrorSchema` (`contact_not_found`)

- **`PATCH /v1/contacts/:contactId`**
  - **Path**: `contactId: string`
  - **Body**:
    ```ts
    {
      name?: string;
      bio?: string;
      avatar?: MediaRef | null;
      status?: "active" | "deactivated"; // deletion_pending is rejected
    }
    ```
  - **Response (200)**: `Contact`
  - Email is immutable in V1 and rejected if provided. CourseLit commits these
    fields locally and mirrors `name` asynchronously via outbox.

- **`PATCH /v1/contacts/:contactId/marketing`**
  - **Path**: `contactId: string`
  - **Body**:
    ```ts
    {
      subscribed?: boolean;
      tags?: string[];
    }
    ```
  - **Response (200)**:
    ```ts
    {
      subscribed: boolean;
      tags: string[];
    }
    ```
  - Proxies the update synchronously to SendLit's `PATCH /contacts/:id` and
    returns confirmed state without mutating CourseLit profile or access data.

- **`DELETE /v1/contacts/:contactId`**
  - **Path**: `contactId: string`
  - **Response (200)**: `{ success: true }`
  - Validates permissions (`contacts:delete`), verifies the target is not a school
    owner, atomically sets `status = 'deletion_pending'`, revokes all active
    sessions, cancels active subscriptions, and enqueues the coordinated
    erasure workflow (`erase_sendlit_contact`). Returns success indicating
    erasure has been accepted and irreversibly initiated (Phase 9).

- **`POST /v1/contacts/filter-preview`**
  - **Body**:
    ```ts
    {
      filter: ContactFilterSet;
      page?: number;
      rowsPerPage?: number;
    }
    ```
  - **Response (200)**:
    ```ts
    {
      filter: ContactFilterSet;
      totalCount: number;
      contacts: Contact[];
    }
    ```

- **`GET /v1/contact-segments`**
  - **Response (200)**:
    ```ts
    {
      items: ContactSegment[];
      unsupportedCount: number;
    }
    ```
  - Lists segments from SendLit. Segments with filters that cannot be
    reverse-translated into CourseLit's 7 filter dimensions are omitted from
    `items` and increment `unsupportedCount`.

- **`POST /v1/contact-segments`**
  - **Body**:
    ```ts
    {
      name: string;
      filter: ContactFilterSet;
    }
    ```
  - **Response (201)**: `ContactSegment`

- **`GET /v1/contact-segments/:segmentId`**
  - **Response (200)**: `ContactSegment`
  - **Error (422)**: `unsupported_segment_filter` if filter cannot be reverse-translated.

- **`PATCH /v1/contact-segments/:segmentId`**
  - **Body**:
    ```ts
    {
      name?: string;
      filter?: ContactFilterSet;
    }
    ```
  - **Response (200)**: `ContactSegment`

- **`DELETE /v1/contact-segments/:segmentId`**
  - **Response (200)**: `{ success: true }`

- **`GET /v1/contact-segments/:segmentId/members`**
  - **Query**: `page?: number`, `rowsPerPage?: number`
  - **Response (200)**:
    ```ts
    {
      segment: ContactSegment;
      totalCount: number;
      contacts: Contact[];
    }
    ```

For the admin Contacts surface, `GET /v1/contacts` proxies SendLit's contact
search, translated filters, segment selection, totals, and pagination. It
batch-maps each returned `contactId` through `school_accounts.sendlit_contact_id`,
hydrates the CourseLit-owned fields, and returns only CourseLit contact IDs to
the client. It never joins by email. If an unmapped remote contact is returned by
SendLit, CourseLit omits it from the returned list and enqueues a background
reconciliation job to heal the mapping, preventing an administrative list crash.

Keep mutation ownership explicit:

- `PATCH /v1/contacts/:contactId` accepts only `name`, `bio`, `avatar`, and
  `status`. Email is immutable in V1. CourseLit commits these fields and mirrors
  name asynchronously.
- `PATCH /v1/contacts/:contactId/marketing` accepts only `subscribed` and
  `tags`, proxies the update synchronously to SendLit, and returns the confirmed
  contact state. It does not mutate CourseLit profile or access data.
- A client changing both areas submits two independent operations and displays
  each result independently; the API does not claim cross-service atomicity.

Remove:

- `/v1/learners` (admin endpoints)
- `/v1/school/contacts`
- `/v1/school/mails/subscribers`
- The current untyped `/v1/school/segments` proxy, replaced by the validated
  `/v1/contact-segments` adapter
- Public use of SendLit contact IDs
- `?learnerId=` query-string joins
- Browser-side email merging

## Phase 5 — Permission consolidation

Since contact and learner are unified under the `/v1/contacts` REST resource,
retire:

- `learners:read`
- `learners:write`
- `learners:delete`

Use:

- `contacts:read` to view the unified contact record, contact list, filter
  previews, and segment membership.
- `contacts:write` to update the CourseLit profile and account status, request
  CRM tag or subscription changes through the unified API, and create or edit
  saved contact segments.
- A sensitive `contacts:delete` permission for coordinated erasure.

Mail permissions remain separate because composing and sending campaigns is a
different capability:

- `mails:read`
- `mails:write`
- `mails:send`

`contacts:read` permits filter previews and viewing segment membership.
Starting a broadcast or sequence requires `mails:send` and no pending or failed
contact projections; it does not grant permission to edit the segment itself.

Update presets, delegation rules, operation policies, REST/OpenAPI/MCP
contracts, and the team-membership PRD together:

- **Permission configuration (`team-permissions.ts`)**:
  - Add `contacts:delete` to `COURSELIT_PERMISSIONS`, `OWNER_PERMISSIONS`, and `COURSELIT_HIGH_IMPACT_PERMISSIONS`.
  - Update `COURSELIT_PERMISSION_IMPLICATIONS` so `contacts:delete` implies `contacts:write` and `contacts:read`; and `contacts:write` implies `contacts:read`.
  - Replace `learners:read` with `contacts:read` in `MEMBER_PERMISSIONS`.

- **Active MCP tool implementations (`mcp.ts` & `mcp-parity.ts`)**:
  Implement these 6 tools as active tools in `apps/api/src/mcp.ts` and register
  them with `parity: "required"` in `packages/api-contract/src/mcp-parity.ts`,
  replacing the former `learners.*` exemptions:
  - `contacts.list` (risk: `"read"`, operation: `listContacts`)
  - `contacts.get` (risk: `"read"`, operation: `getContact`)
  - `contacts.update` (risk: `"write"`, operation: `updateContact`)
  - `contacts.marketing.update` (risk: `"write"`, operation: `updateContactMarketing`)
  - `contacts.delete` (risk: `"destructive"`, operation: `deleteContact`)
  - `contacts.segments.list` (risk: `"read"`, operation: `listContactSegments`)

## Phase 6 — Write and synchronization workflow

All product-facing writes go through the CourseLit API.

For CourseLit-owned learner fields and domains:

1. Validate and authorize the CourseLit contact ID.
2. Commit the canonical change to CourseLit in the owning domain transaction.
3. Enqueue an idempotent outbox event when the change has a CRM use case.
4. Return the committed CourseLit state without waiting for SendLit.
5. Have a worker create or update the minimal contact and its four derived
   custom fields through SendLit's public API.
6. Retry failures and expose CRM synchronization health without rolling back the
   CourseLit operation.

Profile edits, purchases, paid-subscription lifecycle changes, progress, and
community activity remain in CourseLit. Every domain transaction that can
change the learner's name, qualifying product-membership set, active community
membership, `last_active_at`, or account creation time must enqueue a contact
projection update in that same transaction. The worker recomputes and sends the
complete current projection; no lifecycle handler edits a copied array or calls
SendLit during the originating product transaction.

Use one shared `queueSendLitContactSync(tx, schoolAccountId, reason)` domain
helper from all owning services. The reason is diagnostic metadata, not an
instruction for applying a delta. The worker always derives:

- `courselit.productIds` from the same canonical membership-row-existence
  predicate used by the Product filter;
- `courselit.isCommunityMember` from current active singleton-community access;
- `courselit.lastActive` from `school_accounts.last_active_at`; and
- `courselit.signedUp` from the school account creation timestamp.

The following lifecycle coverage is mandatory:

| CourseLit lifecycle | Required projection behavior |
| --- | --- |
| Learner or newsletter signup | Create/reuse the CourseLit user and school account, activate the contact, enqueue the full projection, and carry `ensureSubscribed: true`. |
| Learner profile name change | Enqueue the full projection so the contact name is mirrored. Bio and avatar remain CourseLit-only and do not require CRM synchronization. |
| Successful learner login | Advance `last_active_at` and enqueue the full projection; never alter newsletter subscription state. |
| Authenticated learner activity | Advance `last_active_at` and enqueue at most once per configured throttle window. Progress, lesson, download, and community actions use this shared touch rather than bespoke CRM calls. |
| Successful product checkout, free acquisition, manual grant, invitation flow that creates a product membership | Enqueue after the canonical membership is committed so the product ID is present. Pending or failed checkout and an invitation that has not created membership do not qualify. |
| Product membership removal, learner removal from a product, or deletion of the final qualifying membership | Enqueue after the canonical removal so the product ID disappears. |
| Included-product grant or revocation | Enqueue every affected school account after membership reconciliation. |
| Product deletion or another bulk operation affecting memberships | Enqueue affected school accounts in bounded batches; each job still recomputes the complete per-account projection. |
| Successful community checkout, manual grant, invitation acceptance, join-request approval that activates membership | Enqueue after active membership is committed so `isCommunityMember` becomes true. |
| Community rejection, removal, expiration, cancellation, or deletion that ends active membership | Enqueue after the canonical state change so `isCommunityMember` becomes false when no active membership remains. |
| Payment webhook or reconciliation that creates, restores, revokes, or removes qualifying membership | Enqueue in the same transaction as the resulting membership change. A payment-state change with no membership/filter effect needs no job. |

Invitation services must follow the canonical effect rather than the label of
the command: if sending or accepting an invitation creates membership, that
transaction enqueues synchronization; a merely pending invitation does not add
the learner to `productIds` or mark community membership active. Likewise,
checkout handlers enqueue only after success has produced the canonical
membership. This keeps the projection aligned with CourseLit state even when
the lifecycle is completed asynchronously by a payment webhook.

Bulk fan-out must be durable and resumable. Product/community deletion and
reconciliation jobs page through affected school-account IDs in cursor-paginated
chunks of 500 accounts (`WHERE school_account_id > $cursor ORDER BY school_account_id ASC LIMIT 500`)
across separate short transactions and call the shared coalescing helper; they
must not issue direct SendLit updates, enqueue unbounded batches, or hold a single
transaction open across all accounts.

All membership and activity mutations must pass through their owning domain
service or an equally guarded reconciliation service. API routes, webhook
handlers, scheduled jobs, and admin actions must not write qualifying
membership state directly and bypass projection enqueueing. Treat the lifecycle
matrix above as part of each service contract and test it at the transaction
boundary.

Before implementation, inventory every CourseLit write path for
`school_accounts`, `learner_memberships`, product/community deletion,
included-product reconciliation, checkout completion, payment webhooks, and
learner sessions. Each path must either call the shared synchronization helper
because it can change a projected value or have a test proving why it cannot.

Keep one coalesced `sync_sendlit_contact` outbox job per school account. Its
payload contains the internal school-account ID and an optional
`ensureSubscribed` intent used only by learner or newsletter signup. The worker
always reloads current CourseLit state instead of trusting copied profile or
membership data in the payload. A later domain change resets the same job to
`pending`; it does not append an unbounded job stream. Store an integer revision
on the job, increment it when coalescing, and let a worker mark the job `done`
only if the claimed revision is still current; otherwise it remains `pending`.
The rewritten baseline adds the revision column and a unique expression index
over school, provider, job type, and payload `schoolAccountId` for this job type.
Coalescing preserves `ensureSubscribed: true` until a successful run consumes
that intent; a projection-only update cannot clear pending signup consent.

When processing a `sync_sendlit_contact` job:

- **Concurrency & serialization**: To protect the PostgreSQL connection pool
  from exhaustion during remote HTTP round-trips to SendLit (which can take
  several seconds under network load), workers must NOT hold an open database write
  transaction with `SELECT ... FOR UPDATE` across external HTTP requests. Instead,
  workers must serialize execution per contact using a PostgreSQL advisory lock
  (`pg_try_advisory_lock` with a 64-bit integer hash of `schoolAccountId`) or
  job-level worker lease locking, releasing database connections during remote
  HTTP requests.
- **In-flight deletion guard**: Before making any remote SendLit API calls,
  the worker must inspect `school_accounts.status`. If `status === 'deletion_pending'`
  (or the account has already been deleted), the worker must abort execution
  immediately and mark the job `done` or remove it, ensuring an in-flight sync
  never re-creates or mutates an account undergoing erasure.
- **Plan limit / quota error handling (HTTP 402 / 403)**: SendLit enforces
  subscribed contact quotas via team-scoped plan limits. If SendLit rejects contact
  creation or update with HTTP 402 or 403 (`plan_limit_exceeded`), the worker must
  mark the job `failed` and record `last_error = 'sendlit_quota_exceeded'`. The worker
  must NOT repeatedly retry with exponential backoff on quota rejections,
  preventing outbox thrashing. This failure state is surfaced in the admin Contacts
  overview so school administrators know their CRM contact quota has been reached.
  Once the school upgrades their plan or cleans up contacts, manual retry or the
  reconciliation worker will re-enqueue the job.

### Target Drizzle schema: `integration_outbox_jobs` & coalescing index

```ts
import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools.js";

export type IntegrationProvider = "frontlit" | "sendlit" | "medialit";
export type IntegrationJobType =
  | "provision_frontlit"
  | "provision_sendlit"
  | "provision_sales_page"
  | "sync_sendlit_contact"
  | "erase_sendlit_contact";
export type IntegrationJobStatus = "pending" | "processing" | "done" | "failed";

export type SyncSendLitContactPayload = {
  schoolAccountId: string;
  ensureSubscribed?: boolean;
  reason?: string;
};

export type EraseSendLitContactPayload = {
  schoolAccountId: string;
  sendlitContactId?: string;
};

export const integrationOutboxJobs = pgTable(
  "integration_outbox_jobs",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    provider: text("provider").$type<IntegrationProvider>().notNull(),
    type: text("type").$type<IntegrationJobType>().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").$type<IntegrationJobStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    revision: integer("revision").notNull().default(1),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    provisionIdentity: uniqueIndex("integration_outbox_jobs_provision_uidx")
      .on(table.schoolId, table.provider, table.type)
      .where(sql`type IN ('provision_frontlit', 'provision_sendlit')`),
    salesPageIdentity: uniqueIndex("integration_outbox_jobs_sales_page_uidx")
      .on(
        table.schoolId,
        sql`(${table.payload}->>'resourceType')`,
        sql`(${table.payload}->>'resourceId')`,
      )
      .where(sql`type = 'provision_sales_page'`),
    contactSyncCoalesce: uniqueIndex("integration_outbox_jobs_contact_sync_uidx")
      .on(
        table.schoolId,
        table.provider,
        table.type,
        sql`(${table.payload}->>'schoolAccountId')`,
      )
      .where(sql`status = 'pending' AND type = 'sync_sendlit_contact'`),
    pending: index("integration_outbox_jobs_pending_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
  }),
);
```

For mutable SendLit-owned marketing fields such as subscription state and CRM
tags:

1. Validate and authorize the CourseLit contact ID.
2. Resolve the stored SendLit contact ID.
3. Call SendLit's public API synchronously and return its confirmed response.
4. If SendLit is unavailable, fail the CRM mutation without changing CourseLit
   state; the user may retry.

SendLit reads must never mutate CourseLit purchases, access, progress, learner
profile, or community records. Authentication, checkout, progress, learner
profile reads, and content access must continue working while SendLit is
unavailable. Only the admin Contacts, segments, and mail surfaces depend on
SendLit availability.

## Phase 7 — Creation and registration flows

CourseLit does not support direct contact creation, CSV contact imports, or a
SendLit-to-CourseLit creation flow. The only V1 entry points are learner signup
and the public newsletter signup block, and both create or reuse the CourseLit
school account before provisioning the SendLit contact.

Authentication in CourseLit is exclusively OTP-based (there are no passwords or
traditional registration forms). Creating a canonical `user` record during
newsletter signup is intentional: when a visitor later authenticates via OTP to
access products or community, verifying the one-time code proves email ownership,
seamlessly activating their existing school account and linking their user
identity without credential collisions or password-reset barriers.

### Newsletter signup

1. Normalize the submitted email and find or create the canonical CourseLit
   user identity. Creating this identity does not by itself establish a learner
   session or mark the school account as learner-registered.
2. Find or create the school account with the required `user_id`, submitted
   email, a display name derived from an optional submitted name or the email
   local part, empty bio, no avatar, active status, and null
   `learner_registered_at`.
3. Reject an account already in `deletion_pending`.
4. Set `contact_activated_at` if absent and enqueue idempotent contact
   provisioning with newsletter subscription enabled in the same transaction.
5. If the mapped contact already exists but is unsubscribed, enqueue
   re-subscription because this submission is affirmative consent.
6. Preserve an existing account's learner access status; newsletter signup does
   not reactivate a deactivated learner.
7. Return success without requiring SendLit to be available.

### Learner signup

Here, signup means first-time school registration or registration of an
existing newsletter-only school account. A later login to an already registered
account must not change newsletter subscription state.

1. Normalize the verified email and find or create the canonical CourseLit user
   identity, then find or create the school account with its required
   `user_id`.
2. Reuse a newsletter-created school account linked to that identity and set
   `learner_registered_at` and `last_active_at` once authentication has been
   verified and the learner session is issued. If the normalized school email
   resolves to a different user identity, fail closed and require account
   recovery; never reassign the school account or create a duplicate for that
   person.
3. Reject registration for a `deactivated` or `deletion_pending` account; only
   an authorized administrator may restore learner access.
4. Treat learner signup as newsletter subscription, set `contact_activated_at`
   if absent, and enqueue idempotent SendLit contact provisioning or
   re-subscription in the same transaction.
5. Do not make registration depend on SendLit availability.
6. Persist the returned SendLit contact ID on `school_accounts` when
   provisioning succeeds.

### Learner login and activity

Successful login must update `school_accounts.last_active_at` and enqueue the
coalesced projection job. This activity update must not carry
`ensureSubscribed`, re-subscribe the contact, or otherwise change marketing
consent.

Authenticated learner requests use one centralized activity-touch service. It
updates `last_active_at` only when the previous value is older than the
configured throttle window (15 minutes by default), and enqueues synchronization
only when the timestamp advances. This covers meaningful use such as viewing a
lesson, recording progress, downloading learner content, and participating in
the community without coupling each domain service directly to SendLit. Admin,
worker, webhook, and anonymous requests do not advance learner activity.

Enforce one normalized email per school in the CourseLit schema so registration
cannot encounter multiple candidate school accounts. Email is used only for the
school-local registration lookup; the resulting contact ID is the permanent
identity used by every integration.

## Phase 8 — Admin and learner UI

Replace the browser-side merge in `apps/admin/app/contacts/page.tsx` with one
call to `/v1/contacts`.

- Keep the user-facing **Contacts** label if desired.
- Source the list, search, filters, totals, segments, and pagination from
  SendLit through the CourseLit API adapter.
- Use contact IDs (school-account public IDs) in list and detail URLs.
- Load one DTO (`Contact`) on the detail screen, but submit CourseLit-owned
  profile/account changes separately from SendLit-owned marketing changes.
- Show registration, account, and subscription states separately.
- Make the learner account page read and update the canonical CourseLit learner
  profile. It must not look up or update a SendLit contact by email.
- Keep marketing preferences visually and contractually separate from profile,
  access, purchase, and progress data even when shown on the same screen.
- Build the contact-list filter UI from the CourseLit filter contract. Product
  options come from the CourseLit product catalog, while Community is a simple
  member/not-member choice with no selector. SendLit is not queried for either.
- Allow the active filter to be named and saved to SendLit through the
  CourseLit segment adapter.
- Show saved segments in the contact list and mail audience picker.
- In the mail editor, show SendLit's matching-contact count and any outstanding
  CourseLit-to-SendLit projection failures. Disable scheduling or starting
  while any contact projection is pending or failed.
- Treat **Everyone** as an empty SendLit filter. SendLit still applies
  subscription, suppression, bounce, and complaint eligibility before sending.

## Phase 9 — Deletion semantics

Distinguish unsubscribe, deactivation, and deletion:

- Unsubscribe: `PATCH marketing.subscribed: false` via `PATCH /v1/contacts/:contactId/marketing`.
- Deactivate account: `PATCH status: "deactivated"` via `PATCH /v1/contacts/:contactId`.
- Delete contact: coordinated `DELETE /v1/contacts/:contactId`.

The delete operation executes in two coordinated stages:

### 1. Synchronous acceptance (`DELETE /v1/contacts/:contactId`)
- Reject deletion of a school owner until ownership has been transferred.
- In a single canonical database transaction:
  1. Atomically update `school_accounts.status` to `deletion_pending`.
  2. Revoke all active learner and staff sessions linked to this school account.
  3. Cancel any active storefront or community recurring subscriptions.
  4. Enqueue one idempotent `erase_sendlit_contact` job in `integration_outbox_jobs`.
  5. Delete any pending `sync_sendlit_contact` job for this account to guarantee no in-flight sync recreates CRM state.
- Return `200 { success: true }`. The account is now sealed and inaccessible to all user and learner flows.

### 2. Asynchronous erasure worker (`erase_sendlit_contact`)
- The outbox worker picks up the `erase_sendlit_contact` job:
  1. If `school_accounts.sendlit_contact_id` is present, call SendLit's public `DELETE /contacts/:id`. A 404 or missing remote contact is treated as success.
  2. Delete learner memberships, purchases, invoices, payments, progress, evaluations, certificates, community interactions, notifications, profile, and non-owner staff memberships through explicit domain cleanup.
  3. Reconcile and purge avatar media references if no other resource references that asset.
  4. Delete the `school_accounts` row permanently.
  5. Mark the `erase_sendlit_contact` job `done` and record a non-PII audit event of completed erasure.

If remote SendLit deletion or dependent cleanup fails, the account remains sealed in `deletion_pending` with its mapped contact ID, and the worker retries with exponential backoff. The `school_accounts` row and mapping are never deleted until every external and dependent cleanup step succeeds.

## Phase 10 — Destructive rebuild and clean-install validation

The old development data is intentionally discarded. Do not write a backfill,
record matcher, legacy reader, or transitional synchronization job.

### Pre-rebuild gate

Before destroying the current environment:

1. Finish the CourseLit schema rewrite. Do not change SendLit.
2. Remove the old subscriber services, contact DTOs, compatibility routes,
   browser-side merges, duplicate permissions, and obsolete CourseLit
   integration code.
3. Regenerate and verify CourseLit OpenAPI clients and MCP contracts.
4. Run type checking, unit tests, contract tests, and integration tests against
   disposable CourseLit databases initialized from the rewritten migrations and
   a mock of SendLit's existing public API.
5. Record the exact project-specific processes, containers, volumes, and seed
   commands that belong to the local CourseLit environment.

### Teardown

1. Stop the CourseLit admin, learners, API, workers, and related development
   processes. Do not stop SendLit.
2. Remove only the identified CourseLit containers and their database volumes.
3. Remove stale generated clients and build artifacts when they can retain an
   old contract.
4. Confirm that no old CourseLit database remains reachable and that no SendLit
   resource was changed or removed.

The teardown commands must resolve explicit project resources. They must not
use broad container, volume, or filesystem deletion commands.

### Rebuild

1. Rebuild and recreate the CourseLit supporting containers.
2. Apply the rewritten CourseLit baseline migration to an empty database.
3. Run the normal CourseLit seed flow to create the development account, school,
   learner, integration credentials, and required catalog data.
4. Provision a fresh isolated SendLit development/test team through the existing
   public provisioning flow and configure the rebuilt school with that team
   credential. Do not reuse a team containing contacts from the discarded
   CourseLit database, and do not reset or delete the old SendLit team.
5. Start the CourseLit API and workers before starting the admin and learners
   apps.
6. Verify that CourseLit startup succeeds without fallback columns, compatibility flags,
   or data repair scripts.

### Clean-install validation

Validate the system entirely through final V1 surfaces:

1. Submit the newsletter block and verify that CourseLit creates or reuses a
   canonical user identity, then creates a school account with a non-null
   `user_id`, before any SendLit contact is provisioned.
2. Verify through SendLit's public API that the outbox creates one subscribed
   contact, stores its contact ID on the school account, and does not create a
   duplicate when retried.
3. Register a learner with the same email and verify that the existing user,
   school account, and SendLit contact are reused and `learner_registered_at`
   is set.
4. Register a learner with a new email and verify that CourseLit creates the
   canonical user and required school account before provisioning one
   subscribed SendLit contact.
5. Edit name, bio, and avatar with SendLit unavailable and verify that the
   CourseLit profile remains usable and the CRM sync later recovers.
6. Exercise successful checkout, free acquisition, product/community
   invitations and grants, included-product access, removals, cancellation,
   deletion, login, and authenticated learner activity. Verify each canonical
   CourseLit state first and then verify the recomputed SendLit product array,
   community flag, and activity timestamp through the public contact API.
7. Change subscription state and tags and verify the next Contacts API read
   returns the confirmed SendLit state without a CourseLit cache.
8. Save a `Product has Discussion 2` filter through the CourseLit adapter,
   retrieve the resulting segment through SendLit's public API, verify its
   Contacts preview, and confirm that the public filtered-contact API returns
   the expected rows and count.
9. Start a broadcast and a sequence using the translated filter and verify the
   existing public API responses and recipient counts.
10. Verify contact listing, filtering, pagination, permissions, and
   cross-school isolation without browser-side joins.
11. Delete a contact and verify commerce cancellation, CourseLit retention
   behavior, session invalidation, media cleanup, SendLit cleanup, and audit
   records.
12. Restart the CourseLit environment and verify that migrations, seeds, and
   integration delivery remain deterministic and idempotent without restarting
   or modifying SendLit.

The rebuild is complete only when a database created from zero passes these
checks. The previous development database is not an accepted test fixture.

## Testing and release gates

- Contract tests cover the unified contact response and every mutation.
- Permission tests prove that contact read, write, and delete permissions
  (`contacts:read`, `contacts:write`, `contacts:delete`) are enforced
  consistently across REST, OpenAPI, MCP, and the admin UI.
- Identity and prefix tests prove that every school account has a non-null `user_id`,
  receives a `cnt_` prefixed public ID (retiring legacy `lrn_`), a newsletter signup creates/reuses
  the identity and school account before the SendLit contact, learner registration reuses
  that pair, and duplicate emails and cross-school identities fail safely.
- Ownership tests prove that learner-facing profile, purchase, membership,
  entitlement, and progress reads never depend on SendLit; only admin CRM
  surfaces do.
- Synchronization tests cover idempotent contact creation, complete custom-field
  projection updates, coalesced activity timestamps, retries, SendLit downtime,
  missing remote contacts, mapping repair, and reconciliation.
- Lifecycle synchronization tests cover successful and failed checkout,
  product and community invitation/grant/approval, included-product changes,
  membership removal, cancellation, product/community deletion, payment
  webhooks, successful login, throttled authenticated activity, and bulk fan-out.
  Every qualifying canonical mutation must enqueue the shared coalesced sync;
  every non-qualifying transition must leave the projection unchanged.
- Filter parity tests cover all seven V1 categories, every supported condition,
  `Any`/`or`, `All`/`and`, default `or`, empty **Everyone**, repeated categories,
  email-search composition, UTC date boundaries, product membership-row
  existence, active/pending/rejected singleton-community states, native SendLit
  subscription and tags, stable-ID references, and cross-school isolation.
- Segment tests prove that save, list, get, rename, edit, and delete use only
  SendLit's public segment API, while Contacts previews and recipient counts use
  the same stored SendLit filter and shared translation functions.
- Public integration contract tests mock only documented SendLit HTTP APIs and
  prove that CourseLit never imports SendLit implementation modules or accesses
  its database.
- Audience tests cover pending contact projections, count differences caused by
  subscription and suppression, stale-send blocking, and filter-snapshot
  behavior after a selected segment is renamed, edited, or deleted.
- Mail tests cover translated broadcast and sequence filters and only the
  trigger behavior documented by SendLit's existing public API.
- Schema tests create an empty CourseLit database from the rewritten baseline
  migration. SendLit schema and migration testing is explicitly out of scope.
- Pagination and filtering tests prove that no records are skipped or duplicated.
- Consent tests prove that both learner signup and newsletter signup create or
  restore a subscribed SendLit contact, while a later login never re-subscribes
  an existing learner.
- Deletion tests cover subscription cancellation, sessions, memberships,
  progress, community data, media, SendLit cleanup, retry ordering, owner
  protection, and non-PII audit events.
- UI tests prove that no public route or browser state depends on a SendLit
  contact ID.
- Failure tests prove that SendLit downtime does not prevent profile changes,
  registration, checkout, progress, or access evaluation.

## Acceptance criteria

- There is exactly one CourseLit school-account ID per school person, with its public ID
  consistently prefixed with `cnt_` (`CONTACT_PUBLIC_ID_PREFIX = "cnt"`). The legacy `lrn`
  prefix is fully retired across API routes, domain services, seeders, and tests.
- Every school account has a non-null canonical CourseLit `user_id`; newsletter
  signup never creates an orphan school account or a SendLit-only person.
- Every account with `contact_activated_at` eventually has exactly one mapped
  SendLit contact, and a SendLit contact never creates a CourseLit account.
- CourseLit exposes no direct contact-creation or CSV-import surface; learner
  signup and newsletter signup are the only contact-activation paths.
- The admin application consumes the unified `/v1/contacts` API and does not
  expose "learner" terminology in management routes.
- CourseLit is authoritative for contact identity, profile, commerce,
  memberships, entitlements, progress, and community activity.
- CourseLit is authoritative for the filter contract and canonical operational
  values. SendLit is authoritative for contact-list evaluation and persisted
  saved segments.
- The V1 filter builder supports the seven applicable production-derived
  categories, flat `Any`/`All` aggregation, and **Everyone** behavior. It drops
  Permission and adapts Community to the singleton school community.
- SendLit is authoritative only for CRM concerns such as marketing consent,
  suppression, campaigns, delivery, CRM tags, saved marketing segments, and
  synchronized mail-audience state.
- Runtime joins never depend on email.
- SendLit contact IDs are never exposed as public CourseLit resource IDs.
- The admin Contacts list, search, filtering, segments, totals, and pagination
  proxy SendLit's public API and map results to CourseLit contact IDs without an
  email join.
- Learner signup and newsletter signup both imply newsletter subscription and
  create or restore a subscribed SendLit contact; ordinary learner login does
  not change subscription state, but it does advance and synchronize
  `last_active_at`.
- Every CourseLit lifecycle that can change the product-membership set, active
  community membership, mirrored name, or learner activity timestamp enqueues
  the shared coalesced projection job in the canonical transaction. The worker
  always recomputes all four custom fields from current CourseLit state.
- SendLit outages do not block authentication, checkout, progress, or content
  access, and do not prevent CourseLit profile updates.
- SendLit receives only minimal contact data and the four explicitly defined
  CourseLit custom fields.
- The SendLit custom-field projection is disposable and can be rebuilt from
  CourseLit without changing learner behavior.
- Saved segments affect recipients only through SendLit's existing documented
  contact, custom-field, segment, broadcast, and sequence APIs.
- A mail cannot start while any school contact projection is pending or failed,
  and the UI shows SendLit's matching-contact count.
- The `Product has Discussion 2` case uses `courselit.productIds` containing the
  product ID and does not copy product names or records into SendLit.
- CRM synchronization failures are visible and recoverable.
- CourseLit stores the nullable unique SendLit contact ID directly on
  `school_accounts`; it has no contact-mapping or marketing-cache table.
- The old contact and subscriber API surfaces and duplicate permissions are
  removed.
- CourseLit has no `contact_segments` or segment-membership table; segment CRUD
  uses SendLit's existing public API through a server-side `/v1/contact-segments`
  adapter.
- No backfill, compatibility route, dual-write path, or incremental migration
  for the discarded development model remains in the final implementation.
- An empty CourseLit database can be migrated, seeded, started, and validated
  using the normal development workflow without resetting SendLit.
- Implementation requires no change to the SendLit repository, schema,
  migrations, public API, workers, containers, or production data.
- All six administrative contact operations (`contacts.list`, `contacts.get`,
  `contacts.update`, `contacts.marketing.update`, `contacts.delete`,
  `contacts.segments.list`) are active MCP tools conforming to `mcpParityManifest`
  with `parity: "required"`.
- Coordinated deletion handles both CourseLit and SendLit data with the required
  cancellation, retry, erasure, owner-protection, and non-PII audit behavior across
  synchronous acceptance (`status = 'deletion_pending'`) and asynchronous worker purge.
