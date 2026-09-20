# CourseLit API Architecture

**Status:** Living Architecture  
**Scope:** Identity, Multi-Tenancy, Authentication, Authorization, and Data Boundaries

---

## How CourseLit Implements Global & School Accounts

CourseLit implements a **Teachable-style two-tier identity system** that unifies human authentication globally across all schools and administrative surfaces, while keeping authorization and actor profiles strictly scoped to each individual school tenant.

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

### 1. Architectural Boundary & Role of `@codelitdev/oauth-server-kit`

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

### 2. The Two-Tier Identity Model

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

### 3. Orthogonal Authorization & Capabilities

Authentication proves *who the human is*; authorization determines *what they may do within a given school context*. Capabilities attach to the school account independently:

| Capability Type | Persistence | Target | Rules & Behavior |
| --- | --- | --- | --- |
| **Staff Membership** | `memberships` (`apps/api/src/db/schema/schools.ts`) | `schoolAccountId` (and `userId`) | Grants administrative permissions (Owner, Full Access, Content Manager, Support, etc.). Does **not** grant automatic product or community entitlements. |
| **Learner Membership** | `learner_memberships` (`apps/api/src/db/schema/learner-memberships.ts`) | `schoolAccountId` | Grants access to specific products (`entityType = 'product'`) or communities (`entityType = 'community'`) via purchase, grant, or invitation. |

Key principles:
- **No Automatic Entitlement Escalation**: Creating or administering a school does not automatically enroll the staff member into every paid product or community.
- **Dual Role Support**: A person can simultaneously be the `Owner` of School A and a `Learner` in School A. Removing staff access leaves purchased learner entitlements intact; revoking learner access leaves administrative permissions untouched.
- **Discussion & Community Participation**: Community creators and staff participate using their single school account profile, with staff badges derived dynamically from their active permissions rather than from a duplicate identity.

---

### 4. Multi-Domain Authentication & Ticket Handoff Flow

Because schools can run on subdomains (`<slug>.courselit.app`) or custom domains (`courses.creator.com`), and Google OAuth does not support dynamic wildcard redirect URIs, CourseLit uses a **Central Platform OAuth Hub** with secure ticket exchange:

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

---

### 5. Admission Rules & Session Provenance

Schools configure their allowed public/learner sign-in methods via `schools.loginMethods` (`email`, `google`):

- **Admission Enforcement**: School sessions persist their provenance (`authenticationMethod = 'email' | 'google'`).
- **Policy Changes**: If a school disables Google, global Google credentials remain intact, but active Google-authenticated sessions for that school are invalidated upon verification. Affected users can log in immediately via Email OTP with the same verified email address without account migrations or data loss.
- **Admin App Independence**: The central admin app (`admin.courselit.app`) always accepts both Email OTP and platform Google regardless of individual school login settings.

---

### 6. Reference Source Files

- **Identity PRD**: [`apps/api/docs/teachable-style-identity-management.md`](./teachable-style-identity-management.md)
- **Better Auth Generated Schema**: [`apps/api/src/db/schema/auth.generated.ts`](../src/db/schema/auth.generated.ts)
- **School & Account Schema**: [`apps/api/src/db/schema/schools.ts`](../src/db/schema/schools.ts)
- **Learner Memberships Schema**: [`apps/api/src/db/schema/learner-memberships.ts`](../src/db/schema/learner-memberships.ts)
- **Authentication Runtime**: [`apps/api/src/auth/authenticate.ts`](../src/auth/authenticate.ts)
- **School Context Resolution**: [`apps/api/src/school-context.ts`](../src/school-context.ts)
- **Better Auth Configuration Options**: [`apps/api/src/auth/options.ts`](../src/auth/options.ts)
