# PRD: Teachable-style identity management

**Status:** Proposed for implementation

**Scope:** Authentication, school accounts, team access, learner access, public
school login, admin app, learner app, and API

**Last updated:** 2026-09-19

## Summary

CourseLit will use one human identity system across the admin and learner
experiences while keeping authorization school-scoped.

The global identity system is implemented with Better Auth and the shared
`@codelitdev/oauth-server-kit` integration used by FrontLit and SendLit.
Better Auth persists the canonical user, provider identities, sessions, and
verification challenges. The OAuth server kit supplies the shared session and
OAuth protocol boundary; it does not define or persist a product-specific
account record. CourseLit deliberately treats the Better Auth `user` subject
as the global CourseLit account and adds `school_accounts` for school-local
identity.

A person has one global CourseLit account and one school account for every
school in which they participate. The school account is the person's profile
and actor identity inside that school. Administrative permissions and learner
access are independent relationships attached to the school account.

```text
CourseLit account (global person and canonical verified email)
    |
    +-- Email OTP identity
    +-- Optional platform Google identity
    |
    +-- School account: School A
    |      +-- School profile (local name, avatar, contact email)
    |      +-- Staff membership: owner
    |      +-- Product memberships
    |      +-- Community memberships
    |
    +-- School account: School B
           +-- School profile (local name, avatar, contact email)
           +-- Staff membership: content manager
           +-- Product memberships
```

This follows the proven core of Teachable's account model: one central account
is associated with individual accounts and roles across multiple schools. It
does not mean that a global login grants access to every school, or that an
administrator is automatically enrolled in every product.

By focusing V1 on **Email OTP** and a single **platform-owned Google OAuth**
integration—and explicitly omitting SAML/OIDC enterprise SSO—the identity
architecture is dramatically simpler, safer, and faster to deliver. Both
supported login methods yield a globally verified email, eliminating the need
for placeholder emails, unverified school-controlled claims, school-specific
OAuth/SAML credentials, cross-realm handoffs, or complex merging flows.

This PRD replaces the product direction in
[`admin-and-learner-identities-separation.md`](./admin-and-learner-identities-separation.md).
That ADR must be marked superseded when implementation of this PRD begins.

## Problem

The current architecture represents an administrator and a learner as
different Better Auth users, even when they are the same human. It therefore
requires links, handoff tokens, duplicate provider records, separate profile
updates, and separate sessions before an owner can use learner features.

This creates avoidable product problems:

- a school owner is not naturally visible as a learner-side community actor;
- administrators need a linking flow to preview and participate in their own
  products and communities;
- names, avatars, email addresses, and provider links can diverge;
- one person managing multiple schools accumulates parallel identities;
- per-school credential storage and custom provider configuration complicate
  the admin-versus-learner boundary; and
- APIs and content records need polymorphic `admin` or `learner` authors.

The system needs one answer to "who is this human?" and separate answers to
"what may this human do in this school and resource?"

## Goals

- Give each human one global CourseLit account with a single, canonical,
  verified email.
- Give that account a separate, school-scoped profile in every relevant school.
- Allow the same person to be an owner, staff member, learner, community
  moderator, or any combination of those capabilities.
- Support one person belonging to multiple schools with different roles,
  profiles, login methods, and access in each school.
- Make owners immediately usable as actors in the school they create.
- Keep administrative permissions separate from paid or granted learner
  access.
- Preserve `learner_memberships` as the source of product and community
  access.
- Support Email OTP and platform-owned Google on school websites without
  school-specific credentials or school-scoped authentication identities.
- Centralize Google OAuth callbacks at the primary API service
  (`api.courselit.app`) with secure ticket exchange for subdomains and custom
  domains.
- Allow schools to set admission rules via `schools.loginMethods` (`email`,
  `google`), backed by session provenance.
- Use one identity realm while allowing app- and host-specific session cookies.
- Remove admin/learner polymorphism from authorship and other person-owned
  domain records.

## Non-goals

- A login does not grant access to every CourseLit school.
- A staff membership does not enroll the person in every product or community.
- Unverified email claims are not account identities in V1; every account is
  anchored to a verified email.
- This PRD does not include SAML, OIDC, or enterprise school SSO in V1.
- Schools do not configure their own OAuth applications or IdP credentials;
  CourseLit operates a single platform-owned Google OAuth application.
- Enterprise IdP enforcement, SCIM, centralized employee offboarding via IdP,
  and org-controlled MFA are deferred to a post-V1 enterprise milestone.
- This PRD does not add affiliate functionality.
- This PRD does not replace `learner_memberships` with roles or team
  permissions.

## Product principles

### Authentication and authorization are separate

Authentication establishes the global person. Authorization is always
evaluated in a server-resolved school and resource context.

```text
Administrative operation
    = authenticated person
    + school account
    + active staff membership
    + required permission

Learner operation
    = authenticated person
    + school account
    + active learner membership or explicit public access rule

Community moderation
    = authenticated person
    + school account
    + active community membership with moderate access
      OR a staff permission that explicitly permits moderation
```

### Shared authentication infrastructure

CourseLit must reuse `@codelitdev/oauth-server-kit` rather than implementing a
separate OAuth authorization server, bearer verifier, hosted consent flow, or
MCP OAuth discovery layer.

The boundary is:

| Concern | Owner |
| --- | --- |
| Global user, provider identities, OTP verification rows, and sessions | Better Auth |
| Better Auth OAuth-provider configuration, hosted login/consent plumbing, access-token verification, resource audiences, and MCP protected-resource discovery | `@codelitdev/oauth-server-kit` |
| CourseLit account meaning and global profile | CourseLit, represented by the Better Auth `user` row |
| School-local profile and actor identity | CourseLit `school_accounts` |
| Staff permissions and learner entitlements | CourseLit memberships |
| School-host login transactions, handoff tickets, and school-session admission | CourseLit, built on the authenticated global subject |

The OAuth server kit returns a normalized authenticated identity whose
`subject` is the Better Auth user ID. CourseLit then resolves that subject to
the CourseLit account and, when required, to the current school account and
staff or learner relationship. No OAuth scope or token claim substitutes for
those live CourseLit authorization relationships.

The externally documented REST API and MCP server are administrative
surfaces. Their OAuth resources and scopes use the shared kit. Learner and
public websites use separate application endpoints and school sessions even
when the same `apps/api` process hosts them.

### Every global account has a canonical verified email

Every global CourseLit account is bound to one unique, verified email address
(the Better Auth `user.email`). Both supported authentication methods—Email OTP
and platform Google OAuth—prove mailbox ownership. The system never creates
placeholder emails, synthetic domain addresses, or unverified accounts.

### A school account is not an enrollment

Creating a school account means the person can have a profile and act inside
that school. It does not provide access to paid lessons, downloads, or private
communities. Those remain governed by `learner_memberships`.

### One actor identity per school

Posts, comments, reactions, progress, checkout records, and audit events refer
to the school account. They do not choose between an admin author and learner
author. Staff badges and moderation controls are derived from current
authorization, not from a second identity.

### School context is server-authoritative

The school is resolved from a verified host, an authenticated admin selection,
or a signed one-time continuation. A request cannot select a school solely by
submitting an arbitrary school ID.

## Terminology

### CourseLit account

The global representation of a human. It owns authentication identities and
global account settings. It does not itself confer access to a school.

Its canonical persisted identity is the Better Auth `user` row. Unlike
FrontLit, CourseLit does not require a second product `accounts` table between
the Better Auth subject and school accounts. `@codelitdev/oauth-server-kit`
normalizes session and OAuth authentication for this subject but does not own
the row.

Global data includes:

- stable person ID;
- canonical verified email (`user.email`);
- Email OTP identity;
- optional platform Google identity;
- global name and avatar defaults;
- global sessions (recording `authenticationMethod` and `authenticatedAt`) and
  security history.

### Authentication identity

A credential or provider identity that can authenticate a CourseLit account. In
V1, there are two:

- **Email OTP**: CourseLit issues a one-time code to the email address.
- **Platform Google**: Google OAuth ID token issued by CourseLit's platform
  application.

Both methods verify email ownership. Uniqueness is based on the normalized
email address and immutable provider subject.

### School account

The person's profile and actor identity within one school. There is at most
one school account for a `(school, CourseLit account)` pair.

School-scoped data includes:

- display name and avatar;
- contact email visible to that school;
- active or deactivated status;
- school preferences and notification settings; and
- references from content, commerce, progress, and community activity.

The global name and avatar initialize a new school account. A person may then
customize the school profile without changing their profile in other schools.

### Staff membership

The relationship that grants administrative permissions in a school. It is
independent of learner memberships.

### Learner membership

The existing durable, school-scoped access relationship to a product or
community. Payments, subscriptions, included products, progress, evaluations,
downloads, and community access continue to depend on it.

## Roles and capabilities

CourseLit must not implement one enum that attempts to answer every
authorization question. Roles exist at different scopes.

### School staff roles

Only `Owner` is a special authorization role. Other labels are permission
presets stored as explicit grants. Changing a preset changes its grants; API
authorization still checks permissions rather than trusting the label.

| Role or preset | Scope | Capabilities |
| --- | --- | --- |
| Owner | School | Every school permission plus ownership transfer, school deletion, billing ownership, and other owner-only operations. |
| Administrator (`full_access`) | School | Every existing CourseLit permission for day-to-day administration. Cannot transfer ownership or perform operations reserved exclusively for the owner. |
| Content manager | School | Create and manage products, lessons, media, certificates, and communities; read learner information needed for delivery. |
| Support | School | Read products, learners, and communities. No mutation or billing administration by default. |
| Marketing | School | Read and manage the storefront and read communities. No learner records, billing administration, or course authoring by default. |
| Read-only | School | Read permitted administrative resources without mutation. |
| Custom | School | An owner or authorized administrator selects individual permissions. |

The existing permission identifiers and implications remain the API source of
truth. Owner-only operations must additionally check the owner flag; holding
all ordinary permissions is not equivalent to ownership.

The initial preset mappings remain:

- `full_access`: all CourseLit permissions;
- `content_manager`: product read/write, learner read, media read/write,
  certificate read/write, and community read/write;
- `support`: product read, learner read, and community read;
- `marketing`: storefront read/write and community read;
- `read_only`: non-team read permissions; and
- `custom`: grants selected individually from permissions the inviting or
  editing actor may delegate.

The school must always have an owner. Ownership transfer is an explicit,
audited operation that atomically promotes the recipient and demotes the prior
owner. V1 has one owner per school.

### Learner capability

`Learner` is a product-facing capability, not a mutually exclusive global
role. Every active school account can browse public school content and can
acquire learner memberships. Access to a protected resource requires the
corresponding active learner membership.

A person may therefore be both `Owner` and a learner in the same school.
Neither capability erases or implies the other.

### Product access

Product access is represented by an active `learner_membership` whose entity
type is `product`. Product memberships do not carry a school staff role.

- Purchases, grants, imports, and included-product rules create memberships.
- Removing a staff membership does not remove purchased learner access.
- Removing learner access does not remove staff permissions.
- Staff with `products:read` may receive a short-lived preview grant without a
  durable learner membership.
- Preview mode does not create progress, certificates, or a purchase.
- Staff with `products:write` may participate in and moderate product
  discussions as staff. Other staff require an active learner membership to
  participate.

### Community access levels

Community capability is stored on the community's `learner_membership`:

| Access level | Capabilities |
| --- | --- |
| `comment` | View allowed content, react, and comment. |
| `post` | Everything in `comment`, plus create posts. |
| `moderate` | Everything in `post`, plus pin, edit, remove, review reports, and manage community participation as permitted. |

Community creation must create an active community learner membership with
`moderate` access for the creating school account. This makes the creator
visible in the learner community without manufacturing another identity.

The `communities:moderate` staff permission may also authorize moderation, but
it does not silently create a paid community membership. The API must make the
difference between staff moderation and learner membership explicit.

### Roles not included in V1

- `Author` is represented by content permissions in V1. Resource-specific
  author ownership can be introduced later if CourseLit needs an author who
  may manage only assigned products.
- `Affiliate` is a commerce relationship and must not be an authentication
  role.
- Internal CourseLit operator access is outside school roles and must use a
  separately audited support mechanism.

## Required user experiences

### School creation

1. An authenticated CourseLit account creates a school.
2. The transaction creates the school and verified primary host.
3. It creates a school account linked to the creator's CourseLit account.
4. It creates the owner staff membership for that school account.
5. It selects the new school in the admin app.
6. It does not enroll the owner in every product.

The owner can immediately preview products and act as the creator or moderator
of communities through explicit staff capabilities. No admin-to-learner link
or second sign-in is required.

### Joining a school as a learner

1. The learner opens a page on a verified school host (subdomain or custom
   domain).
2. The API resolves the school from that host.
3. The UI fetches and displays only that school's enabled login methods
   (`email`, `google`).
4. Authentication resolves or creates the CourseLit account:
   - If Email OTP: verifies the code sent to the entered email.
   - If Google: redirects via the central `api.courselit.app` OAuth hub,
     validating the Google token and verified email claim.
5. The API resolves or creates the person's school account.
6. Checkout, a free join, an invitation, or an admin grant creates the
   relevant learner membership.

Authentication alone never completes a purchase or grants protected content.

### Staff invitation

1. An authorized staff member invites an email address with a permission
   preset or custom grants.
2. The invitation is school-scoped, expiring, single-use, and stored as a
   digest.
3. The recipient authenticates a CourseLit account and proves control of the
   invited address via Email OTP or Google.
4. CourseLit reuses or creates the school account.
5. CourseLit adds the staff membership without changing learner memberships.

If the recipient was already a learner in the school, the existing school
account gains staff capability. It is not duplicated.

### Admin login

School login settings affect only public and learner access. The central admin
app supports CourseLit's platform Email OTP and Google independently of any
individual school's settings.

Once authenticated, admin authorization remains:
```text
global account
+ school account
+ active staff membership
+ required permission
```

A learner promoted to staff does not need a new identity or separate sign-in.

### One person in multiple schools

The global account switcher lists only schools for which the person has a
school account with an active staff membership or learner access. Each school
retains its own:

- profile (display name, avatar, contact email);
- staff role and permissions;
- product and community memberships;
- progress and notifications; and
- enabled login methods.

Signing into School A must not create or authorize a school account in School
B.

### Account and profile editing

- Global security settings manage verified email identities, Google linking,
  and active global sessions.
- The learner account page edits the active school account's display name and
  avatar.
- The admin account page may edit both the global defaults and the selected
  school's profile, with clear labels.
- A school profile update is immediately reflected in learner-facing posts,
  comments, and community membership displays.
- Changing a display contact email in a school profile does not alter the
  canonical global `user.email` or authentication credentials.

### Leaving and offboarding

- Leaving a product or community changes only the relevant learner membership.
- Removing a staff member changes only the staff membership.
- Deactivating a school account blocks all school activity but does not delete
  the global account or access to other schools.
- Deleting the global account follows a dedicated workflow covering every
  linked school account and legal retention requirements.

## School login settings and admission rules

### Configuration

A school configures its allowed public and learner login methods via
`schools.loginMethods`:

- `email` (Email OTP): enabled/disabled
- `google` (Platform Google OAuth): enabled/disabled

At least one method must remain enabled. Schools store no Google client ID,
client secret, SAML metadata, or IdP certificates; CourseLit operates a single
platform-owned Google application.

These settings are **admission rules**, not merely button-visibility flags. A
school session can be created only after authentication through a method
currently enabled for that school.

Examples:
- **Both `email` and `google` enabled**: Either method is accepted.
- **Only `email` enabled**: Users authenticated via Google cannot establish a
  session for this school until they complete Email OTP.
- **Only `google` enabled**: Users authenticated via Email OTP must
  authenticate with Google to access this school.
- **Google later disabled**: The user's global Google identity remains intact,
  but their existing Google-based sessions for this school are invalidated.
  The user can immediately log in with Email OTP using their verified email
  without any account-linking migration.

### Login context

Every school login begins with a server-created authentication transaction
containing:

- the resolved school ID;
- the verified return origin and path;
- the selected method (`email` or `google`);
- a nonce and PKCE material where applicable;
- creation and expiry timestamps; and
- an integrity-protected state value.

The callback consumes this transaction once. A client-supplied school ID,
redirect URL, or provider ID cannot replace the recorded values.

### Email OTP

1. The school host offers Email OTP only when `email` is enabled in
   `schools.loginMethods`.
2. CourseLit normalizes the address, applies rate limits, and sends a
   single-use, short-lived code.
3. When the user verifies the OTP:
   - Locate the global account matching the normalized email.
   - If no account exists, create it with `emailVerified = true`.
   - Resolve or create the school account for `(school_id, user.id)`.
   - Issue a school session recording `authenticationMethod = 'email'` and
     `authenticatedAt = now()`.

Because CourseLit directly verifies mailbox control, matching on normalized
email is completely safe.

### Platform Google

CourseLit owns one Google OAuth application. Schools only control whether the
Google button is enabled on their login page.

#### Central Platform OAuth Hub (`api.courselit.app`)
Google Cloud Console does not permit wildcard subdomains (`*.courselit.app`) or
dynamic registration of customer custom domains (`courses.alice.com`).
Therefore, `apps/api` (serving as `api.courselit.app`) acts directly as the
centralized platform OAuth hub. All Google OAuth transactions register a single,
fixed redirect URI with Google:
`https://api.courselit.app/api/auth/callback/google`.

#### Authentication & ticket exchange flow:
1. **Initiation**: The learner clicks "Continue with Google" on a school host
   (e.g., `school-a.courselit.app` or `courses.alice.com`).
2. **Redirect to Google**: The school host redirects the user to Google OAuth
   with:
   - `redirect_uri = https://api.courselit.app/api/auth/callback/google`
   - `state` = an opaque, signed, single-use transaction handle. The
     server-side transaction stores `schoolId`, the verified return origin,
     return path, nonce, and expiry; those values are not accepted from the
     callback query.
3. **Google Callback to `apps/api`**: Google returns an ID token and
   authorization code to `https://api.courselit.app/api/auth/callback/google`.
4. **Token validation**: `apps/api` validates issuer
   (`https://accounts.google.com`), audience (platform client ID), nonce,
   signature, subject, and `email_verified == true`.
5. **Account resolution**: Locate the existing account by Google subject, or by
   canonical verified email. Link Google or create a new global account.
6. **School account**: Resolve or create the school account for
   `(school_id, user.id)`.
7. **Ticket issuance**: `apps/api` mints a short-lived (30-second TTL),
   single-use handoff ticket and issues a 302 redirect to:
   `https://<school-host>/auth/complete?ticket=<ticket_id>`
8. **Ticket consumption**: The school host backend exchanges the ticket
   server-to-server with `apps/api`:
   `POST https://api.courselit.app/v1/auth/tickets/consume`
   `apps/api` verifies and invalidates the ticket, returns the school session
   token, and the school host sets its first-party, secure, HTTP-only session
   cookie.

Schools store no Google client ID or secret.

### Disabling a login method (e.g. disabling Google)

If a school disables Google:
1. Remove Google from its public login page.
2. Reject pending Google authentication transactions for that school.
3. Revoke or invalidate active school sessions that were established through
   Google (checked via session provenance `authenticationMethod`).
4. Preserve the global CourseLit account and Google provider link.
5. Preserve all school memberships, purchases, progress, and activity.
6. Permit immediate Email OTP login using the same verified email (assuming
   `email` is enabled).
7. Do not affect Google login on other schools or in CourseLit's central admin
   app.

Because the session records `authenticationMethod` and `authenticatedAt`,
policy changes can enforce admission rules and invalidate affected sessions
cleanly without per-school provider tables.

### Existing session on a school host

When an authenticated user lands on a school host, the server verifies that
the session's `authenticationMethod` complies with the school's current
`schools.loginMethods`. If the school currently permits only Email OTP and the
session was created via Google, the session is not accepted for that school,
and the user is prompted to verify via Email OTP.

## Sessions and application boundaries

One identity realm does not require one cookie on every domain.

- **Central API Hub**: `api.courselit.app` (backed directly by `apps/api`)
  hosts platform authentication endpoints (`/api/auth/*`), the externally
  documented admin REST API, MCP OAuth resources, and separately classified
  learner/public application endpoints.
- **Admin App**: Uses a CourseLit global session and resolves a selected school
  for administrative requests.
- **School Subdomains & Custom Domains**: Establish school-scoped application
  sessions via the single-use ticket exchange after completing authentication
  at `api.courselit.app`.
- **First-party Cookies**: School session cookies are host-only, secure,
  HTTP-only, and bound to the school resolved by the server. No third-party
  cookies are required.
- **Session Provenance**: Every school session records `authenticationMethod`
  ('email' | 'google') and `authenticatedAt`.
- **Sign-out Scope**: Signing out of one school session does not sign the
  person out of every school. Global "sign out everywhere" revokes all derived
  sessions.

The API never accepts an untrusted person ID or school account ID in place of
session resolution.

## Proposed data model

Names are descriptive and may be adjusted to match repository conventions.

### Global identity tables

`user` remains the global CourseLit account and Better Auth subject.

- Better Auth `user.email` is the unique, canonical, verified email.
- Every account has exactly one verified email.
- No placeholder or synthetic emails exist.

`account` stores authentication identities:

- Platform Google OAuth identity (`provider = 'google'`, `accountId = google_subject`).
- No school-scoped SSO providers, no school-owned Google credentials, and no
  `ssoConfig` tables.

Email OTP has no long-lived provider account. Hashed, expiring, single-use OTP
challenges live in Better Auth verification records and establish the verified
`user.email` when consumed.

`session` stores global sessions and records `authentication_method` and
`authenticated_at`, either directly or in a required companion provenance
table.

`school_sessions` stores only a token digest and records:

- `user_id`, `school_id`, and `school_account_id`;
- `authentication_method` (`email` or `google`) and `authenticated_at`;
- source global session or authentication transaction;
- verified hostname;
- creation, expiry, and revocation timestamps.

`authentication_transactions` persist the server-authoritative school,
method, verified return origin/path, nonce, PKCE material, expiry, and consumed
state. `auth_handoff_tickets` persist only a ticket digest, bind it to the same
school and verified hostname, expire after 30 seconds, and are consumed once.

### School accounts

Introduce `school_accounts`:

| Column | Purpose |
| --- | --- |
| `id` / `public_id` | Stable school actor identity. |
| `school_id` | Required school scope. |
| `user_id` | Global CourseLit account. |
| `email` | School-visible contact email. |
| `display_name` / `image` | School-local profile. |
| `status` | `active` or `deactivated`. |
| timestamps | Lifecycle and auditing. |

Enforce unique `(school_id, user_id)`. School-visible email does not need to be
a cross-school identity key.

The current `learners` table should become this concept. Because this codebase
has no production deployment, rewrite the baseline schema instead of adding
compatibility layers.

### Staff memberships

The current `memberships` table becomes an administrative relationship to a
`school_account` rather than directly to a global auth user. It retains:

- owner status;
- explicit permissions;
- permission preset metadata for UI convenience; and
- timestamps and audit history.

### Learner memberships

`learner_memberships` remains the source of product and community access. Its
person reference changes from the old learner identity to `school_account_id`.
All lesson progress, evaluations, SCORM runtime data, downloads, checkout,
payments, invoices, subscriptions, and included-product access continue to
reference learner memberships as required by the domain model.

### Authorship and ownership references

Replace dual columns such as `learner_id` and `admin_user_id` with one
`school_account_id`. This applies to community posts and comments, product
discussions, reactions, media ownership where applicable, and notifications.

Audit events may additionally retain the global user ID for security
investigations, but domain display and school authorization use the school
account.

### Tables and concepts removed by the pivot

Removing the split realm and school SSO eliminates:

- `learner_user`, `learner_account`, `learner_session`, and
  `learner_verification` (the second Better Auth realm);
- `learner_auth_links`;
- `learner_admin_links`;
- learner identity-link handoff tokens;
- legacy learner password credentials;
- author-kind checks that choose between learner and admin identities;
- school SSO tables and columns (`ssoConfig`, SAML/OIDC metadata, certificates,
  and school provider records);
- school-scoped OAuth credentials and secrets encryption;
- SSO-only accounts without verified emails;
- placeholder authentication emails;
- school-controlled identity claims and impersonation vectors; and
- complex account-merging requirements caused by untrusted SSO email claims.

## API behavior

Every authenticated request resolves an actor context similar to:

```ts
type ActorContext = {
  userId: string;
  schoolId: string;
  schoolAccountId: string;
  staff: null | {
    isOwner: boolean;
    permissions: CourseLitPermission[];
  };
};
```

Resource services then load the relevant `learner_membership` when learner
access is required. Staff permissions must never be converted into learner
memberships implicitly inside generic authorization middleware.

Public endpoints remain anonymous. The presence of an unrelated global
session must not change host resolution or expose another school's data.

## Account resolution and linking

Because both Email OTP and platform Google produce globally verified emails,
account resolution is simple, deterministic, and safe:

1. **Existing Google link**: If a Google login matches an existing `account`
   record by Google subject, authenticate that CourseLit account.
2. **Canonical verified email match**: Otherwise, find the CourseLit account
   by the normalized verified email from Google or Email OTP.
3. **Auto-link on verified email**: If the account exists, link the Google
   identity to it (since Google has verified the email) or authenticate via
   OTP.
4. **New account creation**: If no account matches, create a new CourseLit
   account with that verified email.

This model eliminates:
- SSO-only accounts without verified emails.
- Placeholder authentication emails.
- School-controlled identity claims.
- Cross-realm identity handoffs.
- Complicated account merging caused by SSO claims.
- The risk of one school impersonating an existing global account.

Because the email is verified in both paths, a user who logs in with Google on
Monday and Email OTP on Tuesday seamlessly accesses the exact same CourseLit
account and school accounts without requiring an account-linking migration.

## Remaining trade-offs

The decision to omit enterprise SAML/OIDC SSO in V1 is commercial rather than
architectural:

- **Enterprise IdP enforcement**: Enterprise customers cannot enforce their
  corporate IdP (Okta, Azure AD, Ping) on their school portal in V1.
- **Offboarding**: No centralized employee or student offboarding through an
  IdP SCIM/SAML hook; access must be revoked in CourseLit directly.
- **Corporate policies**: No organization-controlled MFA or conditional access
  policies enforced at the school level.
- **Google availability**: Google login may be unavailable or prohibited in
  some enterprise or restricted education environments, leaving Email OTP as
  the sole method.
- **Email delivery dependency**: Email delivery becomes mission-critical
  because Email OTP is the universal fallback for all schools.

By storing `authenticationMethod` and clean provider identity records,
extensibility for future enterprise SSO is preserved without burdening V1 with
per-school provider management.

## Security requirements

- School and return URL context is integrity-protected throughout login via
  signed state and nonces.
- Google token validation verifies issuer, audience, nonce, signature, subject,
  and `email_verified == true`.
- OAuth uses state and PKCE.
- Central redirect URI at `api.courselit.app` ensures Google tokens cannot be
  intercepted by unverified custom domains.
- Trusted origins and ticket return hosts are loaded from verified
  `school_hosts`; request-provided `Origin`, host, or redirect headers never
  extend the allowlist by themselves.
- Single-use handoff tickets have strict 30-second TTLs and are exchanged only
  server-to-server.
- Authentication completion rotates session identifiers and applies CSRF
  protection to every state-changing browser request.
- OTP values are hashed, single-use, short-lived, and rate-limited by address,
  IP, school, and transaction.
- CourseLit operates the single platform Google OAuth client; no per-school
  client secrets exist to be leaked.
- Session provenance (`authenticationMethod`, `authenticatedAt`) is enforced
  against `schools.loginMethods` on school hosts.
- Staff permission checks and learner membership checks occur in the API, not
  only in browser navigation.
- School sessions cannot be replayed against another host or school.
- Ownership transfer, role changes, and school account deactivation produce
  audit events.
- Ownership transfer, login-method changes, Google unlinking, and global email
  changes require recent authentication through a platform method.
- Deactivated school accounts and revoked staff or learner relationships fail
  closed immediately.

## Migration and implementation plan

This is a pre-production schema pivot in early development. All Drizzle
migrations will be rewritten from scratch into a single clean baseline
migration file (`0000_baseline.sql`), and development databases can be reset
fully at discretion rather than maintaining transitional schemas.

### Phase 1: Domain model

1. Add the canonical `school_accounts` model.
2. Point staff memberships and learner memberships to school accounts.
3. Replace polymorphic admin/learner authorship with school-account authorship.
4. Update school creation to create the owner school account and owner staff
   membership atomically.
5. Update invitations to attach staff permissions to an existing school
   account when present.

### Phase 2: Unified authentication

1. Make the existing global Better Auth user the only human auth principal,
   anchored by canonical verified `email`.
2. Standardize session resolution, OAuth-provider configuration, hosted OAuth
   pages, bearer verification, resource audiences, and MCP discovery on
   `@codelitdev/oauth-server-kit`, following the shared FrontLit/SendLit
   integration boundary.
3. Remove the learner Better Auth realm and its generated tables.
4. Configure Email OTP and platform-owned Google OAuth in the unified realm.
5. Host the central Google OAuth redirect endpoint on `apps/api`
   (`https://api.courselit.app/api/auth/callback/google`).
6. Implement `schools.loginMethods` admission validation (`email`, `google`).
7. Implement signed school login transactions and callback validation.
8. Implement short-lived ticket issuance and server-to-server exchange for
   subdomain and custom-domain school sessions.
9. Remove admin-to-learner handoff and identity-link endpoints.

### Phase 3: Authorization and application UX

1. Resolve the same actor context in admin and learner APIs.
2. Preserve permission-based admin authorization and membership-based learner
   authorization.
3. Add the school/account switcher and role-aware destinations.
4. Update account pages to distinguish global security data from the active
   school profile.
5. Make preview and discussion behavior follow the rules in this PRD.
6. Display only the configured school login methods on the resolved school
   host.

### Phase 4: Cleanup and documentation

1. Remove obsolete tables, cookies, secrets, proxy routes, and tests from the
   split-realm and SSO implementations.
2. Mark the previous identity-separation ADR as superseded.
3. Document staff invitations, ownership transfer, and school login admission
   policies.
4. Add operational metrics for login failures, OTP delivery, Google callbacks,
   and session exchange failures.

## Acceptance criteria

### Identity and multi-school behavior

- One global account can own School A, administer School B, and be only a
  learner in School C.
- Each school shows the correct local profile, permissions, memberships, and
  progress.
- Creating a school atomically creates an owner school account.
- An existing learner who accepts a staff invitation gains staff capability on
  the same school account without creating a duplicate identity.
- No workflow creates duplicate school accounts for the same global user and
  school.

### Authorization

- Owner and staff permissions never create product or community entitlements.
- Product and community access continues to require active
  `learner_memberships`, except for explicit preview or moderation paths.
- A staff removal leaves legitimately purchased learner access intact.
- A learner membership removal leaves unrelated staff permissions intact.
- Community and discussion content has one school-account author identity.

### Login methods and admission rules

- Better Auth session resolution, OAuth-provider configuration, hosted OAuth
  flows, bearer verification, resource audiences, and MCP OAuth discovery use
  `@codelitdev/oauth-server-kit`; CourseLit does not maintain a parallel OAuth
  server implementation.
- The normalized OAuth/session subject resolves to the canonical Better Auth
  `user` that represents the CourseLit account.
- A school host displays only methods enabled in `schools.loginMethods`
  (`email`, `google`).
- At least one login method must remain enabled for every school.
- Email OTP and verified platform Google login resolve to the canonical global
  account and create/resolve only the current school's school account.
- Central Google OAuth callback is handled exclusively at
  `https://api.courselit.app/api/auth/callback/google`.
- Schools store no Google OAuth credentials, SAML metadata, or IdP
  certificates.
- Sessions record `authenticationMethod` and `authenticatedAt`.
- A valid global Google session cannot establish a school session when that
  school permits only Email OTP, and the inverse is also rejected.
- If a school disables Google, pending Google transactions are rejected and
  existing Google-authenticated sessions for that school are invalidated.
- Disabling Google for School A does not revoke the global Google identity,
  the admin session, or sessions for School B.
- Users affected by a disabled method can immediately authenticate via Email
  OTP without account-linking issues.
- The central admin app supports Email OTP and platform Google independently of
  any school's admission rules.
- Subdomain and custom-domain callback exchanges use short-lived handoff
  tickets consumed server-to-server to produce host-only school sessions without
  exposing reusable global tokens to browser JavaScript.
- A consumed, expired, wrong-host, or wrong-school handoff ticket is rejected
  without issuing a session.

### Regression coverage

- Owners can preview products without duplicate learner identities.
- Owners and authorized staff can participate in discussions under the same
  school profile when explicitly authorized.
- Community creators appear as members/moderators in the learner portal.
- Learners can edit their school display name without changing another
  school's profile.
- Checkout, payments, subscriptions, progress, certificates, and included
  products remain attached to learner memberships.

## Success measures

- No admin-to-learner identity-link step is required.
- No duplicate identity is created when an existing school learner becomes a
  staff member.
- Zero placeholder or unverified email accounts in the database.
- Reduced authentication-related support incidents involving missing owner
  communities, mismatched profiles, or repeated sign-in.
- Successful school-host login and custom-domain session exchange rates are
  observable per method without recording sensitive claims.
- Authorization tests demonstrate no cross-school or staff-to-entitlement
  escalation.

## References

- [Teachable: School Owner and Teachable Accounts](https://support.teachable.com/en/articles/11682395-school-owner-teachable-accounts)
- [Teachable: Setting Up and Configuring Teachable Accounts](https://support.teachable.com/en/articles/11682422-setting-up-and-configuring-teachable-accounts)
