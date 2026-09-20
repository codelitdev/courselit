# PRD: School team memberships and permissions

**Status:** Proposed for implementation

**Scope:** CourseLit API, admin application, learner application, school team
membership lifecycle, permission enforcement, invitations, ownership, API keys,
OAuth, notifications, and authorization auditing

**Last updated:** 2026-09-20

## Executive summary

CourseLit will model administrative access as a school-scoped **staff
membership** attached to a `school_account`. A staff membership contains an
explicit set of permissions. Ownership is a special property of exactly one
staff membership; it is not a role string and it is not inferred from an email
address, a global CourseLit account, or learner access.

The same person may simultaneously be:

- the owner of one school;
- a content manager in another school;
- a community moderator in a third school; and
- an ordinary learner in any of those schools.

Those relationships remain independent:

```text
CourseLit account (global authenticated person)
    |
    +-- School account: School A
    |      +-- Staff membership: owner
    |      +-- Learner memberships: Product 1, Community
    |
    +-- School account: School B
           +-- Staff membership: community manager
           +-- No learner memberships
```

Staff permissions authorize administration. `learner_memberships` remains the
sole source of ordinary product, course, download, and community access. A
staff permission must never silently create an enrollment, progress record,
community membership, purchase, subscription, or certificate entitlement.

CourseLit already has a partial implementation: permission constants and
presets, an `isOwner` flag, invitations, member permission editing and removal,
and a Team settings UI. This PRD turns those pieces into one coherent V1. It
adds an enforced ownership invariant, a complete school-specific permission
catalog, centralized fail-closed authorization, hardened invitation and member
lifecycle operations, scoped credential behavior, and an explicit learner-app
contract.

The design is informed by FrontLit's team-membership implementation, but the
CourseLit model differs in one important respect: a school has both an admin
surface and a learner surface. The authorization model therefore distinguishes
staff authority, learner entitlement, and the small number of explicit
moderation or preview exceptions.

## Problem

The current team implementation is useful but incomplete:

- `memberships` points both to a global user and a school account, allowing the
  two identities to drift.
- `role` and a broad `school:admin` permission still behave like authorization
  shortcuts.
- the database permits multiple owner rows and has no ownership-transfer
  operation;
- member APIs expose global user IDs rather than school-scoped membership IDs;
- authorization is distributed across route handlers as repeated permission
  checks instead of being described by one operation policy;
- permission changes have no optimistic concurrency protection;
- personal API keys can outlive the staff membership that authorized them;
- OAuth authority is not explicitly intersected with current school
  membership authority;
- invitation resend is implemented as UI behavior rather than a first-class,
  rate-limited lifecycle operation;
- staff profile rendering reads global user fields instead of the school-local
  profile;
- the learner app has no canonical server-derived representation of the
  viewer's staff capabilities; and
- there is no documented rule for when staff permissions may affect learner
  pages, feeds, notifications, previews, or moderation controls.

Without a complete model, future LMS, community, commerce, and learner-portal
features will either over-authorize broad administrators or accumulate
inconsistent permission checks.

## Goals

- Give every school exactly one owner staff membership.
- Support school-scoped staff invitations, permission changes, removal,
  leaving, and ownership transfer.
- Define stable CourseLit permissions for team management, LMS content,
  learners, community and spaces, commerce, website, communications, media,
  reporting, integrations, and school settings.
- Treat permission presets as UI conveniences that expand to explicit grants,
  not as persisted authorization roles.
- Enforce permissions on the server through one typed, fail-closed operation
  policy.
- Prevent a member from inviting or granting authority the member does not
  currently possess.
- Make browser sessions, OAuth grants, and personal API keys obey the same live
  school-membership ceiling.
- Revoke membership-bound credentials when a staff membership ends.
- Use `school_account` as the school-local actor and display identity.
- Keep staff membership and learner membership independent.
- Define the limited and auditable ways staff permissions affect the learner
  app.
- Make admin-only notification preferences school-scoped and capability-aware.
- Record security-relevant team and permission changes in an authorization
  audit log.
- Provide deterministic tests for tenant isolation, lifecycle races,
  credential attenuation, and learner/staff separation.

## Non-goals

- Staff membership will not replace `learner_memberships`.
- Staff members will not automatically receive products, courses, downloads,
  community plans, spaces, progress, or certificates.
- V1 will not provide learner impersonation or "log in as learner."
- V1 will not introduce reusable custom roles. Presets copy a permission set
  into a membership; they are not live roles.
- V1 will not support multiple owners or owner percentages.
- V1 will not support domain-wide automatic staff provisioning, SCIM, SAML,
  or enterprise identity groups.
- V1 will not add school-owned service principals. Existing personal API keys
  remain membership-bound; a separate service-account design can follow.
- V1 will not allow team lifecycle operations through OAuth or API keys.
- The externally documented CourseLit REST API and MCP server will not expose
  learner, public storefront, checkout, consumption, progress, or
  community-participation capabilities. Both are administrative surfaces.
  Learner and public websites use separate application endpoints even when
  those endpoints are deployed by the same API service.
- V1 will not preserve the broad `school:admin` authorization bypass for
  compatibility. This rewrite has no production deployment, so the baseline
  can be corrected directly.

## Related documents

- [`teachable-style-identity-management.md`](./teachable-style-identity-management.md)
  defines the global account, school account, staff membership, and learner
  membership relationship.
- [`one-community-per-school.md`](./one-community-per-school.md) defines spaces,
  community access, learner memberships, and staff moderation behavior.
- FrontLit's `apps/api/docs/team-memberships.md` in the sibling FrontLit
  repository is the reference implementation for ownership, delegation,
  invitation security, and fail-closed operation policies.

Where an older document grants access through `school:admin`, this PRD takes
precedence once its permission migration begins. Those references must be
replaced by owner authority or the specific scoped permission in the same
delivery.

## Terminology

### CourseLit account

The global Better Auth `user` representing one authenticated human. It owns
login methods and a canonical verified email. It grants no school authority by
itself.

### School account

The person's profile and actor identity inside one school. It contains the
school-local display name, avatar, contact email, and account status. Domain
content and school-visible activity refer to this identity.

### Staff membership

A relationship between a school account and a school that grants
administrative permissions. The row's existence means the person is an active
team member. Removing it ends staff authority without removing the school
account or learner access.

### Owner

The single staff membership whose `is_owner` value is true. The owner has all
current and future CourseLit permissions implicitly and may perform a small
set of owner-only operations.

### Learner membership

A relationship granting access to one product or the school's community.
Learner memberships, not staff permissions, authorize ordinary consumption,
progress, checkout entitlements, and community access.

### Permission

A stable, machine-readable school-scoped capability such as
`products:write` or `communities:moderate`.

### Direct grant

A permission explicitly stored on a non-owner staff membership.

### Effective permission

A direct grant plus all permissions implied by that grant. For example,
`products:delete` implies `products:write` and `products:read`.

### Preset

A dashboard template such as Full access, Content manager, or Community
manager. Selecting a preset writes explicit permissions. The preset name is
not consulted during authorization.

### Credential ceiling

The maximum authority available to a request after intersecting the current
staff membership with an OAuth grant or personal API key grant.

## Product principles

### Ownership is a relationship, not a role

`is_owner` on the staff membership is the canonical ownership fact. The owner
does not depend on a stored `owner` role, a copied permission snapshot, or a
particular email address.

Exactly one owner must exist for every non-deleted school. Owner permission
checks use the current permission catalog, so a newly introduced permission is
available to owners without rewriting existing owner rows.

The owner membership cannot be edited or removed through ordinary member
operations. The owner must transfer ownership before leaving. School deletion
deletes the school and its memberships as one operation.

### Permissions are school-scoped

Authority in School A grants no authority in School B. Every protected request
resolves the school server-side and loads a staff membership for the same
school account and global user.

### Staff authority and learner entitlement are independent

```text
Admin operation
    = authenticated CourseLit account
    + active school account
    + active staff membership
    + required effective permission

Learner operation
    = authenticated CourseLit account
    + active school account
    + active learner membership or public access rule

Explicit staff moderation operation
    = authenticated CourseLit account
    + active school account
    + active staff membership
    + communities:moderate
```

An owner who has never joined or purchased the community is not an ordinary
community member. An ordinary learner with community moderator access is not a
school staff member. Services must not turn one relationship into the other.

### REST and MCP are administrative surfaces

CourseLit's externally documented REST API and MCP server are two transports
for school administration. Except for account-scoped administrative onboarding
such as school creation and invitation acceptance, both require an active
staff membership and authorize through staff permissions.

The learner portal, public storefront, checkout, media delivery, and provider
webhooks use separate application or system endpoint surfaces. They may be
hosted by the same backend and may use HTTP, but they are not part of the
admin REST API and are not candidates for MCP parity.

This boundary is based on actor intent, not merely a URL prefix:

```text
Admin REST API / MCP
    -> staff membership + administrative operation policy

Learner application API
    -> school account + learner membership/public learner rule

Public site API
    -> verified host + explicit public projection

System callbacks
    -> webhook/worker authentication + system policy
```

An administrative operation may manage learner-facing resources—for example,
granting learner access or moderating a space—but it never acts as the
administrator's learner identity.

### Authorization is server-side and fail-closed

Navigation visibility, disabled controls, and route guards improve user
experience but do not grant authority. Every protected operation has an entry
in a central policy registry. An operation with no policy is denied in
production and fails a coverage test.

### Members cannot delegate authority they do not have

A non-owner may invite or manage a member only when:

1. the actor has the relevant team-management permission;
2. every current effective permission on the target is held by the actor; and
3. every proposed effective permission is held by the actor.

Checking both the current and proposed sets prevents a limited manager from
editing a more privileged member merely by reducing that member's grants.

The owner may manage all non-owner memberships. Full access is still not
ownership and cannot perform owner-only operations.

### Authentication mechanism attenuates authority

Browser sessions use current staff permissions. OAuth and personal API keys
can only narrow that authority:

```text
browser effective = current staff membership
OAuth effective  = current staff membership ∩ approved OAuth permissions
API key effective = current staff membership ∩ key permissions
```

No credential can retain a permission after the underlying membership loses
it.

### School-local identity is used in school UI

Team lists, invitation records, audit displays, community posts, and learner
UI use the `school_account` display name and image. Global account data is used
for authentication and verified-email matching, not as the primary school
profile.

## Current implementation assessment

The implementation should be evolved rather than discarded.

| Area | Current state | Required V1 change |
| --- | --- | --- |
| Permission constants, implications, presets | Present in `@courselit/api-contract` | Complete the catalog, remove `school:admin`, and make all handlers use operation policies. |
| Owner marker | `memberships.isOwner` exists | Enforce exactly one owner and add transfer ownership. |
| Membership identity | APIs use global `userId` | Use public staff-membership and school-account IDs. |
| Staff profile | Team list joins global `user` | Read school-local profile from `school_accounts`. |
| Invitations | Create, preview, accept, reject, revoke exist | Add explicit resend, status semantics, throttling, school-account actors, and concurrency rules. |
| Permission editing | Subset checks exist | Add row versions and `409` conflict handling. |
| Member removal | Exists but is located in the products domain | Move all team lifecycle logic into the team domain and revoke bound credentials. |
| Leave and ownership transfer | Missing | Add browser-session-only operations and UI. |
| Authorization | Repeated route-level checks | Introduce a typed, complete operation-policy registry. |
| OAuth | Authenticates a global user | Bind grants to a membership generation and intersect with live permissions. |
| Personal API keys | Store school and user grants | Bind keys to a staff membership and intersect with live permissions. |
| Learner integration | No canonical staff capability contract | Project safe staff capabilities from the learner session and define explicit exceptions. |
| Audit | Basic audit rows exist | Add before/after grants, target identity, credential kind, outcome, and request metadata. |

## Requirement catalog

| ID | Requirement |
| --- | --- |
| TEAM-001 | Every non-deleted school has exactly one owner staff membership. |
| TEAM-002 | A staff membership belongs to one school account and one school. |
| TEAM-003 | Membership APIs expose public membership IDs, never global Better Auth user IDs. |
| TEAM-004 | Team UI displays the school-local profile. |
| TEAM-005 | Permission presets expand to explicit grants and do not authorize requests by name. |
| TEAM-006 | `school:admin` is removed; broad access is represented by the Full access preset. |
| TEAM-007 | Every protected operation maps to a central permission or owner-only policy. |
| TEAM-008 | Missing policy entries fail closed and fail automated policy-coverage tests. |
| TEAM-009 | Non-owners cannot grant or manage permissions outside their effective set. |
| TEAM-010 | Concurrent membership edits use a version and return `409` on stale writes. |
| TEAM-011 | Team lifecycle mutations require a browser session and CSRF/origin protection. |
| TEAM-012 | Ownership transfer requires recent authentication and is atomic. |
| TEAM-013 | Removing a staff membership revokes membership-bound credentials. |
| TEAM-014 | Rejoining a school never revives credentials from an earlier membership. |
| TEAM-015 | Staff permissions never create learner memberships or learner entitlements. |
| TEAM-016 | Learner pages receive only server-derived staff capabilities for the current school. |
| TEAM-017 | Learner moderation controls require the explicit moderation permission. |
| TEAM-018 | Staff preview is explicit, read-only where appropriate, and never records learner progress. |
| TEAM-019 | General learner notification preferences and staff notification preferences have separate scopes. |
| TEAM-020 | Staff notification delivery rechecks current effective permission at send time. |
| TEAM-021 | Invitation tokens are random, hashed at rest, single-use, expiring, and excluded from query strings and logs. |
| TEAM-022 | Invitation acceptance rechecks inviter existence and delegation authority. |
| TEAM-023 | Security-relevant team changes produce structured audit events. |
| TEAM-024 | Tenant isolation is enforced in every member, invite, credential, and audit lookup. |
| TEAM-025 | CourseLit MCP exposes administrative operations only and always requires an active staff membership. |
| TEAM-026 | The externally documented REST API exposes administrative operations only; learner and public HTTP endpoints are separate application surfaces. |

## Permission catalog

Permission strings are part of API, invitation, membership, OAuth, and API-key
contracts. They must remain centralized in `@courselit/api-contract` and be
shared by API and UI code.

The initial complete catalog is:

| Area | Permission | Allows |
| --- | --- | --- |
| Team | `members:read` | View active members and pending invitations. |
| Team | `members:invite` | Invite and resend invitations within the actor's delegable set. |
| Team | `members:manage` | Edit or remove non-owner members within the actor's delegable set. |
| School | `school:read` | View school configuration. |
| School | `school:write` | Edit ordinary school configuration, excluding owner-only settings. |
| Products | `products:read` | View product, course, download, lesson, and plan configuration. |
| Products | `products:write` | Create and edit product content and configuration. |
| Products | `products:publish` | Publish or unpublish products and course content. |
| Products | `products:delete` | Delete eligible products and product content. |
| Learners | `learners:read` | View school accounts, learner memberships, progress, and evaluations. |
| Learners | `learners:write` | Grant, change, or end learner access and manage progress where supported. |
| Community | `communities:read` | View community, spaces, plans, members, and reports in admin. |
| Community | `communities:write` | Configure the community, spaces, unlocks, plans, and posting policy. |
| Community | `communities:moderate` | Moderate posts, comments, reports, and staff-only posting across spaces. |
| Website | `storefront:read` | View website, page, blog, navigation, and storefront configuration. |
| Website | `storefront:write` | Edit website, page, blog, navigation, and storefront drafts. |
| Website | `storefront:publish` | Publish or unpublish website and storefront content. |
| Commerce | `commerce:read` | View school-owned learner orders, invoices, subscriptions, and transactions. |
| Commerce | `commerce:manage` | Manage plans, payment-provider configuration, and subscriptions. |
| Commerce | `commerce:refund` | Issue supported learner-payment refunds. |
| Contacts | `contacts:read` | View school contacts and subscription status. |
| Contacts | `contacts:write` | Edit contacts, tags, and imports. |
| Mail | `mails:read` | View templates, sequences, broadcasts, and delivery reports. |
| Mail | `mails:write` | Create and edit mail content and automations. |
| Mail | `mails:send` | Send, schedule, pause, or cancel school mail. |
| Media | `media:read` | Browse school media. |
| Media | `media:write` | Upload and edit school media. |
| Media | `media:delete` | Delete eligible school media. |
| Certificates | `certificates:read` | View certificate designs and issued certificates. |
| Certificates | `certificates:write` | Create, edit, issue, or revoke certificates where supported. |
| Analytics | `analytics:read` | View school, product, learner, commerce, and community reports. |
| Billing | `billing:read` | View the school's CourseLit subscription and invoices. |
| API access | `api_keys:read` | List personal school API keys and their metadata. |
| API access | `api_keys:manage` | Create and revoke personal keys within the actor's delegable set. |
| Integrations | `integrations:read` | View configured integrations without revealing stored secrets. |
| Integrations | `integrations:manage` | Configure or disconnect supported integrations. |

There are no `spaces:*` permissions in V1. As established by the community
PRD, spaces are the community's discussion surface:

- `communities:read` reads space configuration;
- `communities:write` manages spaces and unlocks; and
- `communities:moderate` moderates content in every space, including
  product-only spaces.

`school:admin` must be removed from the catalog and from every authorization
branch. It is replaced by one of:

- `isOwner` for owner-only operations;
- an exact scoped permission for ordinary operations; or
- all explicit permissions for the Full access preset.

### Permission implications

The central implication graph must include at least:

```text
members:invite       -> members:read
members:manage       -> members:read
school:write         -> school:read
products:write       -> products:read
products:publish     -> products:write -> products:read
products:delete      -> products:write -> products:read
learners:write       -> learners:read
communities:write    -> communities:read
communities:moderate -> communities:write -> communities:read
storefront:write     -> storefront:read
storefront:publish   -> storefront:write -> storefront:read
commerce:manage      -> commerce:read
commerce:refund      -> commerce:manage -> commerce:read
contacts:write       -> contacts:read
mails:write          -> mails:read
mails:send           -> mails:write -> mails:read
media:write          -> media:read
media:delete         -> media:write -> media:read
certificates:write   -> certificates:read
api_keys:manage      -> api_keys:read
integrations:manage  -> integrations:read
```

The implication graph is evaluated in one shared helper. Handlers and UI code
must not reproduce implication logic.

### Permission presets

V1 exposes these presets:

| Preset | Intended use | Grants |
| --- | --- | --- |
| Full access | School administrator who is not the owner | Every non-owner permission. |
| Content manager | Courses, downloads, website, media, certificates | Product, storefront, media, certificate, and relevant analytics grants. |
| Community manager | Community setup and daily moderation | Community read/write/moderate, learner read, media read/write, and community analytics. |
| Support | Learner support without content publishing | Product read, learner read/write, community read/moderate, commerce read, contacts read. |
| Marketing | Website, contacts, campaigns, reporting | Storefront read/write/publish, contacts read/write, mails read/write/send, media read/write, analytics read. |
| Read only | Auditing and observation | Every applicable `*:read` permission. |
| Custom | Explicit selection | The selected normalized direct grants. |

The UI may store `preset_id` as display metadata. Changing a preset definition
does not retroactively alter existing memberships.

### Owner-only operations

The following operations are not represented by grantable permissions:

- transfer school ownership;
- delete the school;
- remove the owner membership;
- manage the school's CourseLit subscription payment method;
- perform emergency credential rotation that affects the entire school; and
- any future operation explicitly classified as owner-only in the policy
  registry.

Reading CourseLit subscription details may be delegated through
`billing:read`. Learner-commerce operations remain separate from CourseLit
platform billing as required by the billing segregation rules.

## Authorization model

### Central operation policy

All protected admin REST, MCP, worker-triggered, and server-action operations
must be registered in one typed policy map. Learner and public application
operations have separate typed policy registries based on their own actor
models. A representative admin/system shape is:

```ts
type TeamOperationPolicy = {
  audience: "school";
  requiredPermissions?: readonly CourseLitPermission[];
  requireAll?: boolean;
  ownerOnly?: boolean;
  allowedCredentials: readonly ("session" | "oauth" | "api_key")[];
  recentAuthentication?: boolean;
};

type AccountOperationPolicy = {
  audience: "account";
  allowedCredentials: readonly ("session" | "oauth")[];
  recentAuthentication?: boolean;
};

type SystemOperationPolicy = {
  audience: "system";
  allowedCallers: readonly ("worker" | "webhook")[];
};

type OperationPolicy =
  | TeamOperationPolicy
  | AccountOperationPolicy
  | SystemOperationPolicy;
```

Examples:

```ts
const OPERATION_POLICIES = {
  "team.list": {
    audience: "school",
    requiredPermissions: ["members:read"],
    allowedCredentials: ["session"],
  },
  "product.update": {
    audience: "school",
    requiredPermissions: ["products:write"],
    allowedCredentials: ["session", "oauth", "api_key"],
  },
  "school.transferOwnership": {
    audience: "school",
    ownerOnly: true,
    allowedCredentials: ["session"],
    recentAuthentication: true,
  },
} satisfies Record<OperationId, OperationPolicy>;
```

The operation policy is the source of truth. Domain services may add
resource-level checks, such as author ownership or learner access, but they
must not weaken the operation policy.

Anonymous public reads and learner application operations are explicitly
classified in their own policy registries rather than silently omitted from
coverage. Worker and webhook policies do not carry human staff authority; they
use their own authenticated system boundary and must call domain services that
preserve school and resource invariants.

### Request authorization context

The server resolves an authorization context comparable to:

```ts
type SchoolAuthorizationContext = {
  requestId: string;
  credential: {
    kind: "session" | "oauth" | "api_key";
    id: string;
  };
  userId: string;
  schoolId: string;
  schoolAccountId: string;
  staffMembershipId: string;
  isOwner: boolean;
  membershipVersion: number;
  directPermissions: readonly CourseLitPermission[];
  effectivePermissions: ReadonlySet<CourseLitPermission>;
};
```

School and school-account status are checked before the context is returned.
The requested public school ID, selected school, verified school hostname, and
credential-bound school must agree. A client-provided school ID never
overrides the server-resolved context.

### Browser sessions

A browser session receives the current effective permissions of the active
staff membership. Sensitive lifecycle operations require CSRF/origin checks.
Ownership transfer, school deletion, payment-secret changes, and comparable
high-impact operations require recent authentication.

### OAuth

OAuth grants are school-specific and membership-bound. The approved CourseLit
permission set must be stored with the grant. Every request intersects it with
the current membership's effective permissions.

OAuth-provider configuration, hosted OAuth pages, token verification, resource
audiences, and MCP protected-resource discovery use
`@codelitdev/oauth-server-kit`, following the shared FrontLit/SendLit
integration. CourseLit remains responsible for mapping the authenticated
Better Auth subject to the global CourseLit account, binding the grant to a
school and staff-membership generation, and enforcing the operation policy.

Removing a membership revokes its OAuth grants and refresh tokens. Rejoining
creates a new membership ID and does not reactivate old grants. Reducing a
membership takes effect immediately even if an access token has not expired.

Team membership administration, invitations, ownership transfer, and school
deletion are unavailable through OAuth in V1.

### Personal API keys

Each personal API key belongs to a staff membership, not merely to a global
user and school. Key creation requires `api_keys:manage`, and a non-owner can
select only permissions in the actor's current effective set.

At request time:

1. the key must be active and unexpired;
2. its bound membership and school account must still be active;
3. the request school must equal the key school; and
4. key permissions are intersected with current membership permissions.

Deleting a membership cascades or atomically revokes its keys. A new
membership for the same person receives a new ID, so old keys cannot revive.

### Admin REST and MCP

CourseLit REST and MCP are administrative interfaces. Resolving an ordinary
school-scoped request on either surface always requires:

1. a valid administrative credential: browser session for REST, or OAuth token
   or personal API key for REST and MCP;
2. one active school account;
3. one active staff membership for the credential-bound school; and
4. the administrative permission required by the tool's operation policy.

Account-level administrative onboarding operations that necessarily precede
membership, such as creating a school or accepting an invitation, use an
explicit account policy instead of a learner policy.

Neither admin REST nor MCP resolves or authorizes through
`learner_memberships`. A person who is only a learner cannot establish an
admin REST or MCP school context. If a person is both staff and learner, these
surfaces see only the staff relationship and cannot act as that person's
learner identity.

Admin REST endpoints and MCP tools may administer learner-facing
resources—for example, a staff member with `learners:read` may inspect learner
records or a product manager may edit a course—but that remains an
administrative operation. Neither surface may:

- consume a course or download as a learner;
- create or mutate learner progress, evaluations, SCORM runtime state, or
  certificates through learner behavior;
- join or leave the community as a learner;
- read or write the learner feed, follows, reactions, comments, or personal
  notifications as a learner;
- start checkout, purchase a plan, or manage a learner subscription as the
  authenticated person; or
- use staff preview as a substitute for a learner API.

Every MCP tool maps to the same operation ID and policy as its administrative
REST equivalent. OAuth authority is the intersection of the active staff
membership and approved OAuth permissions. API-key authority is the
intersection of the active staff membership and key grants. Tool discovery may
hide unavailable tools for usability, but invocation authorization remains
mandatory and fail-closed.

Team lifecycle, ownership, invitation, API-key administration, CourseLit
billing, and other recent-authentication workflows remain browser-session
REST operations even though they are administrative. They are explicit MCP
parity exemptions.

### HTTP behavior

- `401` means no valid authentication credential.
- `403` means an authenticated actor lacks school membership, an allowed
  credential type, or required authority.
- `404` is used when resource concealment is required.
- `409` means a lifecycle or version conflict, including stale membership
  edits or an ownership precondition failure.
- `422` means structurally valid input violates a business rule.
- `429` means invitation or other security-sensitive throttling was exceeded.

Error payloads expose stable machine-readable reason codes without leaking
cross-school resource existence.

## Data requirements

Because this rewrite has no production deployment, update the baseline schema
and reset development databases instead of adding compatibility migrations.

### `memberships`

`memberships` becomes the canonical staff relationship:

| Column | Requirement |
| --- | --- |
| `id` | Internal UUIDv7 primary key. |
| `public_id` | Stable external ID with a dedicated team-membership prefix. |
| `school_id` | Required school FK with cascade on school deletion. |
| `school_account_id` | Required school-account FK. Must belong to the same school. |
| `is_owner` | Required boolean, false by default. |
| `permissions` | Required PostgreSQL text array of normalized direct grants. |
| `preset_id` | Optional UI metadata; never used for authorization. |
| `version` | Required integer incremented on every mutable update. |
| `created_at` / `updated_at` | Required timestamps. |

Remove `role` and redundant `user_id`. The global user is reachable through
`school_accounts.user_id`. Authorization joins must verify school equality;
the schema should use a composite foreign key or equivalent invariant so a
membership cannot point to a school account from another school.

Constraints and indexes:

- unique `(school_id, school_account_id)`;
- unique `public_id`;
- partial unique index on `school_id where is_owner = true`;
- indexed `school_account_id`; and
- permission values validated by application parsing and contract tests.

The partial index guarantees at most one owner. School creation and transfer
transactions guarantee at least one owner.

### `invitations`

Team invitations contain:

| Column | Requirement |
| --- | --- |
| `id` / `public_id` | Internal and external identity. |
| `school_id` | Required school scope. |
| `normalized_email` | Verified-email match key. |
| `permissions` | Normalized direct grants proposed for the new member. |
| `preset_id` | Optional UI metadata only. |
| `token_digest` | Digest of the random acceptance secret; never plaintext. |
| `invited_by_school_account_id` | School-local inviter actor. |
| `status` | `pending`, `accepted`, `rejected`, `revoked`, or `expired`. |
| `expires_at` | Required short expiration. |
| `accepted_by_school_account_id` | Set on acceptance. |
| lifecycle timestamps | Created, updated, accepted, rejected, revoked. |

Only one pending invitation may exist per normalized `(school_id, email)`.
Resending rotates the secret and expiry on that logical invitation or revokes
and replaces it atomically. Old links stop working immediately.

### Personal API keys

Replace the key's direct `user_id` ownership with `membership_id` and retain
`school_id` as a denormalized, constrained lookup field. Store only a digest
of the key secret. Add `created_by_school_account_id`, `name`, `permissions`,
`expires_at`, `revoked_at`, `last_used_at`, and timestamps.

### OAuth authorization grants

The OAuth authorization record must identify the school and staff membership
generation that approved it, plus the approved CourseLit permission set.
Membership removal revokes refresh and access grants. If the OAuth provider
schema cannot carry these fields directly, add a CourseLit-owned binding table
keyed by the OAuth consent or grant ID.

### Authorization audit events

Extend the audit model for security-relevant changes:

- school ID;
- actor global user and school-account IDs;
- actor membership ID;
- target membership, invitation, credential, or school ID;
- action and outcome;
- before and after direct permission arrays where applicable;
- credential kind;
- request ID;
- safe IP and user-agent metadata according to retention policy; and
- timestamp.

Required action families include invitation creation/resend/rejection/revoke/
acceptance, member permission changes, member removal/leave, ownership
transfer, API-key create/revoke, OAuth revocation, and denied high-impact
operations.

Audit events never store raw invitation tokens, API keys, session cookies, or
OAuth tokens.

## Team lifecycle

### School creation

School creation is one transaction that:

1. creates the school;
2. resolves or creates the owner's school account;
3. creates the sole owner staff membership;
4. creates other required school bootstrap records; and
5. records the ownership audit event.

The owner row may store an empty direct permission array because owner
authority is computed dynamically.

### Create invitation

The actor must have `members:invite` or be owner. The server normalizes the
proposed direct grants, expands implications, and verifies that a non-owner can
delegate the entire effective set.

The operation rejects:

- an email already attached to an active staff membership;
- malformed or unverified invitation input;
- a duplicate pending invitation unless the request explicitly chooses
  resend; and
- permissions outside the actor's delegable set.

The API creates a cryptographically random secret, stores only its digest, and
sends the invitation email. The ordinary dashboard response must not expose
the raw secret after dispatch. Test-only mail capture may inspect it without
logging it.

### Resend invitation

Resend is a dedicated endpoint. It rechecks inviter authority, rotates the
token, extends expiry, increments resend counters, records an audit event, and
sends a new email. It is rate-limited per actor, school, invitation, email,
and source IP.

### Preview invitation

The invitation page reads the secret from the URL fragment, never a query
parameter. It may temporarily persist the secret through login, then clears it
after terminal success or failure. The page sends a strict `Referrer-Policy:
no-referrer` and does not load third-party analytics before the fragment is
cleared.

Preview returns only the school name, inviter display name, proposed
permissions/preset, expiry, invited email hint, and state. It does not grant
authority.

### Accept invitation

Acceptance requires a browser session whose canonical verified email matches
the invitation email. In one transaction, the server:

1. locks the invitation and school;
2. verifies pending state, digest, and expiry;
3. verifies the accepting global account's email;
4. rechecks the inviter is still an active staff member;
5. rechecks the inviter could delegate the invitation's current effective
   permission set, unless the inviter was the owner and remains owner;
6. resolves or creates the accepting person's school account;
7. ensures no active staff membership already exists;
8. creates the new membership with a new membership ID;
9. marks the invitation accepted; and
10. records an audit event.

Acceptance changes no learner memberships. An existing learner gains staff
authority on the same school account. An existing staff member cannot use a
second invitation to overwrite current permissions.

Concurrent acceptance is idempotent for the successful account and cannot
create duplicate memberships.

### Reject, revoke, and expire

The invited account may reject a pending invitation. An authorized inviter or
manager may revoke an invitation within delegation rules. Expired invitations
are rejected during reads and mutations even before a cleanup job persists the
`expired` state.

### List team

`members:read` returns cursor-paginated active memberships and pending
invitations. Each member includes:

- public membership ID;
- public school-account ID;
- school-local name, image, and contact email;
- owner flag;
- direct and effective permissions;
- display preset classification;
- version; and
- creation/update timestamps.

Invitation permission details are shown only when the viewer is allowed to
manage that invitation. The response includes the viewer's effective
permissions and owner flag for capability-aware rendering.

### Edit permissions

Owners may edit any non-owner. A non-owner with `members:manage` may edit only
targets whose current and proposed effective permissions are subsets of the
actor's effective permissions.

The request includes the target's current `version`. The update matches both
membership ID and version, increments the version, and returns `409` when the
row changed concurrently.

An actor cannot edit their own membership in V1. This avoids self-escalation
and accidental lockout. Self-service reduction may be designed later.

### Remove member

The owner can remove any non-owner. A manager can remove a member only when
the target's full effective set is within the manager's own set. Removing a
membership atomically revokes or deletes membership-bound API keys and OAuth
grants.

Removal does not delete:

- the global CourseLit account;
- the school account;
- learner memberships;
- purchases, progress, evaluations, certificates, or authored content; or
- ordinary learner notification preferences.

Authored content retains the school-account author. UI may show a former staff
badge only as historical metadata; current staff badges are resolved from live
membership.

### Leave team

A non-owner may leave through a browser-session endpoint. The operation has
the same credential revocation and learner-preservation behavior as removal.
The sole owner cannot leave and is directed to transfer ownership or delete
the school.

### Transfer ownership

Only the current owner may transfer ownership. The target must be an active
non-owner member. Recent authentication is required.

The transaction locks the school and both memberships, verifies the current
owner and target, sets the target as owner, sets the former owner as a
non-owner with the selected post-transfer permission set, increments both
versions, and writes one audit event. The transaction never commits an
ownerless or dual-owner state.

Existing credentials are re-evaluated immediately. Owner-only authority is
not embedded in tokens or key permission snapshots.

## Learner application behavior

### Staff capability resolution

The learner session resolves the school from the verified host, then resolves:

1. the global CourseLit account;
2. its active school account for that school;
3. an optional active staff membership; and
4. learner memberships independently as required by each feature.

The learner `me` response may expose a minimal capability projection:

```ts
type LearnerSchoolActor = {
  schoolAccount: {
    id: string;
    displayName: string;
    image: string | null;
  };
  staff: null | {
    membershipId: string;
    isOwner: boolean;
    effectivePermissions: CourseLitPermission[];
  };
};
```

This projection is server-derived. The learner app must never infer staff
status from the email, a global account property, an old `role`, or the
presence of learner access. The API remains authoritative even when the UI
hides or shows a control based on this projection.

### Learner-side effects by permission

Most permissions have **no learner-side entitlement effect**. Their only
learner-app effects are:

| Permission or relationship | Learner-app effect |
| --- | --- |
| Owner / Full access | May show an "Open admin" affordance and all authorized staff notification groups. Does not unlock learner content. |
| `communities:moderate` | Shows moderation actions and permits staff moderation across spaces through explicit moderation endpoints. |
| `communities:write` | May create staff posts in community-unlocked spaces where the space policy explicitly allows admins. It does not grant ordinary member participation. |
| `products:write` or `products:publish` | May enter explicit staff preview for products the actor can manage. `products:write` may also create staff posts in that product's spaces where the space policy allows admins. Neither behavior creates learner state. |
| Permission matching a staff-notification activity | Shows that staff preference row and permits delivery while the permission remains active. |
| Any other staff permission | No direct learner-content access. |
| Active `learner_membership` | Grants ordinary learner access according to its product/community, plan, status, and space unlocks. |

### Community and space behavior

An ordinary feed, space, post, comment, reaction, follow, or notification read
uses learner membership and space-unlock rules. Staff authority does not make
the actor an ordinary community member.

The deliberate exceptions are:

- `communities:moderate` may load every school space through moderation-aware
  queries, resolve reports, hide/delete content, and use moderator controls;
- `communities:write` may create a staff post in a community-unlocked space,
  and `products:write` may create one in the applicable product's space, when
  the space's `whoCanPost = admin` rule permits it; and
- a community learner membership with learner role `moderate` continues to
  operate under the community PRD and does not become a staff membership.

Moderation and staff posting use the same school-account author identity. They
must be audited and must not create a community learner membership or included
product access.

If the product wants staff to participate exactly like a learner—following
spaces, receiving ordinary member notifications, progressing through a
course, or earning a certificate—the person must have the corresponding
learner membership.

School provisioning may separately create the owner's bootstrap community
learner membership as required by the community PRD. That is an explicit
`learner_membership` created in the provisioning transaction, not an
entitlement inferred from owner or staff status.

### Staff preview

Staff preview is an explicit route and request mode, visually labeled as
preview. It requires the appropriate product permission on every request.
Preview:

- may read unpublished content needed to review the product;
- must not create or mutate learner progress, evaluations, downloads,
  certificates, completion events, or automations;
- must not bypass school scoping or reveal another school's content; and
- ends immediately when the relevant permission or staff membership is
  removed.

V1 does not support impersonating a specific learner.

### Learner navigation

The learner portal remains learner-focused. Staff status does not reproduce
the admin sidebar. A staff actor may receive a single "Open admin" link and
capability-specific controls within relevant learner pages.

### Lifecycle independence

| Change | Staff effect | Learner effect |
| --- | --- | --- |
| Staff invitation accepted | Adds admin authority. | Existing learner access is unchanged. |
| Staff permissions reduced | Removes admin capabilities immediately. | Learner access and progress are unchanged. |
| Staff membership removed | Removes admin, preview, moderation, and staff-notification authority. | Legitimate learner memberships remain active. |
| Learner membership expires | No effect on staff membership. | Corresponding content/community access ends. |
| School account deactivated | Staff operations fail. | Learner operations also fail until reactivated. |
| Global account deleted | Follows account-deletion policy across schools. | Follows the same policy; this is not a team removal. |

## Notification preferences

General learner notification preferences remain attached to the school
account. Staff/admin notification preferences are attached to the current
staff membership so that removing and later re-adding a member does not revive
old administrative subscriptions.

The learner account notifications page may show both classes because the same
human can be a learner and staff member. The server returns only activities
available to the current actor.

V1 staff groups include:

| Group | Example activities | Required current authority |
| --- | --- | --- |
| Product | downloaded, enrolled, purchased | Per-activity policy using `products:read`, `learners:read`, or `commerce:read`. |
| User | newsletter subscribed/unsubscribed, school account created | Per-activity policy using `contacts:read` or `learners:read`. |
| Community | community joined/left/requested, reports, moderation events | Per-activity policy using `communities:read` or `communities:moderate`. |

Rules:

- owners receive all available staff groups;
- non-owners see each activity only when they hold its required permission;
- App and Email channels are independently configurable when the activity
  supports both;
- preference APIs filter unauthorized rows and reject unauthorized writes;
- event fan-out and delivery recheck live membership and activity permission;
- permission removal makes a preference dormant immediately;
- membership removal deletes staff preference rows through membership scope;
- no staff notification preference grants access to its linked resource; and
- links opened after authority is removed fail through ordinary resource
  authorization.

## API contract

Paths use public invitation and membership IDs. `:membershipId` never means a
global Better Auth user ID.

### Team management

| Method | Path | Policy | Result |
| --- | --- | --- | --- |
| `GET` | `/v1/school/team` | `members:read`, session | Cursor page of members/invitations and viewer capability. |
| `POST` | `/v1/school/team/invitations` | `members:invite`, session | Creates and dispatches an invitation. |
| `POST` | `/v1/school/team/invitations/:invitationId/resend` | `members:invite`, session | Rotates token and resends. |
| `DELETE` | `/v1/school/team/invitations/:invitationId` | `members:invite`, session | Revokes pending invitation. |
| `PATCH` | `/v1/school/team/members/:membershipId` | `members:manage`, session | Updates grants using expected version. |
| `DELETE` | `/v1/school/team/members/:membershipId` | `members:manage`, session | Removes an eligible non-owner. |
| `POST` | `/v1/school/team/leave` | current non-owner member, session | Leaves the team. |
| `POST` | `/v1/school/team/transfer-ownership` | owner, recent session | Atomically transfers ownership. |

### Invitation acceptance

| Method | Path | Policy | Result |
| --- | --- | --- | --- |
| `POST` | `/v1/team-invitations/:invitationId/preview` | verified session plus secret | Returns safe invitation summary. |
| `POST` | `/v1/team-invitations/:invitationId/accept` | matching verified session plus secret | Creates staff membership. |
| `POST` | `/v1/team-invitations/:invitationId/reject` | matching verified session plus secret | Rejects invitation. |

The secret is sent in the request body after being read from the fragment. It
is never included in a query parameter.

### Capability and notification APIs

- Learner `me` includes the current school's optional staff capability
  projection.
- Notification-preference responses contain general learner activities plus
  only currently authorized staff activities.
- The admin app may call the same preference service; it must not maintain a
  second preference model.

These are learner-application endpoints, not part of the externally documented
admin REST API or MCP parity surface. Shared domain services do not imply a
shared authorization audience.

### Contract rules

- Inputs and outputs use shared Zod schemas from `@courselit/api-contract`.
- Permission strings are enums from the shared package.
- Direct grants and effective permissions are returned as separate fields.
- Unknown permissions are rejected on writes and ignored only during an
  explicitly documented migration read.
- Raw token and credential values never appear in list responses.
- All list endpoints are paginated and deterministically ordered.
- The published REST OpenAPI/SDK surface contains administrative operations
  only.
- Learner and public application endpoints are cataloged separately and are
  excluded from admin REST-to-MCP parity checks.

## Admin application requirements

The existing Team tab remains the primary interface and is completed rather
than replaced.

It must support:

- paginated members and pending invitations;
- school-local avatar, name, and email display;
- owner indicator distinct from permission preset;
- invite flow with preset and custom permission selection;
- only delegable permissions enabled for a non-owner inviter;
- explicit resend and revoke actions;
- member permission editing with conflict refresh on `409`;
- member removal with clear confirmation;
- leave-team action for non-owners;
- ownership transfer with recent-auth confirmation;
- disabled or hidden controls when the viewer lacks capability;
- direct-route denial when the viewer lacks `members:read`; and
- no leakage of team details in page data or client bundles before server
  authorization.

Navigation for the wider admin app is capability-aware. A user sees a section
when at least one operation in that section is available. Direct URLs and API
calls remain server-protected.

The Full access preset must be visually distinct from Owner. It does not show
owner-only actions.

## Security and privacy requirements

- Team lifecycle mutations accept browser sessions only.
- State-changing session requests enforce CSRF and origin validation.
- Ownership transfer and other named high-impact operations require recent
  authentication.
- Invitation and credential secrets use cryptographically secure randomness,
  are hashed at rest, and use constant-time digest comparison.
- Invitation fragments are removed after terminal handling and excluded from
  referrers, analytics, logs, telemetry, and error reports.
- Invitation creation, resend, preview, acceptance, and rejection are
  rate-limited.
- Verified canonical email matching is required for acceptance.
- Permission inputs are allowlisted; unknown strings never become authority.
- Every database lookup includes the resolved school scope unless the
  operation is explicitly global.
- Cross-school member, invitation, key, OAuth, and audit IDs return concealed
  not-found or forbidden responses according to the API policy.
- UI state is never accepted as proof of owner or staff status.
- Staff removal takes effect for new requests immediately; cached capability
  data has a bounded short TTL and is invalidated by membership version or
  deletion.
- Logs and telemetry include operation and reason codes, not secrets or
  unrestricted personal data.

## Reliability and concurrency

- School creation and ownership transfer lock the school ownership boundary
  and preserve exactly one owner.
- Invitation acceptance locks the invitation and uses unique constraints to
  prevent duplicate memberships.
- Membership edits use optimistic version checks.
- Removal and ownership transfer are serialized so a target cannot be removed
  while becoming owner.
- Credential revocation and membership deletion occur in the same transaction
  where possible. If an external OAuth revocation is required, write a durable
  revocation job before commit and deny the local binding immediately.
- Email dispatch is idempotent and retryable; a failed email does not expose
  the secret in an ordinary API response.
- Audit writes for security-sensitive operations are transactional with the
  state change.

## Observability

Track at least:

- invitation create, resend, accept, reject, revoke, expire, and failure
  counts;
- invitation email delivery and bounce outcomes;
- permission-edit conflicts and denied delegation attempts;
- member removal, leave, and ownership-transfer outcomes;
- denied operations by policy, credential kind, and safe reason;
- API-key and OAuth requests denied because the membership changed;
- staff preview and moderation operations from learner pages;
- staff notification deliveries suppressed by permission rechecks; and
- invariant alarms for zero-owner, multiple-owner, duplicate active
  membership, or cross-school-reference conditions.

Telemetry must use bounded operation and reason values. Do not use emails,
names, raw IDs, or token material as metric labels.

## Delivery sequence

### Phase 0: Contract and route inventory

1. Enumerate every protected admin REST operation, MCP tool, learner/public
   application endpoint, worker, server action, and admin page, and classify
   each into exactly one authorization audience.
2. Assign each operation an exact scoped permission or owner-only policy.
3. Add a coverage test that fails when a protected operation lacks a policy.
4. Finalize the permission catalog and implication graph in
   `@courselit/api-contract`.
5. Replace every planned `school:admin` fallback in the inventory before
   deleting that permission.
6. Classify every MCP tool as an administrative operation and limit MCP parity
   to the externally documented admin REST catalog. Learner, public, checkout,
   and consumption application endpoints are outside that catalog rather than
   MCP candidates.

### Phase 1: Schema and identity foundation

1. Rewrite the baseline `memberships` schema around `school_account_id`.
2. Remove membership `role` and redundant `user_id`.
3. Add public IDs, permission arrays, preset metadata, version, timestamps,
   and ownership constraints.
4. Harden invitations and bind inviter/acceptor to school accounts.
5. Bind personal API keys and OAuth grants to a membership generation.
6. Add membership-scoped staff notification preferences.
7. Update school provisioning to create exactly one owner membership.
8. Reset the development database and reapply migrations.

### Phase 2: Authorization foundation

1. Implement the operation-policy registry and policy evaluator.
2. Build the server-authoritative school authorization context.
3. Apply credential intersections for OAuth and personal API keys.
4. Migrate resource handlers from ad hoc `permissions.has(...)` checks.
5. Remove `school:admin` from contracts, presets, fixtures, and handlers.
6. Add owner-only and recent-auth enforcement.

### Phase 3: Team lifecycle

1. Consolidate list, invite, edit, remove, and audit logic in the team domain.
2. Implement dedicated resend, leave, and transfer-ownership operations.
3. Add optimistic concurrency and stable conflict responses.
4. Add transactional credential revocation.
5. Complete invitation throttling, fragment handling, and email retry behavior.

### Phase 4: Admin application

1. Port and adapt proven team UI behavior from the production branch where it
   exists.
2. Update the Team tab to public membership IDs and school-local profiles.
3. Add leave and ownership-transfer flows.
4. Make permission selection delegation-aware.
5. Make all navigation and direct routes capability-aware.
6. Add conflict, expired-invite, revoked-invite, and recent-auth states.

### Phase 5: Learner application integration

1. Add the optional staff capability projection to the learner actor response.
2. Keep ordinary learner authorization exclusively on learner memberships.
3. Implement explicit community moderation and admin-posting checks.
4. Implement explicit, non-progress-recording staff preview.
5. Show an "Open admin" affordance without reproducing admin navigation.
6. Serve capability-filtered Product, User, and Community staff notification
   preferences.
7. Recheck permission during staff-notification delivery.

### Phase 6: Cleanup and documentation

1. Remove role-based and `school:admin` branches.
2. Remove global user IDs from school-team API contracts.
3. Move misplaced team logic out of product services.
4. Update the one-community and identity PRDs where their implementation notes
   reference the old bypass.
5. Document owner transfer, staff invitations, presets, API-key attenuation,
   preview, and moderation behavior in `apps/docs`.

## Test plan

### Permission and policy unit tests

- Every permission normalizes deterministically.
- Implication closure is correct and cycle-safe.
- Every preset expands to the expected direct and effective set.
- Owner effective permissions always equal the current catalog.
- Full access does not satisfy owner-only policies.
- Every protected operation has exactly one policy entry.
- Unregistered operations fail closed.
- Credential-kind restrictions are enforced.
- Delegation checks compare both target-current and target-proposed sets.

### Database and ownership tests

- School creation creates one owner and one school account.
- A second owner insert fails.
- A membership cannot reference another school's school account.
- Duplicate active staff membership fails.
- Ownership transfer cannot commit zero or two owners.
- Concurrent transfer/removal leaves exactly one owner.
- Public IDs resolve only inside the selected school.

### Invitation tests

- Authorized owner and delegated inviter can invite permitted sets.
- A non-owner cannot invite any permission they do not hold.
- Duplicate pending invitation behavior is deterministic.
- Resend invalidates the previous secret and is rate-limited.
- Wrong account, wrong verified email, wrong school, expired, revoked,
  rejected, accepted, and malformed tokens fail safely.
- Acceptance rechecks changed or removed inviter authority.
- Concurrent acceptance creates exactly one membership.
- Acceptance reuses an existing school account and changes no learner
  memberships.
- Secrets never appear in list output, query strings, logs, or telemetry.

### Member lifecycle tests

- Team list uses school-local profile fields.
- Permission edit returns `409` for a stale version.
- Managers cannot edit more privileged targets even to reduce them.
- Managers cannot grant outside their own effective set.
- Owner membership cannot be edited or removed normally.
- Non-owner leave succeeds and owner leave fails.
- Removal revokes bound keys and OAuth grants.
- Removing and re-inviting the same user does not revive prior credentials.
- Removing staff leaves learner memberships, progress, purchases, and authored
  content intact.

### Authentication tests

- Browser authority reflects current membership immediately.
- OAuth authority is the intersection of approved and current permissions.
- API-key authority is the intersection of key and current permissions.
- A key cannot select another school through a header.
- Removed, expired, or deactivated membership credentials fail.
- Team lifecycle endpoints reject OAuth and API-key credentials.
- Recent-auth requirements are enforced for ownership transfer.
- A learner-only account cannot establish an admin REST or MCP school context.
- A dual-role account's admin REST and MCP contexts contain staff authority
  only.
- No learner, public storefront, checkout, progress, or community-participant
  endpoint appears in the published admin REST catalog or MCP tools.
- Every MCP tool and its admin REST equivalent resolve to the same operation
  policy.

### Learner application tests

- A learner-only account receives `staff: null`.
- A staff-only account receives staff capabilities but no learner entitlements.
- A dual-role account receives both independent relationships.
- Staff permission alone cannot open paid lessons, downloads, ordinary private
  spaces, progress, or certificates.
- `communities:moderate` exposes moderation controls and authorizes only
  moderation-aware endpoints.
- Community learner moderator access does not grant admin permissions.
- Staff preview can read eligible drafts but creates no progress or completion
  events.
- Staff removal immediately removes learner-side moderation, preview, and
  staff notification controls while preserving learner access.
- Learner membership expiry leaves admin access unchanged.

### Notification tests

- General preferences are available to ordinary learners.
- Product, User, and Community staff rows are filtered by current permission.
- Unauthorized preference reads and writes are rejected or omitted.
- App and Email values persist independently.
- Delivery rechecks membership and permission after event creation.
- Removed members receive no staff notifications.
- Rejoining starts with new staff preference defaults rather than old
  membership preferences.
- Notification links do not bypass resource authorization.

### UI tests

- Team navigation and direct-route behavior match current capability.
- Invite, edit, remove, revoke, resend, leave, and transfer flows cover loading,
  success, conflict, and error states.
- Non-owners never see grant options outside their delegable set.
- Full access is not presented as ownership.
- Learner staff controls disappear after a permission refresh.
- Multi-school switching shows only the selected school's team and
  capabilities.

## Acceptance criteria

- Every school has exactly one owner represented by a staff membership.
- Owner is a relationship, not a role or copied permission snapshot.
- The same global person can hold different staff and learner relationships in
  different schools through distinct school accounts.
- Team APIs and UI use school-scoped membership and school-account IDs.
- Team UI displays the school-local profile.
- `school:admin` no longer exists in authorization code or persisted grants.
- Every protected operation has a tested, fail-closed policy.
- Permission presets expand to explicit grants and never authorize by name.
- Non-owners cannot delegate, edit, or remove authority outside their own
  effective set.
- Invitation tokens are hashed, single-use, expiring, fragment-delivered, and
  absent from logs and list responses.
- Invite acceptance is transactional, idempotent, and rechecks inviter
  authority.
- Permission edits are versioned and stale writes return `409`.
- Ownership transfer is atomic, owner-only, and recent-auth protected.
- Staff removal revokes membership-bound API keys and OAuth grants.
- Rejoining does not revive credentials or staff notification preferences.
- Staff removal never removes legitimate learner memberships or learner data.
- Staff permissions never create products, community, progress, purchase, or
  certificate entitlements.
- The published REST API and MCP server are staff-only administrative surfaces
  and cannot act through learner memberships.
- Learner and public HTTP endpoints are separate application surfaces and are
  excluded from the admin REST OpenAPI/SDK and MCP parity catalog.
- Learner staff status is derived from the current school's live staff
  membership, never from email or a client-controlled field.
- Staff preview and community moderation are explicit, audited exceptions.
- Product, User, and Community staff notification groups are capability-aware
  and rechecked at delivery time.
- Owner, staff, learner, dual-role, and cross-school isolation tests pass for
  browser sessions, OAuth, and API keys.

## Resolved V1 decisions

- One school has exactly one owner.
- Owner is represented by `memberships.is_owner`.
- Staff memberships attach to `school_accounts`, not directly to global users.
- `role` and `school:admin` are removed.
- Presets are copied permission templates, not live roles.
- There are no separate `spaces:*` grants in V1; community grants cover spaces
  as defined by the community PRD.
- Team lifecycle management is browser-session only.
- CourseLit's published REST API and MCP server are admin-only surfaces. They
  require an active staff membership for school-scoped operations and never
  authorize through `learner_memberships`.
- Learner, public storefront, checkout, and consumption endpoints are separate
  application APIs even when hosted in the same backend service.
- Personal API keys and OAuth grants are membership-bound and attenuated by
  current permission.
- Ordinary learner access remains exclusively based on
  `learner_memberships`.
- Explicit staff preview, `communities:moderate`, and staff posting under a
  space's `whoCanPost = admin` policy are the only planned V1 learner-surface
  exceptions.
- General notification preferences are school-account scoped; staff
  preferences are staff-membership scoped.
- Team APIs expose public membership IDs and school-local profiles.
- Baseline migrations are rewritten and development databases reset; no
  compatibility layer is required.
