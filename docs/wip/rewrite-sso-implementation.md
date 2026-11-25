# Learner SSO for school websites: implementation plan

Status: SAML (Phases 1–5) implemented on branch `feat/learner-sso`; OIDC (Phase 6) not started. Tracker #33. Built before the rest of tiered billing; see "Order of work, alongside tiered billing".

### Implementation notes

What changed from the plan while building it:
- **Tested against Keycloak 26.4** in a browser, end to end (admin setup from pasted metadata, test sign-in, activation, learner sign-in, enforcement, turning off). This found the disabled-connection deadlock above, and that Keycloak's default client signs only the Response, which we refuse. The admin test result now explains what to change for the fixable failure reasons.
- **Package versions:** the `@codelitdev/platform` and `@codelitdev/billing` additions are in platform PR #37. Until it's released, `apps/api/package.json` points at locally packed builds, and that must change to the published version before this branch merges.
- **Shadow user marker:** shadow users are marked by the `sso_shadow_users` table, not a `user.kind` column.
- **Ticket columns:** `school_auth_tickets` also carries `sso_connection_id` and `session_expires_at`, so the connection and the IdP's session end reach the session.
- **Plan sync on a "no":** `hasFeature` answers false when billing can't be read. So before suspending anything, the plan sync confirms a false answer with `commercialState()`, which throws on a read error, and the job then retries.
- **Billing hook jobs:** the hook queues `sync_plan_features` rows in `integration_outbox_jobs` (provider `platform`). The worker drains them every few seconds and runs an hourly sweep: cleanup, domain re-checks and a daily plan sync.
- **MCP parity:** the SSO write operations are session-only, so MCP credentials can't reach them. They are exempt in `mcp-parity.ts` and don't appear in `REACHABLE_BUT_EXEMPT`.
- **Follow-up:** there is no operation that lists the identities linked to a connection, so the admin has no unlink button yet (`unlinkSsoIdentity` exists).
- **Follow-up:** CODEOWNERS for `apps/api/src/sso-protocol/` waits on a decision about who owns it.

## Scope

- SSO lets **learners** sign in to **one school's website** through that school's own identity provider (IdP): Okta, Entra ID, OneLogin, Google Workspace and similar.
- It is configured per school. Google sign-in is different: the platform provides it, and a school can only turn it on or off.
- SSO never signs anyone in to the admin, never creates a CourseLit-wide (Better Auth) session, and never creates, verifies or changes a platform `user` by email.

## The trust problem

Google proves a person owns an email address. A school's IdP proves nothing: a school admin can make their IdP say `anyone@anycompany.com`. So whatever an SSO response says can only create or change things inside the school that owns the connection.

These parts of the current learner sign-in code must never see an SSO response:

| Code | Why it is unsafe for SSO |
| --- | --- |
| `findOrCreateVerifiedUser` (`apps/api/src/learners.ts`) | If the platform user with that email is unverified, it marks them verified and deletes their password and sessions. Any school could take over and lock out platform users. |
| `ensureSchoolAccount`, which matches by school + email | The IdP would be given any existing learner account in the school, including a team member's. |
| `admitLearner`, which updates name and image | It would change details of a platform user who isn't the IdP's to change. |

## Decisions

Decisions 1–3 and 6 were confirmed on 2026-11-13.

1. **SSO-only learners get a shadow platform user that can't sign in.** Accepted on the condition that it stays safe. The guarantees it depends on, each with a test, are under "Shadow users" and in risks 14–16 of the security review. `school_accounts.user_id` (and the `user_id` on `school_sessions` and `school_auth_tickets`) has to point at a `user`, and `communities.ts` and `team.ts` depend on that. Making `user_id` nullable means a bigger refactor; leave it for later.
2. **One connection model covers SAML and OIDC. SAML ships first** (tracker #33 and main both use SAML). OIDC follows once there's a guard on outbound requests to internal addresses (see Phase 6).
3. **On courselit.app, SSO comes with the Business plan.** The rewrite has two paid tiers, `pro` and `business`; Pro doesn't include SSO.
   - Schools with no paid plan can't use SSO either.
   - When there's no hosted billing (`billingMode = "oss"`, self-hosted), SSO is always available. See Phase 5.
4. **No IdP-initiated sign-in in v1.** Every sign-in starts from the school's website.
5. **Don't reuse main's `@better-auth/sso` plugin.** It is built around Better Auth sessions and platform users.
6. **The SAML/OIDC protocol layer stays in CourseLit, as a self-contained module `apps/api/src/sso-protocol/`. It doesn't go into `@codelitdev/oauth-server-kit`.**
   - The kit handles how people sign in to each CodeLit product's own apps. No CodeLit product lets an admin sign in with SSO, and learner SSO on school websites is CourseLit-only. The AGENTS.md rule moves code into a package only when other apps would benefit, and none would.
   - The module is still built like package code: no imports from the rest of CourseLit, a small interface (`createSamlServiceProvider`, `parseSamlIdpMetadata`, the store interfaces), and its own tests with a fixture IdP. If another product ever needs it, it moves into the kit unchanged.
   - Without the kit maintainers' security rota, CourseLit owns updates to the XML libraries. Pin exact versions and add the module to CODEOWNERS so changes to it always get an auth review.
7. **Sign-in methods per school, as on main.** A "Login providers" area turns email codes, Google and SSO on or off for each school. It ships with SSO; see Phase 4.

## CodeLit packages

Use the `@codelitdev/*` packages wherever they already do the job. Where something is missing and isn't specific to CourseLit, add it to the package rather than writing a CourseLit-only copy. Versions in use: `platform` 0.9.0, `oauth-server-kit` 0.10.0, `billing` 0.9.0, `mcp-server-kit` 0.5.0, `observability` 0.5.0, `platform-conformance` 0.9.0, `design-system` 0.5.0.

### Existing exports to use

| Need | Package export | Notes |
| --- | --- | --- |
| Public IDs for connections | `@codelitdev/platform` `createPublicId` / `parsePublicId` | Prefix `sso`, like every other public id in the API |
| IDs and time | `@codelitdev/platform` `uuidv7`, `Clock` | As in `learner-sign-in.ts` |
| Errors | `@codelitdev/platform` `createPlatformError` (with `safeDetails.reason`), `captureAndMapException` | Reason codes stay in `safeDetails` or the audit log; the browser gets one generic message |
| Encrypting the OIDC client secret | `@codelitdev/platform` `createAesGcmSensitiveValues` | Use this instead of `utils/integration-secrets.ts`. It supports `previousKeys`, so the key can be rotated. Uses its own `SSO_ENCRYPTION_KEY` / `SSO_ENCRYPTION_PREVIOUS_KEYS`. |
| Audit log | `@codelitdev/platform` `AuditPort<Context, Event>` | `school_sso_events` is written by a CourseLit implementation of this interface |
| Recent sign-in for owner-only writes | `@codelitdev/oauth-server-kit/better-auth` `isRecentlyAuthenticated` | Already wrapped in `auth/recent-authentication.ts`; `schoolOwnerOp(["session"], true)` uses it |
| Client IP for rate limits | `@codelitdev/oauth-server-kit/express` `createClientIpMiddleware` | Already in `express-app.ts`. Rate-limit the SSO start and ACS by the IP it resolves, never by raw `X-Forwarded-For`. |
| Platform sessions never created for shadow users | `@codelitdev/oauth-server-kit/better-auth` `resolveBetterAuthSession` | Besides the Better Auth `databaseHooks` guard, reject users listed in `sso_shadow_users` where the kit resolves a session, as a second layer |
| Plan check and plan-change signal | `@codelitdev/billing` `hasFeature` (new, below), `hooks.lifecycle.afterProjection` | See Phase 5 |
| MCP parity and the exemptions | `@codelitdev/mcp-server-kit` `validateParityManifest`, `McpToolRisk` | The exemptions for the SSO write operations go through the existing manifest and `mcp-api.test.ts` |
| Contract conformance | `@codelitdev/platform-conformance` `runPlatformConformance` | The new operations go through the existing conformance adapter, the same as every other operation |
| Logging and error tracking | `@codelitdev/observability` `opaqueSubjectId`, `redactText`, `isSensitiveKey` | SSO failures are logged with a hashed subject and email domain only. Never send assertion XML, attributes or emails to logs or PostHog. |
| Admin UI | `@codelitdev/design-system` | Login providers page and connection editor |

Other CodeLit products:

- **Storefront UI:** `@frontlit/page-builder` primitives only (AGENTS.md).
- **Owner emails** (config changed, domain verification lapsed, SSO suspended): use the existing school/system email path (`queueSchoolEmail` / `system-mail.ts`) and admin notifications. Don't build new email rendering; anything missing comes from SendLit's packages (`@sendlit/email-blocks`), not a CourseLit copy.
- **Marketing email off for SSO-created contacts:** use the existing `setContactMarketingSubscription` / SendLit contact sync, not new logic.

### Additions to CodeLit packages

**`@codelitdev/platform` → `createOutboundFetch(options)`.** Needed for Phase 6 (OIDC discovery and JWKS). Webhooks and anything else that fetches admin-supplied URLs can use it later. It allows https only, resolves DNS and refuses private, loopback and link-local addresses, checks again after each redirect, and caps time and response size.

**`@codelitdev/platform` → `createDomainVerification(options)`.** Needed by Phase 2 (`normalizeDomain` when matching email domains) and Phase 4 (the domain verification endpoints).

FrontLit (`apps/api/src/domains/queries.ts`) and CourseLit (`apps/api/src/school-hosts.ts`, `school-host.ts`) each have a near-identical copy of custom-domain verification:
- an ownership TXT token at `<label>.<host>`
- a routing check: the CNAME chain reaches the target, or for an apex, CNAME flattening or matching A records

So the package covers all of that, not just the TXT part SSO needs, and both apps replace their copies with it.

- `normalizeHostname(input)`: lowercase, IDN to punycode, no trailing dot, no port, path or credentials, valid labels, at least one dot. Options reject IP literals and public suffixes (`com`, `co.uk`). This replaces CourseLit's `normalizeCustomHostname`. FrontLit's `normalizeHost` reads `Host` headers, which is a different job; it stays.
- `issueOwnershipToken()`: random token, 16 bytes hex, the format both apps use today.
- `ownershipRecord(hostname, { label })` → `{ type: "TXT", name, value }`. The label is set by the product (`_courselit-verification`, `_frontlit-verify`). The record value stays the bare token, so TXT records customers have already published keep working.
- `verifyOwnership(hostname, token, { label })`: TXT lookup that matches the token after joining TXT chunks.
- `verifyRouting(hostname, { cnameTarget, aRecords })`: follows CNAME chains (with loop protection), with the apex fallback both apps use.
- `isApexHostname(hostname)`: public-suffix aware.
- The resolver can be pointed at trusted recursive DNS servers rather than whatever the container is configured with. A spoofed answer to an ownership check would grant SSO linking, so ownership checks shouldn't depend on a resolver tenants might influence.
- Every lookup goes through an injectable resolver, as CourseLit's `DnsResolver` already does. This gives FrontLit testable DNS, which it lacks today. Lookups also get a timeout (default 5 s), which neither app has today.
- No storage, no environment reads and no product rules. These stay in each app:
  - CourseLit: one custom domain per school; SSO domains unlocking identity linking.
  - FrontLit: the apex/www pair sharing one TXT record on the apex, redirect domains, opening the site to search on first verification.

**Who adopts it:**
- CourseLit SSO uses `normalizeHostname`, `issueOwnershipToken`, `ownershipRecord` and `verifyOwnership`, with the same `_courselit-verification` label as custom domains. A school using `acme.com` for both a custom domain and SSO publishes two TXT records under the same name, with different tokens. Each check only accepts its own token, so one can never count as proof for the other.
- CourseLit custom domains (`school-hosts.ts`) and FrontLit custom and redirect domains switch to the package in their own refactor PRs after the release. They aren't part of SSO.
- SendLit's sending-domain checks (`settings/esp/domain-auth.ts`: DKIM, SPF, DMARC, MX) check records the email provider issues, not an ownership token, so they don't swap. They can still use the resolver and timeout later.

**`@codelitdev/billing` → features on offers.** Needed for the Phase 5 plan check.
- An offer, or the plan an offer belongs to, declares the feature keys it includes. CourseLit's would be `business: ["learner_sso"]`.
- The engine exposes `hasFeature(billableEntityId, feature)`. It answers from `commercialState()`: the active paid plan and a subscription status that counts as entitled (active, trialing, or past due within the grace period). It fails closed when billing can't be reached, and in `oss` mode it reports every feature as available.
- Every app on the billing package then gates features the same way, instead of each keeping its own plan-to-feature map.

**Not added to any package:**
- **The SAML/OIDC protocol layer** (decision 6). It lives in `apps/api/src/sso-protocol/`:
  - `createSamlServiceProvider(config)`:
    - Wraps `@node-saml/node-saml` with the settings from Phase 3 fixed in place: signed assertions, SHA-256, a 2-minute clock skew, `InResponseTo` always checked, `KeyInfo` certificates never trusted, checks on `Destination`, `Recipient`, `bearer` and `StatusCode`.
    - Returns `{ buildAuthnRequestUrl, validatePostResponse, serviceProviderMetadata }`.
  - `parseSamlIdpMetadata(xml)`: DTDs off and a size limit. Returns the entity ID, SSO URL and signing certificates.
  - Store interfaces, implemented with `school_sso_requests` and `school_sso_assertion_ids`:
    - `SsoRequestStore` (save, find, use up)
    - `AssertionReplayStore` (insert, failing if the ID was seen before)
  - Phase 6: `createOidcRelyingParty(config)`, wrapping `openid-client` (PKCE, `state`, `nonce`, allowed algorithms, `email_verified`), with the same store interfaces.
  - It imports nothing else from CourseLit. Its tests use a fixture IdP and cover every response the Phase 3 list rejects.
- **Linking identities, shadow users, school sessions, enforcement, sign-in methods and plan suspension.** These map identities to users and schools, which are CourseLit's own.

Following AGENTS.md, each addition is built and released in the platform repo first; CourseLit then upgrades to that version and uses it. There's no temporary CourseLit-only copy. If a package release blocks a phase, that phase waits.

## Order of work, alongside tiered billing

SSO is built before the rest of tiered billing (prices, upgrades and downgrades, the upgrade prompt). Its only link to billing is the plan check in Phase 5: "does this school have Business?" and "tell me when that changes". The rest of SSO (data, linking identities, SAML, UI, security) doesn't depend on billing at all, and it's the larger and riskier part.

0. **Platform package releases**, built at the same time as each other:
   - `@codelitdev/platform` `createDomainVerification`, needed by Phases 2 and 4
   - `@codelitdev/billing` features on offers, needed by step 1

   CourseLit's Phase 1 (tables) doesn't need any of them and can start straight away.
1. **The plan check (Phase 5).** Release features on offers in `@codelitdev/billing` (see "CodeLit packages"), upgrade CourseLit to it, declare `learner_sso` on Business and add the thin `schoolHasFeature` helper. Tiered billing needs this anyway.
2. **SSO Phases 1–4, checked against that helper from the start.** The `sso-protocol` module (Phase 3) can be built at the same time as Phases 1–2.
   - Self-hosted (`oss`): SSO works fully, so it can be tested end to end on the local stack.
   - courselit.app (`cloud`): the helper says no unless the school is on Business. If tiers aren't live there yet, SSO is simply off; because it says no by default, it can't reach free or Pro schools by accident.
3. **The rest of tiered billing.** Write the SSO suspension and restore sync and its daily job (Phase 5) here. They hook into `@codelitdev/billing`'s existing `afterProjection` lifecycle hook, so no new billing event is needed; but upgrades and downgrades have to work end to end before that can be tested.
4. **SSO goes live on courselit.app once Business can be bought.** No SSO code changes are needed; the helper starts saying yes.

Exception: if a customer is upgrading to Business specifically for SSO and needs it on day one, steps 3 and 4 have to ship together, and billing sets the deadline.

## Overall flow

It works like learner Google sign-in (`apps/api/src/learner-google-routes.ts`, `apps/api/src/learner-sign-in.ts`):

```
School website                    API host                           School's IdP
---------------------------------------------------------------------------------------
GET /auth/sso?next=…
  sets nonce cookie (10 min)
  POST /v1/learner/auth/sso/start ─▶ resolve school by host,
     {host, nonce, next}             check that an active connection exists,
                                     insert school_sso_requests row
  ◀─ { url }                         (stores digests of the request token and nonce)
302 ─────────────────────────────▶ GET /learner-login/sso/:conn/start
                                     build AuthnRequest (ID kept on the request row)
                                     302 ─────────────────────────────▶ sign-in
                                   POST /learner-login/sso/:conn/acs  ◀─ SAMLResponse
                                     + RelayState (= request token)
                                     check response, use up request, link identity,
                                     createSchoolAuthTicket(method 'sso')
◀── 302 https://<school-host>/auth/complete?next=…#ticket=…
existing ticket exchange → school_sessions row, school cookie
```

- The ticket only works on that school's host, only within 60 seconds, and only alongside the nonce cookie. That check already exists (`consumeSchoolAuthTicket`) and is what ties the sign-in to the browser that started it.
- The SAML ACS receives a cross-site POST, so an API-host cookie set with `SameSite=Lax` wouldn't arrive. Don't add one; the nonce check above does that job.
- RelayState and OIDC `state` only ever carry the opaque request token, never a URL.
- The ACS URL and SP entity ID live on the API host and are unique per connection:
  - `https://<api>/learner-login/sso/<connPublicId>/acs`
  - `https://<api>/learner-login/sso/<connPublicId>/metadata`

  A school changing its custom domain then doesn't break its IdP setup, and a response meant for one school fails the audience check of every other school.

---

## Phase 1: Data model

Rewrite the original migrations; no ALTERs. Then reset the database and apply them again. Add a schema file `apps/api/src/db/schema/school-sso.ts` and export it from `index.ts`.

### `school_sso_connections`

| column | notes |
| --- | --- |
| `id` uuid PK, `public_id` text unique | prefix `sso` |
| `school_id` → `schools.id` cascade | |
| `protocol` | `'saml' \| 'oidc'` (check constraint) |
| `status` | `'draft' \| 'active' \| 'suspended' \| 'disabled'`. `suspended` means the school lost the Business plan. The system sets and clears it, never the admin; see Phase 5. |
| `display_name` | button label, e.g. "Acme employees" |
| `enforcement` | `'optional' \| 'required_for_domains'` |
| `max_session_minutes` int null | null means the school session default |
| `idp_entity_id`, `idp_sso_url` | SAML. `idp_sso_url` must be an absolute `https:` URL with no credentials. Check this when saving and again when building the redirect, so the 302 can never point to `http:`, `javascript:` or `data:`. |
| `idp_certificates` text[] | SAML; PEM; more than one allowed so certificates can be rotated |
| `subject_attribute` text null | SAML; the attribute to use as the subject when NameID isn't `persistent` |
| `oidc_issuer`, `oidc_client_id`, `oidc_client_secret` | OIDC; secret encrypted with `@codelitdev/platform`'s `createAesGcmSensitiveValues` (see "CodeLit packages") |
| `tested_at`, `tested_config_digest` | set by a successful test sign-in. `tested_config_digest` is a hash of the settings the test ran against (entity ID, SSO URL, certificates, subject attribute). Activation requires it to match the current settings, so a draft can't be tested with one certificate and activated with another. |
| `created_at`, `updated_at` | |

- Partial unique index: at most one `active` connection per school in v1.

### `school_sso_domains`

| column | notes |
| --- | --- |
| `id`, `connection_id` → cascade, `school_id` | |
| `domain` | lowercased, no leading `@` |
| `verification_token` | from `issueOwnershipToken()`; published as a TXT record at `_courselit-verification.<domain>` whose value is the token, the same format as custom domains (see "CodeLit packages") |
| `verified_at` | |

- Unique `(school_id, domain)`. Don't make domains unique across schools:
  - Proving DNS control already stops a school from claiming a domain it doesn't own.
  - Two schools run by the same company may both use `acme.com`.
  - A global lock would let whoever verifies first block the real owner.
- The token is random for each (school, domain) pair and is never reused.
- Store domains as lowercase ASCII (IDN converted to punycode) with no trailing dot. An email's domain has to match exactly; subdomains don't count.
- Check the TXT record again on a schedule (weekly) and before activation.
  - Clear `verified_at` only after three checks in a row find the record missing, not after one DNS error. Until then, show a warning in the admin.
  - Once `verified_at` is cleared, the domain can't link new identities and its enforcement stops. Email the owner.
- Tokens are issued separately for each purpose (custom domain, SSO domain) and are never derived from each other. Each check compares against its own row's token only.

### `school_sso_identities`

| column | notes |
| --- | --- |
| `id`, `school_id`, `connection_id` → cascade | |
| `issuer` | IdP entity ID / OIDC issuer at the time of linking; must equal the connection's current one |
| `subject` | SAML persistent NameID, or the immutable attribute set on the connection (e.g. Entra `objectidentifier`); OIDC `sub`. Never a transient NameID, and never an email-format NameID: email addresses get reassigned to new people. |
| `school_account_id` → `school_accounts.id` cascade | |
| `last_email`, `last_signed_in_at` | |

- Unique `(connection_id, subject)` and unique `(connection_id, school_account_id)`.

### `school_sso_requests`

Shaped like `school_login_requests`, plus:

- `connection_id`
- `protocol_request_id`: the SAML AuthnRequest ID or OIDC state digest
- `oidc_nonce`, `pkce_verifier`: OIDC
- `purpose`: `'sign_in' | 'test'`
- `started_by_school_account_id`: only for `test`. The test result can be read only by the admin who started it.

### `school_sso_assertion_ids`

Replay cache:

- `(connection_id, assertion_id)` primary key, plus `expires_at`.
- Delete expired rows in the existing queue cleanup.

### Changes to existing tables

- `school_sessions.authentication_method` and `school_auth_tickets.authentication_method` accept `'sso'`; update the TS unions in `learners.ts` and `learner-sign-in.ts`.
- Add `school_sessions.sso_connection_id` (nullable, cascade), so disabling a connection deletes its sessions.
- Add `sso_shadow_users (user_id PK → user cascade, school_id → schools cascade, created_at)` to mark shadow users. It's a separate table, not a `kind` column on Better Auth's `user`, so Better Auth's schema and sign-up input stay untouched and nothing a user submits can set it.
- Add `school_sso_events` as an audit log: config changes, activations, domain verifications, sign-in failures (reason code only).

## Phase 2: Linking identities (`apps/api/src/learner-sso.ts`)

These are pure functions with unit tests. They don't depend on SAML or OIDC; the input is an assertion that has already been checked: `{ connection, subject, email, name }`.

```
linkSsoIdentity(db, input, clock) → Result<schoolAccount>
```

0. **Parse the email strictly.**
   - Plain `local@domain` only: no quoted local part, no comments, no second `@`, no whitespace or control characters.
   - Convert the domain to lowercase punycode.
   - Reject anything else with `sso_invalid_email`.
1. **Look for the identity by `(connection_id, subject)`.** It must also match on `issuer`. If found, load its school account.
   - Refuse unless the account is `active`.
   - Update `last_email` and `last_signed_in_at`.
   - Change `school_accounts.email` / `display_name` only when all of these hold:
     - the account's user is a shadow user
     - the new email's domain is a verified domain of this connection
     - the new email is unique within the school
   - Never look up by email here, because emails change at the IdP.
2. **Otherwise, check the domain.** Reject with `sso_domain_not_verified` unless the email's domain is a verified domain of this connection.
3. **Look for a school account with that email in this school.**
   - If one exists, link to it. Its `user_id` can be a real platform user; that's fine, because the user row is never touched.
   - If none exists, create a shadow user, a school account and the identity row in one transaction.
   - **Never call `ensureSchoolAccount` from SSO.** When it finds an account with the same email, it changes that account's `user_id` to the user it was called with.
     - Suppose an email-code sign-in creates the real user's account between SSO's lookup and its insert. `ensureSchoolAccount(shadowUser)` would then move the real user's account onto the shadow user.
     - So SSO inserts with `ON CONFLICT (school_id, email) DO NOTHING`. If the insert conflicts, it rolls back the shadow user, looks the account up again and links to it. It never changes the `user_id` of an account it didn't just create.
   - **The other direction is allowed.** When someone later signs in with an email code or Google for that address, `ensureSchoolAccount` moves the shadow-backed account to their real user. They have proved they own the email.
     - The SSO identity row stays linked to the account.
     - The shadow user that's left over is deleted in the same transaction.
     - Add a test for this.
4. **Team check, on every SSO sign-in, not only the first.** If the school account has a `memberships` (team) row, reject with `sso_account_is_team_member`. Team members sign in to the school website with email or Google.
   - This matters because team permissions carry into the school website session. `space-access.ts:staffSpaceIds` and community moderation give staff extra access there, and an IdP must never get it.
   - The request-time check in "Session checks" below covers accounts that join the team after signing in.
5. Record a `learner_signed_in` activity with method `sso`, the same way `admitLearner` does.

The browser only ever sees one generic error, "We couldn't sign you in with <displayName>". Reason codes go to the audit log, never to the IdP-signed user, so the response can't be used to probe for team membership or existing accounts.

### Session checks (`authenticateLearner`)

- `authenticateLearner` checks a method allowlist on every request; add `'sso'` there.
- An `sso` session is accepted only while its `sso_connection_id` is still `active`. Join this in the same query.
  - Disabling a connection then works immediately, even if deleting sessions fails.
  - Losing the Business plan works the same way, because it sets the connection to `suspended` (Phase 5).
  - Don't call billing on every request.
- **Nothing in a school website session uses `LearnerSession.userId` outside that school.** A linked account's `userId` can be a real platform user, so code that used it for something CourseLit-wide would carry the IdP's sign-in beyond the school.
  - Today the learner paths only use it inside school-scoped queries.
  - Add a test that fails if `LearnerSession.userId` is passed to a query on platform-wide tables (`user`, `session`, `account`, `selected_schools`, `memberships`), or keep a list of allowed uses in a comment and check it in review.
  - Any future "delete my account" for learners deletes the school account only, never the platform user.
- An `sso` session never gets team powers. `staffSpaceIds`, community moderation and every other storefront check that reads `memberships` must ignore team permissions when `authenticationMethod = 'sso'`. Pass the session, not just the `schoolAccountId`.

### Team guards

- Team invitations, accepting an invitation and membership grants in `team.ts` and `invitations.ts` refuse a school account that:
  - has a `school_sso_identities` row, or
  - belongs to a shadow user (`sso_shadow_users`).

  Otherwise an IdP could reach an account that later becomes staff.
- Removing the SSO link (an admin "unlink" action that deletes the identity row and that account's `sso` sessions) is the only way to make such an account eligible.

### Shadow users

- `createShadowUser(db, clock)` creates a user with:
  - `email = sso-<uuidv7>@users.invalid`
  - `emailVerified = false`
  - a row in `sso_shadow_users`
  - the name taken from the assertion
  - no `account` rows
- Guards, each with a test:
  - The Better Auth `databaseHooks.session.create.before` rejects users in `sso_shadow_users`, so no platform session can ever be created for one.
  - Team invitations and membership grants in `team.ts` and `invitations.ts` refuse school accounts whose user is `school_sso`.
  - Platform-level user search and lookup skips shadow users.
  - `findOrCreateVerifiedUser` never matches them. Their `.invalid` email can't be anyone's real email; add a test for it anyway.
  - Nothing sends platform email to a shadow user's address.
  - When a shadow user's last school account is deleted, the shadow user is deleted too. Add this to the user-deletion flow (`docs/user-deletion.md`) so personal data isn't left behind.
- SSO-created school accounts start with marketing email off. The school can't use a fake IdP to add mailing-list contacts it has no consent for. The verified-domain rule already limits it to its own domains.

### Enforcement

When `enforcement = 'required_for_domains'`:

- `requestLearnerEmailCode` and `startLearnerGoogleSignIn` check the email's domain. If it's a verified SSO domain of an active connection, they fail with `sso_required`.
- For Google, also check in `finishLearnerGoogleSignIn` before admitting, because the email isn't known until Google returns.
- The storefront then sends the learner to SSO.
- So that no path is missed, put the same policy check in `issueSchoolSession`, which today is the only place a school session is created (called from `consumeSchoolAuthTicket` and `signInLearnerWithIdentity`): `sessionMethodAllowed(school, schoolAccount.email, method)`.
- Turning enforcement on deletes the existing non-`sso` sessions of accounts in enforced domains. Otherwise people removed from the IdP keep their access until their sessions expire.

## Phase 3: SAML (`apps/api/src/learner-sso-saml.ts`, `learner-sso-routes.ts`)

Use `createSamlServiceProvider` from `apps/api/src/sso-protocol/`, which wraps `@node-saml/node-saml`; see "CodeLit packages". Never write our own XML signature checks. The settings below are fixed in the module; the routes only pass the per-connection values.

### Configuration

Build a `SAML` instance per connection with:

- `callbackUrl` = the ACS URL
- `issuer` = the per-connection SP entity ID
- `entryPoint` = `idp_sso_url`
- `idpCert` = `idp_certificates`
- `idpIssuer` = `idp_entity_id`
- `audience` = the SP entity ID
- `wantAssertionsSigned: true`
- `wantAuthnResponseSigned: false` (also accept it when signed)
- `signatureAlgorithm: 'sha256'`, `digestAlgorithm: 'sha256'`
- `acceptedClockSkewMs: 120_000`
- `validateInResponseTo: 'always'`, with our own cache provider backed by `school_sso_requests`
- `disableRequestedAuthnContext: true`
- `identifierFormat`: `urn:oasis:names:tc:SAML:2.0:nameid-format:persistent`. If the IdP can only send an `emailAddress` or `unspecified` NameID, the connection must set `subject_attribute`, and the NameID is ignored. A transient or email NameID is never used as the subject (see `school_sso_identities`).

### Routes, registered next to `registerLearnerGoogleRoutes` in `express-app.ts`

- **`GET /learner-login/sso/:conn/start?request=…`**
  - Find the open request.
  - Check the connection is active, or draft when `purpose = 'test'`.
  - Build the redirect URL with `RelayState` = the request token.
  - Save the AuthnRequest ID on the request row, then 302.
- **`POST /learner-login/sso/:conn/acs`**
  - urlencoded body with a 256 KB limit, mounted before any global body parser so a larger global limit can't apply first.
  - The module's `validatePostResponse` runs steps 1 and 3–6 in this order, through the store implementations. The route doesn't put the steps in its own order. Step 2 is a callback the route passes in, and step 7 is the route's.
  - Steps:
    1. Read `RelayState` and find the open request without using it up. It must be unused, unexpired and for the same connection.
    2. Check the connection's status again here: `active` for `sign_in`, `draft` or `active` for `test`. The connection may have changed since the request started.
    3. `validatePostResponseAsync` against that connection's config.
    4. Check the top-level `StatusCode` is `Success`.
    5. Only then use up the request, with one conditional update matching the RelayState digest, `InResponseTo`, the connection and "unused". Validating the signature first means a forged POST can't use up a real learner's request.
    6. Insert the assertion ID into the replay cache. If the insert conflicts, reject.
    7. Pull out the subject (persistent NameID or `subject_attribute`) and the email from the `email`/`mail` attribute. Reject when either is missing.
  - Then branch on `purpose`:
    - `sign_in`: `linkSsoIdentity`, then a ticket with method `'sso'`, then a 302 to `/auth/complete#ticket`.
    - `test`: set `tested_at` and save the attributes received on the request row (kept for 15 minutes), then redirect to the admin connection page with only the request id. No account, no identity, no ticket. Never put attributes in a URL, where they would end up in logs and browser history.
  - On failure, 302 to `<school>/login?error=sso`, or to the admin page for a test. Write a reason code to the audit log; never log assertion XML or attributes, and never send them back to the browser.

### Checking the library's behaviour

The module confirms each of these in `@node-saml/node-saml`, with a test for each. Wherever the library doesn't check something, the module adds its own check:

- `Destination` and `SubjectConfirmationData/@Recipient` must equal the ACS URL.
- `SubjectConfirmation` method `bearer`, with an unexpired `NotOnOrAfter`.
- Certificates sent inside the response (`KeyInfo`) are never trusted; only the pinned ones are.
- Only the signed assertion is used. Attributes from outside the signed element are ignored.

Pin the exact version of the library and of `xml-crypto` / `@xmldom/xmldom` that comes with it. The XML libraries have had signature-bypass vulnerabilities (CVE-2024-32962, CVE-2025-29774/29775), so dependency update PRs for them get reviewed and merged quickly.
- **`GET /learner-login/sso/:conn/metadata`**: SP metadata XML (the module's `serviceProviderMetadata`).
- For `disabled` or `suspended` connections, every `/learner-login/sso/:conn/*` route answers the same way it answers an unknown connection. Admins get the SP values from the admin UI, not from the public route.

### What gets rejected (each case gets a test using a fixture IdP key)

- an unsigned assertion
- an assertion signed by the wrong certificate
- a SHA-1 signature
- an assertion wrapped inside a signed element (XSW)
- the wrong audience (another connection's entity ID)
- the wrong `Destination`
- an expired assertion
- `NotBefore` in the future
- an unknown or already used `InResponseTo`
- a missing `InResponseTo` (IdP-initiated)
- a replayed assertion ID
- a DTD or external entity in the XML
- a body over the size limit

### Session lifetime

`school_sessions.expires_at` is the earliest of:

- the default
- `max_session_minutes`
- `SessionNotOnOrAfter`, when the IdP sends it

`issueSchoolSession` gets an optional `expiresAt` and `ssoConnectionId`.

## Phase 4: API contract, admin and MCP

### Contract operations (`packages/api-contract`)

School-scoped. Reads need the settings-read permission; writes are owner-only (see "Who can change SSO settings"):

- `listSsoConnections`, `getSsoConnection`. Reads never return the OIDC client secret (it can be written but never read back; responses only say whether it is set), and never return test-sign-in attributes. Those come from a separate owner-only read for the admin who started the test.
- `createSsoConnection`, `updateSsoConnection` (draft fields, metadata XML paste)
- `addSsoDomain`, `verifySsoDomain` (via `@codelitdev/platform` `createDomainVerification`, 5 s timeout), `deleteSsoDomain`
- `startSsoConnectionTest`: returns the URL that starts the test flow
- `activateSsoConnection`, `disableSsoConnection`, `deleteSsoConnection`

### Parsing metadata

- Parse the pasted IdP metadata XML on the server with the module's `parseSamlIdpMetadata` (DTDs off, size limit).
- Pull out the entity ID, the SSO URL (HTTP-Redirect binding) and the signing certificates.
- v1 doesn't fetch metadata URLs.

### Activation rules

A connection can only be activated when:

- it has at least one verified domain
- `tested_at` is set
- `schoolHasFeature(..., "learner_sso")` is true (Phase 5)

Plan rules for the other actions:

- Creating, editing, verifying domains and testing a draft connection are allowed on any plan. A school can prepare SSO before upgrading, and the admin UI shows a "Business plan" upgrade prompt on the Activate button.

### Who can change SSO settings

Whoever controls a connection's IdP settings can sign in as every learner linked to it. Changing the certificate or the entity ID is an account takeover of every SSO learner. So:

- **Writes are owner-only and need a signed-in admin.** This covers create, update, domain changes, test, activate, disable, delete and unlink.
  - Use `schoolOwnerOp(["session"], true)`: owner only, signed-in admin session only, recent sign-in required.
  - API keys and OAuth clients can't make these changes.
  - Reads (`list`/`get`) stay at the settings-read permission and are open to every credential.
- **Changing what the connection trusts sends it back to draft.**
  - Changing `idp_certificates`, `idp_sso_url` or `subject_attribute` on an active, suspended or turned-off connection sets it to `draft` and clears `tested_at`. It has to be tested again before activation, and its `sso` sessions are deleted.
  - Turned-off (`disabled`) connections are included because only draft and active connections can be tested. Left disabled after a settings change, a connection could never be tested or turned back on.
  - Adding a certificate for rotation follows the same rule.
- **`idp_entity_id` / `oidc_issuer` can't be changed.** Pointing at a different IdP means creating a new connection, which starts with no identities. Identities are tied to their `issuer`, so they can never be inherited by a new IdP.
- **Every change is audited and emailed.** Each write goes to `school_sso_events`, and the owner gets an email listing what changed.

### MCP

- REST/MCP parity: the write operations are only available with a signed-in admin session. Add them to `mcp-parity.ts` as exemptions with the reason "changes who can sign in as every SSO learner; owner session with recent sign-in only". Add them to `REACHABLE_BUT_EXEMPT` in `mcp-api.test.ts`.
- `listSsoConnections` / `getSsoConnection` become MCP tools as usual, with descriptions in `apps/api/src/mcp-tools/operation-descriptions.ts`.
- The browser routes (`/learner-login/sso/*`) aren't contract operations, just like the Google routes.

### Rate limits

- `POST /v1/learner/auth/sso/start`: limit per IP and per school, using the existing rate-limit table.
- The ACS: limit per IP.
- `verifySsoDomain`: limit per school.
- Delete expired request, test-result and replay-cache rows in the queue's cleanup job.

### Sign-in methods

Same behaviour as main (`apps/web/graphql/settings/logic.ts` `toggleLoginProvider`, `apps/web/lib/login-providers.ts`), with one difference: Google is provided by the platform, so a school only turns it on or off and never enters Google credentials.

- **Data:** `schools.login_methods text[]`, default `{email}`, check constraint `<@ {email, google}`. SSO isn't in the list: it is on exactly when the school has an `active` connection, so a second switch can't disagree with the connection's status.
- **Rules:**
  - At least one method stays on. Turning off the last of email, Google and an active SSO connection is refused, the same as main refusing to turn off email when it's the only one.
  - Google can be turned on only when the platform has Google keys.
  - If every method a school has turned on becomes unusable (for example SSO suspended by a plan change while email is off, or the platform's Google keys removed), email codes are used. Learners are never locked out of a school by something the school didn't choose.
- **Where it's enforced:** in the same policy check as enforcement, `sessionMethodAllowed(school, email, method)` in `issueSchoolSession`, and early in `requestLearnerEmailCode` / `startLearnerGoogleSignIn` / SSO start. The storefront hiding a button isn't enforcement.
  - Turning a method off deletes that school's existing sessions created with it (`school_sessions.authentication_method`). Otherwise turning off email codes wouldn't take effect until sessions expire.
- **Operations:**
  - `getSchoolLoginMethods` reads at the settings-read permission.
  - `updateSchoolLoginMethods` needs settings-manage. It is in `MCP_HIGH_IMPACT_OPERATIONS` because it changes access settings, so it is `destructive` with `confirm: true`.
  - It stays reachable over MCP. Unlike SSO connection settings, it can't hand anyone's account to someone else; the worst it can do is turn methods off, and the fallback above stops a lockout.
- **Storefront:**
  - Public sign-in settings return the methods that are on, plus SSO's `displayName`.
  - `public-login-block.tsx` and `checkout-login-form.tsx` show only those.
  - Checkout with email codes off offers the methods that are on.

### Storefront API

- `POST /v1/learner/auth/sso/start` with `{ host, nonce, next }`.
- Public sign-in settings return `{ methods: ("email" | "google" | "sso")[], sso: { displayName } | null }` so the login block shows only the methods that are on.

### Admin UI (`apps/admin`)

Settings → Login providers. Base the layout and wording on main's `apps/web/components/admin/settings/sso.tsx`.

- The Login providers area (see "Sign-in methods" below).
- The SSO connection page:
  1. Values to give to the IdP: ACS URL and entity ID, with copy buttons, and a link to download SP metadata.
  2. The IdP metadata XML paste field, or manual entity ID, SSO URL and certificate fields.
  3. Domains, showing the TXT record and verify status.
  4. A "Test connection" button that shows the attributes the IdP sent.
  5. Enforcement and session length.
  6. Activate / Disable.

### Storefront UI

- `apps/storefront/app/schools/[schoolId]/auth/sso/route.ts`, copied from the Google route.
- `signInWithSso(next)` in `lib/learner-sign-in.ts`.
- A "Sign in with <displayName>" button in `public-login-block.tsx` and `checkout-login-form.tsx`, using page-builder primitives only.
- An `sso_required` error from the email-code step switches the form to the SSO button.

## Phase 5: Plan gating and docs

### Checking the plan

`school-billing.ts` already has the tier names (`"pro" | "business"`) and `billingMode` (`"cloud" | "oss"`).

- Upgrade to the `@codelitdev/billing` release that adds features on offers (see "CodeLit packages"). Declare `learner_sso` on the Business offers next to `COURSELIT_OFFER_KEYS` in `apps/api/src/billing.ts`.
- Add a thin helper, `schoolHasFeature(deps, schoolInternalId, feature)`, that calls the engine's `hasFeature`. The rules live in the package:
  - every feature is available in `oss` mode
  - only an entitled subscription status counts
  - fail closed when billing can't be reached; never fall back to allowing SSO
- `oss` mode turns on every feature, so the mode itself must not default to it by accident. Today `runtime.ts` uses `oss` only when `BILLING_MODE=oss` is set explicitly and otherwise uses `cloud`, which fails closed. Keep that, and add a test for it.
- The helper exists only so CourseLit code has one place to name features. Its tests cover CourseLit's wiring; the rules themselves are tested in the package.
- This is a CourseLit platform plan check, so `@codelitdev/billing` is the right package. That fits the billing segregation rule: it has nothing to do with learner payments, which never call this helper.

### Where it's checked

- `activateSsoConnection`.
- `POST /v1/learner/auth/sso/start`. When the check fails, return a not-available error, and hide the button through the public sign-in settings.
- The ACS, before a ticket is created. This catches a downgrade that happens during the 10 minutes a sign-in request is open.
- Not in `authenticateLearner`. Existing sessions end through suspension instead, below.

### Suspension when the plan changes

When the school's plan stops including `learner_sso` (downgrade to Pro, cancellation taking effect, the subscription ending):

- Set every `active` connection to `suspended`, in the queued `sync_plan_features` job. The job is committed with the plan change (see below).
- Delete their `sso` sessions.
- Turn enforcement off for the suspension, so learners in those domains can sign in with email codes or Google again instead of being locked out.
- Email the owner.

The plan-change signal already exists. `@codelitdev/billing` calls the `hooks.lifecycle.afterProjection({ material, previous, next, planState })` lifecycle hook whenever it saves a new subscription state, and `apps/api/src/billing.ts` currently registers it as an empty function.

- Fill in that hook so it inserts a `sync_plan_features` queue job for the billable school, inside the billing transaction via `store.getTransaction()` (as the audit hook does). The job commits only if the plan change commits.
  - Don't do the SSO work inside the hook. In Postgres, a failed statement aborts the whole transaction even if JS catches the error, so a bug in the SSO sync would roll back the billing write.
  - Queue the job on every projection, not only when `material` is true. `syncPlanFeatures` reads the current plan itself and is safe to run any number of times, so correctness never depends on how billing classifies a change.
- The daily job remains the backstop for anything missed.

Also run a daily job in the queue that calls `syncPlanFeatures` for every school with an `active` or `suspended` connection. It catches a missed event and grace periods that have run out.

When the school moves back to Business, `syncPlanFeatures` sets `suspended` connections back to `active`.
- It runs the activation rules again first: a verified domain, and `tested_config_digest` matching the current settings. A domain may have lapsed while suspended. If the rules fail, the connection goes to `draft` and the owner is emailed.
- Settings and identities are unchanged, so no new test is needed.
- A connection whose settings changed while suspended went back to `draft` under the rules in Phase 4, so it isn't restored.
- If enforcement was on, turning it back on follows the same rule as turning it on in the first place: existing non-`sso` sessions in enforced domains are deleted.

### Admin UI

- Show the plan requirement on the Login providers page, using the existing plan DTO (`readSchoolPlan`).
- In `oss` mode, show no upgrade prompts.

### Docs

- a new page for the rewrite's docs, covering setup for Okta, Entra ID and Google Workspace. Main's docs apps stay untouched.

## Phase 6: OIDC (after SAML ships)

- Use `createOidcRelyingParty` from `apps/api/src/sso-protocol/`, which wraps `openid-client`. Authorization code flow with PKCE (S256), plus `state` and `nonce`.
- Check that the ID token's `iss` matches the configured issuer exactly, and check `aud`, `azp`, `exp`, `iat` and `nonce`. Allow only RS256/ES256.
- Use `email` only when `email_verified` is true, and still require the domain to be verified.
- Discovery and JWKS fetches go through `@codelitdev/platform`'s new `createOutboundFetch`:
  - https only
  - resolve DNS and reject private, loopback and link-local addresses
  - no redirects to internal hosts
  - size and time limits
- Callback: `GET /learner-login/sso/:conn/callback`. Same request and ticket handling as SAML.

## Out of scope for v1

- IdP-initiated sign-in
- SCIM provisioning
- single logout
- encrypted assertions and signed AuthnRequests
- more than one active connection per school
- making `school_accounts.user_id` nullable

## Security review

These risks were found while reviewing this plan; the phases above already include the fixes.

| # | Risk | Fix (where) |
| --- | --- | --- |
| 1 | Team permissions carry into the school website session (`space-access.ts:staffSpaceIds`, community moderation). An IdP could sign in as a staff account and get staff access on the website. The team check ran only on the first link. | Team check on every SSO sign-in; `sso` sessions never get team powers; team grants refuse SSO-linked accounts (Phase 2) |
| 2 | Changing the IdP settings takes over every linked learner. Anyone with the settings permission, an API key or an MCP agent could swap in their own certificate. | Owner-only with a signed-in admin session and recent sign-in; no MCP or API key access; changes send the connection back to draft; entity ID can't be changed; audit log and owner email (Phase 4) |
| 3 | Unstable subjects: transient NameIDs make a new account at every sign-in, and email-format NameIDs move with reassigned addresses, so a new employee would get a former employee's account. | Persistent NameID or an immutable attribute only; identities tied to their issuer (Phase 1) |
| 4 | Changing the email on a later sign-in skipped the domain check. | Domain check on every email change (Phase 2) |
| 5 | Using up the request before checking the signature let a forged POST cancel a real sign-in. | Check signature and status first, then use up the request in one conditional update (Phase 3) |
| 6 | Turning off a connection or losing the Business plan didn't end SSO sessions straight away. | Check the connection status on every request; a plan change suspends connections and deletes their sessions (Phases 2 and 5) |
| 7 | Domains unique across schools would let whoever verifies first lock the real owner out. | Unique per school; check the TXT record again on a schedule (Phase 1) |
| 8 | Tricky email formats (quoted local parts, Unicode look-alikes, a second `@`) could get past the domain match. | Strict parsing, punycode, exact match (Phase 2) |
| 9 | Enforcement could be bypassed through another sign-in path, or through sessions created before it was turned on. | Policy check inside `issueSchoolSession`; delete existing non-`sso` sessions when it's turned on (Phase 2) |
| 10 | Test results in redirect URLs leak personal data into logs and history. | Save results on the server, readable only by the admin who started the test (Phase 3) |
| 11 | Detailed errors let someone probe for team membership or existing accounts. | One generic browser error; reason codes in the audit log only (Phase 2) |
| 12 | A fake IdP could add mailing-list contacts without consent. | Verified domains only; marketing email off by default (Phase 2) |
| 13 | Signature-bypass bugs in the XML libraries. | Pin versions, CODEOWNERS on `sso-protocol/`, merge security updates quickly, test the library's checks one by one (Phase 3) |
| 14 | Deleted SSO learners leave shadow users behind. | Delete the shadow user with its last school account (Phase 2) |
| 15 | `ensureSchoolAccount` moves an existing account with the same email onto whichever user it's called with. If SSO called it during a race, a real learner's account would be moved onto a shadow user. | SSO never calls it; it inserts with `ON CONFLICT DO NOTHING` and links on conflict. An email-proven sign-in may move a shadow-backed account to the real user, and the leftover shadow user is deleted (Phase 2) |
| 16 | A linked account's session carries a real platform `userId`. Any code using it outside the school would carry the IdP's sign-in further. | Rule plus a test: `LearnerSession.userId` is never used on platform-wide tables; learner deletion is school-scoped only (Phase 2) |
| 17 | `afterProjection` work running inside the billing transaction: in Postgres a failed statement aborts the whole transaction, so an SSO bug would roll back the billing write. Relying on `material` could also miss changes. | The hook only queues a job in the same transaction, on every projection; the job is safe to run any number of times (Phase 5) |
| 18 | A test passing with one certificate let the connection be activated after the certificate was swapped on a draft. | `tested_config_digest` must match the current settings to activate (Phase 1) |
| 19 | A restored connection could come back with a domain that lapsed while suspended, or turn enforcement back on without ending other sessions. | Restoring runs the activation rules again and applies the enforcement session cleanup (Phase 5) |
| 20 | An `idp_sso_url` that isn't https, or uses a scheme such as `javascript:`, ends up in a 302 `Location`. | Absolute `https:` only, checked when saving and when redirecting (Phase 1) |
| 21 | Reads (open to API keys and MCP) returning the OIDC client secret or test attributes. | The secret can't be read back; test attributes go only to the admin who started the test (Phase 4) |
| 22 | A spoofed DNS answer, or one failed lookup, deciding domain verification. | Configurable trusted resolvers in the package; clear verification only after three failed checks in a row (Phase 1, package) |
| 23 | `oss` mode turns on every feature, so a cloud deployment that fell back to it by accident would give SSO to every school. | `BILLING_MODE` falls back to `cloud`; `oss` only when set explicitly, with a test (Phase 5) |
| 24 | Turning off a sign-in method only hides its button, so the method still works through the API and existing sessions stay. | Enforced in `issueSchoolSession` and the start endpoints; turning a method off deletes its sessions; email is the fallback when nothing else works (Phase 4) |

What we accept:

- A school's IdP can sign in as any learner in that school whose email is in a domain the school verified. This includes accounts first created with email codes or Google.
- The school controls those addresses and already sees those learners' data in that school. Nothing reaches other schools, the admin, or the platform user.

## Test checklist

Every behaviour change gets tests on each side it touches.

- `linkSsoIdentity`:
  - a found identity wins over email
  - an unverified domain is rejected and nothing is created
  - links to an existing learner account in a verified domain
  - refuses an account with a team membership on every sign-in, including after the first one
  - creates a shadow user only when needed
  - never changes a platform user's `email`, `emailVerified`, `name` or `image`
  - a changed email outside a verified domain doesn't change `school_accounts.email`
  - strict email parsing: quoted local parts, a second `@`, IDN domains
  - an identity from another issuer is never matched
- Sessions:
  - an `sso` session gets no staff spaces and can't moderate
  - an `sso` session stops working the moment its connection is disabled or suspended
- Who can change settings:
  - API key and OAuth credentials are refused on writes
  - a non-owner is refused
  - changing the certificate sends the connection back to draft and deletes its sessions
  - the entity ID can't be changed
- ACS:
  - a forged POST with a valid RelayState doesn't use up the request
  - a test request never issues a ticket
- Enforcement: turning it on deletes the existing non-`sso` sessions in enforced domains.
- Plan:
  - `schoolHasFeature("learner_sso")` is true for Business and false for Pro and unpaid schools in `cloud` mode (the package tests the general rules: `oss` mode, statuses, failing closed)
  - activation is refused without Business; drafts can be prepared on any plan
  - losing Business suspends connections, deletes `sso` sessions and turns enforcement off
  - moving back to Business restores connections whose settings didn't change
  - the ACS refuses to create a ticket after a downgrade mid-sign-in
- Account races:
  - SSO first sign-in racing an email-code sign-in never moves the real user's account onto a shadow user
  - a later email-code or Google sign-in moves a shadow-backed account to the real user and deletes the shadow user
- Billing hook: a failing `syncPlanFeatures` job never rolls back a billing write; the hook queues a job on every projection
- Activation is refused when `tested_config_digest` doesn't match the current settings
- `idp_sso_url` values that aren't `https:` are refused when saving
- Reads never include the OIDC client secret
- Shadow users:
  - Better Auth refuses to create a session for one
  - team invitations and grants refuse one
  - `findOrCreateVerifiedUser` never matches one
- SAML: every case in the Phase 3 list of rejected responses.
- Flow:
  - a ticket from school A can't be redeemed on school B
  - a ticket can't be redeemed without the nonce cookie
  - a request token works once
  - a test sign-in issues no ticket
- Enforcement: email codes and Google sign-in are refused for enforced domains.
- Disabling a connection deletes its sessions; session expiry honours `SessionNotOnOrAfter`.
- Sign-in methods:
  - a method that's off is refused at its start endpoint and in `issueSchoolSession`
  - turning a method off deletes its sessions
  - the last method on can't be turned off
  - when every method that's on becomes unusable, email codes still work
  - Google can't be turned on without platform keys
- Contract and MCP parity tests pass (descriptions, high-impact list).
