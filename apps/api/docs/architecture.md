# CourseLit API Architecture

**Status:** Living Architecture  
**Scope:** Identity, Multi-Tenancy, Authentication, Authorization, Data Boundaries, and Space Access

---

## Table of Contents

- [Accounts](#accounts)
  - [Overview](#overview)
  - [Authentication boundary](#authentication-boundary)
  - [Two-tier identity model](#two-tier-identity-model)
  - [Authorization and capabilities](#authorization-and-capabilities)
  - [Multi-domain authentication](#multi-domain-authentication)
  - [Admission rules and session provenance](#admission-rules-and-session-provenance)
- [Spaces](#spaces)
  - [Data model](#data-model)
  - [Membership matching](#membership-matching)
  - [Community unlocks](#community-unlocks)
  - [Product unlocks](#product-unlocks)
  - [Read access versus participation](#read-access-versus-participation)
- [Media](#media)
  - [Categories](#categories)
  - [Learner uploads](#learner-uploads)
- [Reference source files](#reference-source-files)

---

## Accounts

### Overview

CourseLit implements a **two-tier identity system** that unifies human authentication globally across all schools and administrative surfaces, while keeping authorization and actor profiles strictly scoped to each individual school tenant.

This section summarizes the account architecture. See the
[Accounts Management PRD](./accounts-management.md) for the complete product
requirements, terminology, user journeys, migration plan, and acceptance
criteria.

```text
CourseLit Account (Global Person & Canonical Verified Email)
    │   Authenticated via @codelitdev/oauth-server-kit + Better Auth (Email OTP / Platform Google)
    │   Stored in Better Auth `user` table
    │
    ├── School Account: School A (`school_accounts` row: schoolId, userId)
    │      ├── School Profile (local display name, avatar, contact email)
    │      ├── Staff Membership (`memberships` row: owner, admin, content manager, etc.)
    │      ├── Product Memberships (`learner_memberships` rows: product entitlements)
    │      └── Community Memberships (`learner_memberships` rows: community entitlements)
    │
    └── School Account: School B (`school_accounts` row: schoolId, userId)
           ├── School Profile (local display name, avatar, contact email)
           ├── Staff Membership (e.g. content manager)
           └── Product Memberships (learner entitlements)
```

---

### Authentication Boundary

CourseLit's authentication layer aligns directly with the architectural contracts established in [`saas-starter-kit`](https://github.com/codelitdev/platform):

1. **Protocol & Authentication Boundary**:
   - `@codelitdev/oauth-server-kit` provides the reusable OAuth 2.0 / OIDC provider options (`createOAuthProviderOptions`), session verification (`resolveBetterAuthSession`), access token bearer verification (`verifyOAuthAccessToken`), hosted login/consent routing (`createOAuthPagesRouter`), and MCP OAuth discovery (`createMcpOAuthDiscoveryRoutes`).
   - The kit authenticates people and OAuth clients and outputs a neutral `AuthenticatedIdentity` whose `subject` is the verified Better Auth user ID (`user.id`).
   - **The kit does not define, create, or persist product account rows.** It remains completely agnostic of tenant concepts, school structures, permissions, and roles.

2. **Absence of Redundant Intermediate Account Tables**:
   - In earlier iterations of sibling products (such as FrontLit), an extra product-level `accounts` table was introduced between Better Auth and domain entities (`accounts.authUserId -> authUser.id`).
   - Sibling product SendLit and the canonical `saas-starter-kit` template (`templates/saas-product`) pruned this redundancy, establishing that Better Auth's `user` table is the canonical human user principal.
   - CourseLit follows this standard: **the Better Auth `user` row itself is the global CourseLit account**. There is no intermediate `accounts` table.

---

### Two-Tier Identity Model

#### Tier 1: Global CourseLit Account (`user`)
The global account represents a single human being across the entire CourseLit platform.

- **Persistence**: Stored in the Better Auth `user` table (`apps/api/src/db/schema/auth.generated.ts`).
- **Canonical Verified Email**: Every global account is anchored to exactly one unique, verified email address (`user.email`). There are no placeholder emails, synthetic tenant addresses, or unverified claims.
- **Authentication Identities**:
  - **Email OTP**: Hashed, short-lived, single-use verification challenges stored in the Better Auth `verification` table. Proves mailbox ownership upon every login.
  - **Platform Google OAuth**: CourseLit operates a single, platform-owned Google OAuth client. Provider identity is stored in Better Auth's `account` table (`providerId = 'google'`, `accountId = google_subject`).
- **Global Sessions**: Stored in Better Auth's `session` table, tracking session provenance (`authenticationMethod`, `authenticatedAt`).

#### Tier 2: School Account (`school_accounts`)
A school account represents the person's profile and actor identity within a specific school tenant.

The complete persistence model and ownership rules are documented under
[Proposed data model](./accounts-management.md#proposed-data-model).

- **Persistence**: Stored in `school_accounts` (`apps/api/src/db/schema/schools.ts`).
- **Scope & Association**: Belongs to exactly one school and references the global account via `userId`:
  ```ts
  export const schoolAccounts = pgTable("school_accounts", {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    image: text("image"),
    status: text("status").$type<"active" | "deactivated">().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  });
  ```
- **Local Profile**: A user can customize their display name, avatar, and contact email for a specific school without mutating their global account or profiles in other schools.
- **Single School Actor**: Domain entities within a school—such as community posts, comments, discussion replies, reactions, and audit events—reference `school_account_id` instead of choosing between polymorphic `admin` or `learner` authors.

---

### Authorization and Capabilities

Authentication proves *who the human is*; authorization determines *what they may do within a given school context*. Capabilities attach to the school account independently:

See [Roles and capabilities](./accounts-management.md#roles-and-capabilities)
for the detailed staff, learner, product-access, and community-access contract.

| Capability Type | Persistence | Target | Rules & Behavior |
| --- | --- | --- | --- |
| **Staff Membership** | `memberships` (`apps/api/src/db/schema/schools.ts`) | `schoolAccountId` (and `userId`) | Grants administrative permissions (Owner, Full Access, Content Manager, Support, etc.). Does **not** grant automatic product or community entitlements. |
| **Learner Membership** | `learner_memberships` (`apps/api/src/db/schema/learner-memberships.ts`) | `schoolAccountId` | Grants access to specific products (`entityType = 'product'`) or communities (`entityType = 'community'`) via purchase, grant, or invitation. |

Key principles:
- **No Automatic Entitlement Escalation**: Creating or administering a school does not automatically enroll the staff member into every paid product or community.
- **Dual Role Support**: A person can simultaneously be the `Owner` of School A and a `Learner` in School A. Removing staff access leaves purchased learner entitlements intact; revoking learner access leaves administrative permissions untouched.
- **Discussion & Community Participation**: Community creators and staff participate using their single school account profile, with staff badges derived dynamically from their active permissions rather than from a duplicate identity.

---

### Multi-Domain Authentication

Because schools can run on subdomains (`<slug>.courselit.app`) or custom domains (`courses.creator.com`), and Google OAuth does not support dynamic wildcard redirect URIs, CourseLit uses a **Central Platform OAuth Hub** with secure ticket exchange:

The complete login-method and handoff contract is documented under
[School login settings and admission rules](./accounts-management.md#school-login-settings-and-admission-rules).

1. **Initiation**: The user clicks "Continue with Google" on `courses.creator.com`. The school host creates a signed authentication transaction recording the target `schoolId`, return origin, and nonce.
2. **Central Callback**: The browser redirects to Google, which returns to CourseLit's centralized redirect URI:  
   `https://api.courselit.app/api/auth/callback/google`
3. **Global Resolution & School Account Link**:
   - `apps/api` validates the Google ID token and verified email claim.
   - Finds or creates the global `user` row.
   - Resolves or provisions the `school_accounts` row for `(schoolId, user.id)`.
4. **Handoff Ticket Issuance**: `apps/api` mints a short-lived (30s TTL), single-use handoff ticket and redirects the user back to:  
   `https://courses.creator.com/auth/complete?ticket=<ticket_id>`
5. **Server-to-Server Ticket Consumption**:
   - The school host exchanges the ticket directly with the API (`POST /v1/auth/tickets/consume`).
   - The API verifies and consumes the ticket once, issuing the host-bound `school_sessions` record (`tokenDigest`, `schoolAccountId`, `userId`, `authenticationMethod`).
   - The school host sets a secure, HTTP-only, host-bound session cookie.

### Admission Rules and Session Provenance

Schools configure their allowed public/learner sign-in methods via `schools.loginMethods` (`email`, `google`):

Session ownership and application boundaries are expanded in
[Sessions and application boundaries](./accounts-management.md#sessions-and-application-boundaries).

- **Admission Enforcement**: School sessions persist their provenance (`authenticationMethod = 'email' | 'google'`).
- **Policy Changes**: If a school disables Google, global Google credentials remain intact, but active Google-authenticated sessions for that school are invalidated upon verification. Affected users can log in immediately via Email OTP with the same verified email address without account migrations or data loss.
- **Admin App Independence**: The central admin app (`admin.courselit.app`) always accepts both Email OTP and platform Google regardless of individual school login settings.

---

## Spaces

### Overview

Spaces are school-owned discussion areas. Learner access is derived from active
`learner_memberships`; following a space, seeing it in navigation, or having a
staff membership is not itself a learner entitlement.

### Data Model

Space access is represented by three layers:

| Table | Purpose |
| --- | --- |
| `spaces` | Defines the discussion area and participation settings such as `whoCanPost` and auto-follow. |
| `space_unlocks` | Declares that a space can be unlocked by one community or product. It stores the target's public ID in `entityId` and its type in `entityType`. A space may have multiple unlock rows. |
| `space_unlock_plans` | Optionally restricts one unlock to a subset of that entity's payment plans. These rows are dependent children of `space_unlocks` and are deleted with the unlock. |

The relationship is:

```text
spaces
  └── space_unlocks (zero or more community/product alternatives)
        └── space_unlock_plans (zero or more allowed plans)
```

Zero `space_unlock_plans` rows is intentional wildcard behavior: every active
learner membership for the unlock's entity qualifies. One or more plan rows
restrict that unlock to the selected plans. The child table is therefore a
zero-to-many collection, not an independently owned domain object. Keeping it
separate allows one unlock to accept multiple plans while preserving foreign-key
integrity to `storefront_plans`; putting a single `payment_plan_id` on
`space_unlocks` would either limit an unlock to one plan or duplicate the unlock
row for every plan.

No `space_unlocks` rows means the space is not available through learner
entitlements and is effectively staff-only.

### Membership Matching

At request time CourseLit loads the caller's active, school-scoped
`learner_memberships`, the school's unlocks, and the optional plan rows. Unlocks
are alternatives: matching **any** unlock grants learner access to the space.

The common predicate is:

```text
learner_membership.status = 'active'
AND learner_membership.entity_type = space_unlock.entity_type
AND learner_membership.entity_id = space_unlock.entity_id
AND (
  the unlock has no plan rows
  OR the membership's payment plan matches a selected plan
)
```

`learner_memberships.entityId` and `paymentPlanId` contain public IDs. A
`space_unlock_plans.payment_plan_id` is an internal UUID foreign key to
`storefront_plans`; access evaluation joins the plan row to
`storefront_plans.public_id` before comparing it with the membership's public
plan ID.

Checkout is the source of that membership plan association. Selecting a free or
paid plan records its public ID on the staged membership. Free fulfillment
activates it immediately when approval is not required; moderated community
memberships remain pending until approved, and paid memberships become active
only after a verified payment event. Space access never infers the plan from the
payment provider at read time.

### Community Unlocks

A community unlock matches a membership with:

```text
entityType = 'community'
entityId = the school's singleton community public ID
```

- No selected plans grants access to every active member of the community.
- Selected plans grant access only when the community membership's
  `paymentPlanId` is one of those community plans.
- The default `General` space is provisioned with an unrestricted community
  unlock.

### Product Unlocks

A product unlock matches a membership with:

```text
entityType = 'product'
entityId = the product public ID
```

- No selected plans grants access to every active membership for that product,
  including both direct purchases and product memberships derived from a
  community plan.
- Selected product plans grant access only to direct product memberships whose
  `paymentPlanId` is one of those product plans.
- A derived included-product membership stores its parent community plan for
  financial tracing. It must not compare that community plan ID against a
  product-plan restriction, so `isIncludedInPlan = true` memberships only match
  unrestricted product unlocks.
- Enabling discussions for a course creates a canonical space with an
  unrestricted product unlock. Administrators may subsequently restrict it to
  selected direct-purchase plans.

### Read Access Versus Participation

Unlock evaluation determines whether the learner can discover and read the
space and its posts. `spaces.whoCanPost` and the community membership role are
evaluated separately when creating content. A `space_followers` row controls
feed/notification subscription only; it never grants access and cannot preserve
access after the last matching membership becomes inactive.

## Media

CourseLit's media table is the tenant-scoped catalog for uploaded assets. A
media record has a category in addition to its access policy and resource
references.

### Categories

| Category | Meaning | Default admin list behavior |
| --- | --- | --- |
| `library` | Assets uploaded by school staff for reuse in school content. | Included by default. |
| `user_uploads` | Assets uploaded from the storefront by learners, such as community attachments and profile photos. | Hidden by default; available through the `User uploads` category filter. |

The category is assigned by the API upload flow rather than accepted from the
browser. Admin uploads are stored as `library`; learner upload endpoints are
stored as `user_uploads`.

### Learner Uploads

Learner uploads remain normal tenant-scoped media records, so existing media
references and deletion safeguards continue to apply. They are not included in
`GET /v1/media` unless the caller requests `category=user_uploads`. The admin
media page exposes this as the `User uploads` category, while direct media
lookups continue to work for assets already referenced by school content.

---

## Reference Source Files

### Account References

- **Accounts Management PRD**: [`apps/api/docs/accounts-management.md`](./accounts-management.md)
- **Better Auth Generated Schema**: [`apps/api/src/db/schema/auth.generated.ts`](../src/db/schema/auth.generated.ts)
- **School & Account Schema**: [`apps/api/src/db/schema/schools.ts`](../src/db/schema/schools.ts)
- **Learner Memberships Schema**: [`apps/api/src/db/schema/learner-memberships.ts`](../src/db/schema/learner-memberships.ts)
- **Authentication Runtime**: [`apps/api/src/auth/authenticate.ts`](../src/auth/authenticate.ts)
- **School Context Resolution**: [`apps/api/src/school-context.ts`](../src/school-context.ts)
- **Better Auth Configuration Options**: [`apps/api/src/auth/options.ts`](../src/auth/options.ts)

### Space References

- **Community and Spaces PRD**: [`apps/api/docs/one-community-per-school.md`](./one-community-per-school.md)
- **Spaces and Unlocks Schema**: [`apps/api/src/db/schema/spaces.ts`](../src/db/schema/spaces.ts)
- **Learner Memberships Schema**: [`apps/api/src/db/schema/learner-memberships.ts`](../src/db/schema/learner-memberships.ts)
- **Space Access Evaluation**: [`apps/api/src/space-access.ts`](../src/space-access.ts)
- **Space Domain Service**: [`apps/api/src/spaces.ts`](../src/spaces.ts)

### Media References

- **Media Schema**: [`apps/api/src/db/schema/catalog.ts`](../src/db/schema/catalog.ts)
- **Media Service**: [`apps/api/src/media.ts`](../src/media.ts)
- **Admin Media Page**: [`apps/admin/app/media/page.tsx`](../../admin/app/media/page.tsx)
