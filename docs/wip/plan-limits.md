# Plans, trials and limits on courselit.app

Status: ready for development, 2026-11-14, after three security reviews.
Only the `learner_sso` feature gate exists so far. Everything else here is
to be built. Security requirements are tagged S1–S31. The IDs are stable, so
some numbers are skipped or merged; see
[Security requirements](#7-security-requirements).

## 1. Decisions at a glance

| Topic | Decision |
|---|---|
| Modes | OSS (self-hosted) unlocks every feature with no limits. Cloud (courselit.app) has two paid plans and no free plan. |
| Prices | Pro $19 a month or $190 a year. Business $79 a month or $790 a year. No fee on sales on either plan. |
| Payment provider | CourseLit's own plans are paid through LemonSqueezy (replacing Dodo), set up the same way as MediaLit. |
| Trial | 14 days, no card, one per account. It gets every Business feature except removing branding, public code injection (the owner alone sees injected code) and priority support. No marketing email; 500 MB of storage. |
| End of trial or subscription | 15 days read-only, then the school is hard-deleted. The deletion itself is a separate change. |
| Limits | Marketing email per month and storage only: Pro 10,000 emails and 20 GB; Business 50,000 emails and 200 GB. No seat limit. |
| Business-only features | Learner SSO, SCORM, the audit log screen, priority support. |
| Branding | A "Powered by CourseLit" badge in four places. Any paid plan or OSS can remove it; a trial can't. |
| Email routing | Learner mail goes through CourseLit's own SendLit organization, in three streams: sign-in codes, transactional mail and community notifications, each with its own budget. The school's SendLit team carries only marketing (broadcasts, sequences, drip). |
| Sender name | The school's name, once SendLit supports a sender name per message. Until then, "CourseLit", with the school's name in the subject. |
| Trial safety | Code injection runs only for the school's owner. A custom domain works, but platform mail links to `<slug>.courselit.app` until the school pays. |
| Abuse | An acceptable use policy, an `abuse@` address with a "Report this site" link, a suspend-school action. Schools stay on `<slug>.courselit.app`. Live payments aren't blocked during a trial. |

## 2. Modes, plans and prices

- **OSS:** `@codelitdev/billing` already reports every feature as available
  in `oss` mode. Limits must do the same and return unlimited.
- **Cloud:** plans `pro` and `business`, monthly or yearly
  (`apps/api/billing.config.ts`).
- **Prices**, in minor units for the catalog variables:

  | Variable | Value |
  |---|---|
  | `BILLING_PRO_MONTH_AMOUNT_MINOR` | `1900` |
  | `BILLING_PRO_YEAR_AMOUNT_MINOR` | `19000` |
  | `BILLING_BUSINESS_MONTH_AMOUNT_MINOR` | `7900` |
  | `BILLING_BUSINESS_YEAR_AMOUNT_MINOR` | `79000` |

  A price change needs a new `BILLING_CATALOG_REVISION`. The local
  `apps/api/.env` and the QA example in `infra` still have $18 and $50.
- **For comparison** (third-party figures, October–November 2026):

  | Plan | Price |
  |---|---|
  | Teachable Starter | $29–39 plus 7.5% of sales |
  | Podia Mover | $42–49 plus 5% |
  | Teachable Builder | $69–89 |
  | Podia Shaker | $84–99 |
  | Circle Professional | $89–99 plus 2% |
  | Kajabi Basic | from $143 |

## 3. The trial

### What a trial gets

- A cardless, 14-day trial, as on `main`. People have asked to try Business,
  so it covers Business, not just Pro.
- Every Business feature, including learner SSO and the audit log, with
  three exceptions:
  - the CourseLit badges always show (`remove_branding` is not included);
  - injected code runs only for the school's owner (see
    [Code injection](#code-injection));
  - no priority support.
- Limits: a marketing email quota of 0, and 500 MB of storage.
- Learner transactional mail (sign-in codes, receipts and so on) still goes
  out, because it never uses the school's quota (section 6).

### How it works

- **The trial is CourseLit state, not a billing subscription.** The billing
  package treats cardless trials as an entitlement the app supplies
  ("Application trials are entitlement sources, not plans"), so `hasFeature`
  and `getLimit` see no plan during a trial.

#### Where school state lives

| Data | Where |
|---|---|
| School state | `schools.status`. Today's values are `active`, `read_only`, `maintenance`, `migrating` and `deleted`. This change adds `pending_checkout`, `imported` and `suspended`, and gives `read_only` its meaning (grace after a lapse). |
| Last known plan | `schools.last_plan` (jsonb, the last `SchoolPlan` that wasn't `unknown`) and `schools.last_plan_at`. Written every time `schoolPlan` reads billing successfully, and used when billing is `unknown` (S23). |
| Drip pause | `school_integrations.marketing_paused_until` (timestamptz) on the `sendlit` row (section 5) |
| Grace | `schools.grace_ends_at` (timestamptz, null unless `read_only` because a plan lapsed) |
| Suspension | `schools.suspended_reason` (text), set by the staff CLI (S26) |
| Trial records | New table `school_trials`: `id`, `user_id`, `normalized_email`, `school_id` (nullable; no foreign key, so the row outlives the school), `started_at`, `ends_at`, `ended_at`, `end_reason` (`purchased`, `expired`). Unique on `user_id` and on `normalized_email`. |
| Upload reservations | New table `media_upload_reservations`: `id`, `school_id`, `school_account_id` (nullable; set for learner uploads), `bytes`, `expires_at` (S1) |
| Learner upload budget | School setting `learnerUploadLimitBytes`. Default 100 MB, maximum 1 GB. Saved through the existing school-settings update operation, which gives it REST and MCP access (S2). |

Only the lifecycle job and the staff CLI write `status`, `grace_ends_at`,
`suspended_reason` and `school_trials`. No school-update endpoint or MCP tool
accepts them (S27).

**Offline** means the state is `pending_checkout`, `imported` or
`suspended`. The storefront shows a neutral "This site isn't available" page.
The API refuses every school and learner operation except these:

| State | The owner may | Everyone else |
|---|---|---|
| `pending_checkout`, `imported` | set the school up in the admin (with the rest of the team), and start checkout | nothing: learners and the public are refused |
| `suspended` | read in the admin; cancel or resume the CourseLit plan | nothing; learners can't sign in |

`maintenance`, `migrating` and `deleted` keep their current behaviour.

#### `schoolPlan(school)`

Feature checks (`schoolHasFeature`), limit checks, the SSO sync, the
lifecycle job and the Plan settings screen all go through `schoolPlan`.
None of them call billing directly.

```ts
type SchoolPlan =
  | { kind: "oss" }                                             // every feature, no limits
  | { kind: "paid"; plan: "pro" | "business"; status: string }  // entitled billing subscription
  | { kind: "trial"; endsAt: Date }                             // TRIAL features and limits
  | { kind: "none"; reason: "expired" | "pending_checkout" | "imported" }
  | { kind: "unknown" };                                        // billing couldn't be read (S23)

const PRO_FEATURES = ["remove_branding", "code_injection"];
const BUSINESS_FEATURES = [...PRO_FEATURES, "learner_sso", "scorm", "audit_log"];
const TRIAL = {
  features: ["learner_sso", "scorm", "audit_log"],   // Business minus remove_branding and code_injection
  limits: { marketing_emails_month: 0, storage_bytes: 500 * MB },
};
```

A trial has no `code_injection` feature. Showing injected code to the
owner during a trial isn't a feature check. It's the separate path for the
owner only, described in section 4 (S25).

The order of checks:
1. `oss` mode.
2. **Billing**, through `commercialState`, which throws when billing can't
   be read. A throw gives `unknown`. An entitled paid plan gives `paid`, and
   always wins over the trial (S18).
3. A running trial (a `school_trials` row for this school with
   `ends_at > now` and no `ended_at`) gives `trial`.
4. Otherwise `none`, with the reason taken from `schools.status`:
   `pending_checkout`, `imported`, or else `expired`.

How callers treat each result:
- `unknown`:
  - feature checks use the school's last known result, which is cached on
    the school when the plan is read;
  - limit checks refuse new usage;
  - the lifecycle job does nothing.
- `none`: no features, and every limit is 0.
- A successful purchase sets `ended_at` and `end_reason = "purchased"` on
  the trial row, and sets `status` to `active`.

#### One trial per account

- Creating a school checks `school_trials` for the owner's `user_id` and
  `normalized_email`. The email is lowercased, `+tags` are stripped, and
  Gmail dots are ignored.
- **No row:** create one, with `ends_at` 14 days from now. The school is
  `active`.
- **A row already exists:** the school is created as `pending_checkout`. It
  becomes `active` when its checkout succeeds.
  - A `pending_checkout` school that hasn't paid after 7 days is set to
    `deleted`. It holds no content, so nothing else is removed.
  - These schools count toward the limit of 3 school creations per account
    per day.
- Throwaway accounts on disposable email addresses can still get around
  this. That's accepted: a trial gives little, with no marketing email and
  500 MB.
- **Onboarding:** a new account's school is created first, and checkout
  comes when the creator picks a plan.

#### The lifecycle job

`evaluate_school_lifecycle` is one job, safe to run more than once. It
reads `schoolPlan`, then:

| Result | Current status | Action |
|---|---|---|
| `unknown` | any | nothing (S23) |
| `paid` or `trial` | `read_only` | back to `active`; clear `grace_ends_at`; email the owner |
| `none` (`expired`) | `active` | set `read_only` and `grace_ends_at = now + 15 days`; if the school had a trial, set its `ended_at = now` and `end_reason = "expired"`; email the owner |
| `none` (`expired`) | `read_only` | send the 7-day and 1-day deletion warnings when due (idempotent) |
| `none` (`pending_checkout` or `imported`) | any | nothing; these are handled by their own rules |
| any | `suspended`, `maintenance`, `migrating`, `deleted` | nothing; the job skips these states |

It's queued:
- when a school is created, set to run at the trial's end;
- by the billing lifecycle hook on every billing change, next to the
  existing `sync_plan_features`;
- by a daily sweep over every school that isn't `deleted`.

`sync_plan_features` (SSO, and the SendLit quota) runs after it,
in the same job chain.

### When a trial or subscription ends

This applies to a trial that ends without a purchase, and to a paid
subscription that ends (cancelled, unpaid, or past `paidThroughAt` plus 7
days; S17).

1. **15 days `read_only`.** The owner can pick Pro or Business at any time,
   which restores everything. Read-only mode is an **allowlist that fails
   closed**: every operation not listed below is refused. The allowlist:
   - **The owner:**
     - every read (`GET`) in the admin and API;
     - the billing operations: checkout, plan, cancel and resume;
     - deleting the school (with the deletion change).
   - **Other team members:** every read (`GET`).
   - **Learners:**
     - signing in;
     - reading content and their own account and purchases;
     - updating their own profile;
     - cancelling their own subscriptions;
     - deleting their own account.
   - **Refused:** everything else, including checkout, free plans, join
     requests, invitations, posts, comments, reactions and uploads.
   - No marketing email goes out; the SendLit quota is set to 0.
   - Learners' recurring charges in the school's own gateway continue
     during the grace period. The emails to learners (with the deletion
     change) tell them to cancel.
2. **Hard delete** of the school and all of its data, including its SendLit
   team and MediaLit files. This is a [separate change](#8-out-of-scope).

The owner is emailed when the school becomes read-only, 7 days before
deletion, and 1 day before. These emails go through the staff stream
(section 6), and they say that learners lose access too.

Until deletion ships, expired schools stay read-only. Their cost is
bounded: at most 500 MB for a trial, or the plan's storage for a lapsed
paid school, and no marketing email.

### Schools moved over from `main`

Decided 2026-11-14: there's no automatic move for existing courselit.app
customers. Each one moves over by hand. The rewrite's importer
(`apps/api/src/migrations/`) brings in content, not CourseLit subscriptions.

- Staff create an imported school with the staff CLI (S26), not the owner
  through onboarding, so no trial is used up. Its status is `imported`.
  It's **excluded from the automatic trial, the read-only grace period and
  deletion**.
- It gets no trial; the customer has been paying already. It becomes
  active when the owner picks Pro or Business through the normal checkout.
- Until then, it's offline and sends no email. Staff finish or remove
  imported schools by hand.
- Its first successful checkout sets `status` to `active`. From then on it's
  an ordinary school, and the lifecycle job applies to it.
- Cancelling the old subscription on `main` is part of the manual handover.
  It is not something this change does.

## 4. What each plan includes

The rule: Pro has everything a creator needs to build, sell and market.
Business adds what organisations pay for: identity, compliance and support.

| Feature | Trial | Pro | Business |
|---|---|---|---|
| Courses, downloads, every lesson type except SCORM, drip, certificates, quizzes | ✓ | ✓ | ✓ |
| Communities, paid plans, bundles, installments | ✓ | ✓ | ✓ |
| Stripe, LemonSqueezy, Razorpay on the school's own account; no fee on sales | ✓ | ✓ | ✓ |
| Page builder, blog | ✓ | ✓ | ✓ |
| Custom domain (during a trial, platform mail still links to `<slug>.courselit.app`; S31) | ✓ | ✓ | ✓ |
| Contacts, segments, broadcasts, sequences, drip emails | ✓ (nothing is sent: quota 0) | ✓ | ✓ |
| REST API, API keys, MCP | ✓ | ✓ | ✓ |
| Code injection (`code_injection`) | owner only | ✓ | ✓ |
| Remove CourseLit branding (`remove_branding`) | — | ✓ | ✓ |
| Learner SSO (`learner_sso`, already built) | ✓ | — | ✓ |
| SCORM lessons (`scorm`) | ✓ | — | ✓ |
| Audit log screen (`audit_log`) | ✓ | — | ✓ |
| Priority support | — | — | ✓ |

OSS has every feature. Feature keys go in `planFeatures` in
`apps/api/src/billing.ts`, next to the existing `business: [SSO_FEATURE]`.
Every check runs through `schoolPlan`, and every check happens when the
action happens or the page renders. Losing a plan therefore takes effect on
its own, without a sync, except for SSO (section 5) and the SendLit quota.

### Branding badge

A "Powered by CourseLit" badge, controlled by the school setting
`hideCourseLitBranding`, as on `main`. It appears in four places:

1. **The website:** a strip owned by CourseLit, under every public page.
   - `apps/storefront/components/site-page-renderer.tsx` renders a thin
     themed `Section` after `PageRenderer`, built from page-builder
     primitives.
   - Every public route renders through `PublicSitePage`: home, custom and
     sales pages, blog, product, products, checkout, communities, join,
     login and auth-complete.
   - It sits outside the page layout, so editing the page or the layout
     through the API can't remove it. FrontLit's footer block stays
     unchanged, because a CourseLit badge doesn't belong in FrontLit.
   - The admin's page editor preview should show it too. **Deferred:**
     FrontLit's `PageBuilder` has no slot under its canvas, so this needs a
     generic slot in `@frontlit/page-builder` first.
2. **Platform emails to learners.**
3. **The footer of the course viewer's sidebar**, as on `main`.
4. **The footer of the learner dashboard's sidebar.** New.

Rules:
- Every badge link is `rel="nofollow"` and carries
  `utm_source=<school subdomain>&utm_medium=badge&utm_campaign=powered_by`.
- The setting is honoured only when `schoolPlan` includes `remove_branding`.
  During a trial, the checkbox is disabled with a note that removing
  branding comes with any paid plan.
- Marketing email gets no badge. SendLit renders it, and we won't change
  SendLit for this. CourseLit's SendLit organization must keep
  `marketingBranding` off, or every school's marketing email would say
  "Sent with SendLit".
- Not covered, as on `main`: the CourseLit logo in loading spinners, the
  fallback favicon and title, and the platform sender on learner emails.
  Staff emails (team invites, admin sign-in) stay branded on every plan.
- Today the rewrite has no badges. The admin's "Remove CourseLit branding"
  checkbox (`apps/admin/components/settings/branding-settings.tsx`) isn't
  saved: it's local state only. Store the setting on the school and save it
  from that checkbox.
- Hiding the badge with CSS through code injection stays possible, as on
  `main`.

### Code injection

Pasted scripts are the easiest way to build a phishing page. Creators still
need to test analytics, pixels and chat widgets before they pay.

- With `code_injection` (Pro, Business, OSS), the storefront renders
  `codeInjectionHead` and `codeInjectionBody` for everyone.
- Without it (a trial), the school can save the code, with a note that it
  goes live with a paid plan. The storefront renders it **only for the
  school's owner** (decided 2026-11-14). It doesn't render for other team
  members, because a scammer could invite accomplices.
- How (S25):
  - the public site-settings endpoint (`/v1/public/:id/site/settings`) leaves
    the code out during a trial;
  - the storefront fetches it through a separate authenticated call, with no
    caching, using the signed-in learner session;
  - the API returns the code only if that session's user is the school's
    owner.
- Never decide this from a query parameter, a cookie the visitor controls
  or a shared cache. Pages rendered with injected code are never shared
  between visitors in a cache.

### SCORM and the audit log

- **SCORM:** without the feature, no new SCORM lessons can be added and
  existing packages can't be replaced. Lessons that already exist keep
  playing.
- **The audit log screen** is a paginated, newest-first list of the
  school's `audit_events`: actor, action, resource and time.
  - It's for people allowed to manage the school's settings.
  - It has a list operation in the contract, with a description and a
    read-only MCP tool.
  - `billing.*` events are shown only to the owner in a browser session.
    They're never included in the MCP tool or API-key responses (S9).
  - On Pro, it's refused with the upgrade prompt.

## 5. Limits

### Values

| Limit | Key | Trial | Pro | Business |
|---|---|---|---|---|
| Marketing emails per month | `marketing_emails_month` | 0 | 10,000 | 50,000 |
| Media storage | `storage_bytes` | 500 MB | 20 GB | 200 GB |

These are starting values for small schools. Raising them later is easy;
lowering them hurts existing customers.
- **Email** costs about $0.10 per 1,000 sends. 10,000 covers a list of
  1,000–2,000 contacts with four or five broadcasts a month, plus drip and
  sequences. We limit emails sent, not contacts, because sending is what
  costs money.
- **Storage** costs about $0.02 per GB a month, but video bandwidth is the
  real cost. The storage cap is our only indirect control on it.
- **No seat limit.** An extra admin costs us nothing. Invite spam is handled
  by rate limits (S6).

### The billing package says what's allowed

New in `@codelitdev/billing`, next to `planFeatures`:

```ts
createBilling({
  planFeatures: {
    pro:      ["remove_branding", "code_injection"],
    business: ["remove_branding", "code_injection", SSO_FEATURE, "scorm", "audit_log"],
  },
  planLimits: {
    pro:      { marketing_emails_month: 10_000, storage_bytes: 20 * GB },
    business: { marketing_emails_month: 50_000, storage_bytes: 200 * GB },
  },
});

billing.getLimit(entityId, "storage_bytes"); // number | null (null = unlimited)
billing.limits(entityId);                    // every limit, for the usage screen
```

- In `oss` mode every limit is `null`. With no entitled plan, every limit is
  `0`.
- When billing can't be read, the call throws. Callers refuse new usage and
  never take away anything that already exists.
- Unlimited is never a default (S7):
  - in `cloud` mode, the package checks at startup that every plan declares
    every limit key;
  - `getLimit` throws on an unknown key;
  - only `oss` mode returns `null`.
- The package doesn't count usage. Counting stays in the app, as the
  package's architecture doc (§4, §15) intends.
- CourseLit's `checkLimit(school, key, increment)` reads limits through
  `schoolPlan`, so a trial gets its own limits.

### Where each limit is enforced

**Marketing email: SendLit does it.**
- Every school is its own SendLit team, and each team grant has a
  `monthlyLimit`. SendLit reserves quota before each send, commits it when
  the send succeeds, and releases it on failure.
- CourseLit sets the quota using SendLit's field names, `quota.monthlyLimit`
  and `quota.dailyLimit` (S20).
  - Provisioning only accepts positive numbers. So CourseLit provisions with
    `monthlyLimit: 1`, then immediately sends `PATCH` with the plan's value
    (0 for a trial).
  - The integration is marked ready only after that `PATCH` is confirmed.
  - Today CourseLit sends `quota.monthly`, which SendLit drops, so the quota
    is unlimited (S3).
- The `sync_plan_features` job updates the quota on every plan change, with
  `PATCH /provisioning/teams/:teamId`.
- A daily reconciliation compares each team's quota with its school's plan.
- As a backstop, the school teams' SendLit organization has
  `defaultMonthlyLimit = 0` and `aggregateMonthlyLimit = 5,000,000`. These
  are starting values; review them with real volume.
  - We set them as operators, in SendLit's organization settings for
    CourseLit's two organizations (`organization/routes.ts`), and record
    them in the `infra` runbook.
  - The platform organization's limits in section 6 are set the same way.

**Storage: CourseLit does it, from its own `media` table** (`byte_size`,
per school).
- The check before an upload is only a courtesy. The real check is at
  finalize (S1).
- Learner uploads have their own budget (S2).
- CourseLit shares one MediaLit account across all schools. MediaLit
  enforces that account's total (`hasEnoughStorage`), so keep the total far
  above what all schools use together, and monitor it. Otherwise uploads
  fail for every school at once.

### Going over a limit

Block new usage; never delete anything.

- **Email:**
  - **Broadcasts and sequences:** SendLit runs them, and it already
    reschedules them when the quota runs out
    (`process-ongoing-sequence.ts`, using `retryAfterMs`). CourseLit does
    nothing.
  - **Drip:** CourseLit sends it (`drip-emails.ts`). When SendLit refuses a
    send with `organization_team_quota_exhausted`:
    - store `retryAfter` as `marketing_paused_until` on the school's
      `school_integrations` row (provider `sendlit`);
    - release the delivery claim, as the code already does.
    - Drip runs skip the school until `marketing_paused_until` has passed,
      and they don't log a warning for it.
- **Storage:** new uploads are refused, and existing files stay.
- **The error:** `plan_limit_reached { limit, used, allowed }`.
  - The admin shows it as an upgrade prompt.
  - Permission is checked first, and the numbers are left out for anyone
    who can't see billing (S9).
- **Warnings:** at 80% of a limit, a banner plus one email to the owner,
  sent through the staff stream (section 6).
  - Email: at most once per calendar month (UTC).
  - Storage: once each time usage crosses 80%. It can fire again after usage
    drops below 70%.
  - A trial gets no email-quota warnings. Instead it shows a note that
    sending starts with a paid plan.

### Showing usage

- `GET /v1/school/billing/usage` returns `used` and `allowed` for each
  limit. Email usage comes from SendLit's
  `GET /provisioning/teams/:teamId/usage`.
- Plan settings shows a meter for each limit.
- For MCP, see S9.

## 6. Email routing

Learner mail goes out under CourseLit's reputation, so it runs in **CourseLit's
own SendLit organization**, separate from the organization that holds
school teams (S21). One school's marketing therefore can't use up the
platform's sending, and the platform's suppression list can't be filled by
schools' marketing.

| Stream | Mail | Sent by | Budget |
|---|---|---|---|
| Staff | Admin sign-in, team invites, owner notices (read-only, deletion warnings, 80% limit warnings) | Team `platform-staff` (`sendSystemMail`) | team invites: 50 per school per day (S6) |
| Sign-in codes | Learner sign-in codes | Team `platform-sign-in` | per-address, per-school, per-IP and platform-wide limits |
| Transactional | Receipts, access granted, product and community invites, lead-magnet delivery, newsletter confirmations, SSO notices to the owner | Team `platform-transactional` | the school's daily transactional cap. Product and community invites also count toward the invite limit of 50 per school per day (S6). |
| Notifications | Community notifications | Team `platform-notifications` | **its own** daily cap per school; once it's used up, notifications are in-app only for the rest of the day |
| Marketing | Broadcasts, sequences, drip emails | The school's SendLit team | `marketing_emails_month` |

- **SendLit limits for the platform organization** (starting values;
  review them with real volume):

  | Setting | Value |
  |---|---|
  | `aggregateMonthlyLimit` | 1,000,000 |
  | `platform-staff` | 50,000 a month |
  | `platform-sign-in` | 200,000 a month |
  | `platform-transactional` | 300,000 a month |
  | `platform-notifications` | 450,000 a month |

  The organization total is the sum of the four teams, on purpose: each
  team's monthly limit is the ceiling for that stream across all schools.
  The daily caps per school (section 7) sit under those limits. Each team
  alerts at 80%.
- **Today, learner mail uses the school's team.** `queueSchoolEmail`
  (`school-emails.ts`) and notification emails
  (`notifications.ts`, then `queueNotificationEmail`) send through it. Both
  move to the platform streams above.
- **Sign-in codes get their own team.** They then never share SendLit's
  per-team rate limit (120 a minute) or suppression list with receipts and
  notifications. A complaint about one school's receipt can't block anyone's
  sign-in codes.
- **The sender** (decided 2026-11-14):
  - **Target:** the school's name as the From name, at the platform's
    address, as on `main`. SendLit pins one sender name per team, so this
    needs a generic SendLit feature: a sender name per message, restricted
    to the school's name, which is already validated under S14.
  - **Until SendLit has it:** the From name is "CourseLit", and the subject
    names the school (for example "Sign in to <school>").
  - **Reply-To:** the reply-to address from the school's mailing settings,
    if one is set. `main` set no Reply-To on these emails. The rewrite has no
    reply-by-email for notifications.
- **Tracking each school (S14):** this needs another generic SendLit
  feature, a tag on each message. CourseLit tags every platform email with
  its school, so bounces and complaints can be counted per school.
- **Links:** platform mail links to the school's verified custom domain only
  once the school is on a paid plan. Until then, it links to
  `<slug>.courselit.app` (S31).
- **Marketing never falls back to the platform.** Today
  `schoolEmailSender` switches to the platform when a school's integration
  isn't usable. Marketing mail waits instead.

## 7. Security requirements

From three security reviews on 2026-11-14, against the code as it stood that
day. "Exists today" means the bug is in the current code.

### Rate limits and caps

Starting values, decided 2026-11-14. Each limit is enforced on the server and
returns the standard rate-limit error. The caps on platform mail alert at
80%.

| What | Limit | Requirement |
|---|---|---|
| Learner sign-in codes | 5 per address per hour, 50 per school per hour, 20 per IP per hour | S14 |
| Lead-magnet delivery | 3 per address per day, 100 per school per day, 20 per IP per hour | S14 |
| Learner sign-in codes, platform-wide | 10 per address per hour, across all schools | S28 |
| Lead-magnet delivery, platform-wide | 10 per address per day, across all schools | S28 |
| Platform transactional mail per school | trial 200 a day, Pro 2,000, Business 10,000 | S14 |
| Community notification email per school | trial 500 a day, Pro 5,000, Business 25,000; after that, in-app only | S22 |
| Learner uploads per school | at most 25% of `storage_bytes` in total (S24); refused once the school is above 90% of `storage_bytes` (S2) | S2, S24 |
| Invites (team, product and community, counted together) | 50 per school per day; at most 200 pending | S6 |
| School creation | 3 per account per day | S15 |
| Learner uploads | 20 per learner per hour, on top of the 100 MB budget | S2 |

### Storage

**S1. The storage check can be bypassed (high, exists today).**
- **The problem:**
  - `MediaLitClient.authorizeUpload` (`apps/api/src/media-lit-client.ts`)
    throws away the declared size and type. The MediaLit signature covers
    only `group: schoolId`.
  - MediaLit deletes a signature only when an upload finishes, so one
    signature allows several uploads at once.
  - This is CourseLit's flaw, not MediaLit's: MediaLit enforces its own
    account limits.
- **The fix:**
  1. At finalize, call `getAsset` and check that the asset's group is this
     school **before** sealing anything. MediaLit's seal and delete aren't
     scoped to a group, so the wrong order lets school A seal or delete
     school B's uploads. The admin and learner finalize paths in `media.ts`
     currently seal first.
  2. Inside a transaction that locks the school, add MediaLit's reported
     size. If it doesn't fit, delete the asset and refuse.
  3. Reserve the declared size when the upload is authorized, and count
     open reservations until finalize or expiry.
- **Already handled:** MediaLit deletes uploads that are never finalized
  after `TEMP_MEDIA_EXPIRATION_HOURS`.
- **Later:** a generic MediaLit feature where signatures carry `maxBytes`
  and allowed MIME types. It's not required.

**S2. Learners can use up a school's storage (high).** Learners upload
community media (up to 100 MB each) and avatars into the school's `media`
table.
- Each learner gets a budget, **100 MB by default**. Admins can change it in
  `/settings`, up to 1 GB. Learner uploads are also rate-limited to 20 per
  learner per hour.
- Learner uploads count toward the school's total, but they're refused once
  the school passes 90% of `storage_bytes`. The last 10% is kept for admins.
- Errors shown to learners stay generic, with no plan or usage numbers.

### Email

**S3. The email limit fails open (high, exists today).** Covered in
section 5: set the quota at provisioning, update it on every plan change,
reconcile daily, and keep the organization-wide backstop limits.

**S6. Invite spam (medium).** Team invites go through `platform-staff`, and
product and community invites through `platform-transactional` (section 6).
Team, product and community invites are limited to 50 per school per day,
with at most 200 pending.

**S14. Platform mail carries the school's own text (high).**
- **Fixed templates.** CourseLit writes every platform email.
  - The only school-supplied parts are short, plain fields: the school name,
    product and community titles, and an invite message if there is one.
    They're escaped and length-capped.
  - The only links are CourseLit-generated links to the school's own host.
  - School names are restricted when they're saved: limited length, and no
    URLs or email addresses. Today the sign-in subject is
    `Sign in to ${schoolName}`, with up to 200 free characters.
- **Rate limits on anything someone can trigger at an arbitrary address:**
  - sign-in codes: per address, per school and per IP. Today the only limit
    is per school and address, per hour.
  - lead-magnet delivery: per address, per school and per IP;
  - a captcha on both, once Turnstile ships.
- **A daily cap per school** on platform transactional mail: trial 200, Pro
  2,000, Business 10,000, with an alert at 80%. Notifications have their own
  cap (S22).
- **On the platform teams:** use the limits in section 6, and track bounces
  and complaints per school through message tags (S21), so a bad school can
  be found and stopped.
  - Until SendLit has tags, the daily caps per school and the suspend
    command (S26) are the controls.
  - CourseLit also logs every platform send with its school and SendLit
    message ID, so a complaint can be traced back to its school by hand.

(S5 and S13 are merged into section 6 and S14.)

### Plans and billing

**S7. "Unlimited" must be explicit (medium).** See section 5.
`runtime.ts` defaults `billingMode` to `cloud`. Keep it that way: never
default to `oss`.

**S8. LemonSqueezy test-mode events (deferred).** LemonSqueezy uses the same
store ID in test and live mode, and the package's provider doesn't check
`meta.test_mode`. Until the package rejects mismatched events, keep the
test and live webhook secrets different. Checkouts are already tied to a
school through a `checkoutAttemptId` made on the server.

**S9. Billing information over MCP (low).**
- Reading the plan is owner-only, needs a browser session, and isn't
  available over MCP (`operation-policy.ts`, `mcp-parity.ts`).
- **Decided 2026-11-14:** the usage endpoint follows the other billing
  operations. It's owner-only and needs a browser session. It's kept off
  MCP, with a parity exemption in `mcp-parity.ts` and an entry in
  `REACHABLE_BUT_EXEMPT` explaining why.
- Limit errors shown to non-owner admins leave out the numbers.
- If limits are cached, keep the cache short and clear it in the sync job.

**S15. Read-only mode doesn't exist yet (high).** Covered in section 3.

**S17. The billing package grants too much (medium; fixed in step 1).**
- **The problem,** in `@codelitdev/billing` 0.11.0:
  - `past_due` stays entitled with no time limit;
  - LemonSqueezy's `paused` maps to `past_due`.
  - LemonSqueezy's own retries usually end in `unpaid`, which isn't
    entitled. But a lost webhook would leave the school entitled for good.
- **The fix, in the package:**
  - `past_due` stays entitled only until `paidThroughAt` plus a grace
    period the app sets. CourseLit sets **7 days**, the same past-due grace
    that section 3 uses;
  - `paused` isn't entitled;
  - every paid status, including `active` and `trialing`, stays entitled
    only until `paidThroughAt` plus the grace period (S29). A lost webhook
    then can't grant access for good.
  - The fix is generic: SendLit and MediaLit use the same rules.
- **In our LemonSqueezy store:** no trial on the products, and pausing
  turned off.

**S18. A paid plan wins over the trial.** Covered in section 3.

### Sign-in and SSO

**S10. "SSO required" can lock learners out (high, exists today, from
#879).**
- **The problem:** SSO enforcement (`sign-in-policy.ts`) checks only that
  the connection is active. SSO sign-in (`learner-sso-sign-in.ts`) also
  checks the plan. If the plan says no while the connection is still
  active, learners in enforced domains can't sign in at all.
- **The fix:**
  - If the plan **can't be read**, follow the stored connection state: keep
    enforcing, and allow SSO sign-in.
  - Drop enforcement only after a **confirmed** lapse, meaning the plan was
    read and doesn't include SSO.
  - Never let enforced domains fall back to email codes because of a billing
    error. That would let an offboarded employee in.

**S11. The SSO sync must know about trials (high).**
- `syncPlanFeatures` and its daily sweep call billing directly
  (`planIncludesFeatureOrThrow`). They would suspend SSO on every trialing
  school, so they must go through `schoolPlan`.
- The lifecycle job queued at school creation (section 3) handles the trial's
  end. The daily sweep stays as the backstop.
- Tests:
  - SSO can be turned on during a trial;
  - it's suspended when the trial ends without Business;
  - it stays on when Business is bought before the trial ends.

### Abuse

**S12. Abuse by trial schools.**
- **The risk is to our reputation, not our money.** Schools use their own
  payment accounts, so the gateway checks identity and absorbs chargebacks.
  The real danger is a scam or phishing site on `<slug>.courselit.app`. A
  phishing page has been reported on a Teachable subdomain.
- **What competitors do:**
  - Teachable, Podia and Kajabi publish an acceptable use policy, an abuse
    address and a copyright takedown process.
  - Teachable, Podia, Thinkific and Circle serve schools on their main
    domain, and none of those domains is on the Public Suffix List.
- **What we do:**
  1. An acceptable use policy page.
  2. An `abuse@` address, and a "Report this site" link to a fixed CourseLit
     URL on every storefront page, including the certificate page, on every
     plan (S30).
  3. A staff CLI command that suspends a school straight away, turning off
     its storefront and email (S26).
  4. Owner-only code injection during a trial (section 4).
  5. Schools stay on `<slug>.courselit.app`. Admin and learner sessions
     already use `__Host-` cookies, so a school's site can't plant cookies
     on `app.courselit.app`.
  6. Live payments are **not** blocked during a trial.
  7. A small record kept for 12 months after deletion. This belongs to the
     deletion change.

**S19. Reserved and reused subdomains (medium).**
- **Now:** add a reserved list to the API contract's subdomain validation:
  `www`, `app`, `api`, `admin`, `mail`, `login`, `billing`, `support`,
  `status`, `docs` and so on.
- **With the deletion change:** hold a deleted school's subdomain for 90
  days before anyone else can claim it. That protects learners' bookmarks,
  old email links and SAML traffic.

### For the deletion change

**S16. Deleting safely.**
- As on `main`, cancel subscriptions first and delete afterwards:
  - the school's CourseLit subscription;
  - learners' recurring and installment subscriptions in the school's own
    gateway, with an email to those learners.
- Block deletion while checkouts are open, webhooks are unprocessed or plan
  changes are in progress (`getBillableEntityBillingBlockers`). Process the
  school's pending webhooks while it's locked.
- Only the owner can request or cancel a deletion, after signing in
  recently, and never through MCP or API keys.

### From the final audit (2026-11-14; all decided)

**S20. The trial's "quota 0" would be unlimited (high, exists today).**
- CourseLit's client sends `quota.monthly` and `quota.daily`
  (`sendlit-client.ts`). SendLit expects `monthlyLimit` and `dailyLimit`, and
  drops unknown fields. The grant then falls back to the organization's
  `defaultMonthlyLimit`, where null means unlimited.
- Provisioning also requires a positive number, so 0 is rejected. Only
  `PATCH` accepts 0.
- Fix:
  - use SendLit's field names;
  - set the organization's `defaultMonthlyLimit` to 0, so a missing quota
    fails closed;
  - mark the integration ready only after a `PATCH` that sets the quota has
    been confirmed;
  - add a contract test between CourseLit's client and SendLit's schema.

**S21. The platform team is shared by every school (high).**
- **Shared limits:**
  - SendLit allows 120 sends a minute per team (`transactional/routes.ts`),
    so that is the ceiling for every school's sign-in codes together.
  - Suppression is per team. One complaint about school A's receipt blocks
    that person's sign-in codes from every school, and their admin sign-in
    too.
- **Shared organization:** this is why the platform teams get their own
  organization. If they shared one with school teams, one school's
  marketing could use up the organization's `aggregateMonthlyLimit` and stop
  all sign-in mail.
- **Two things section 6 needs that SendLit can't do yet:**
  - The sender name is pinned per team, so "From: the school's name" can't
    be set per email.
  - The send API takes no per-school tag, so bounces and complaints can't be
    tracked per school (S14).
- **Decided:** the platform teams live in their own SendLit organization.
  Sign-in codes have their own team. SendLit gets two generic features: a
  sender name per message and tags per message. Until then, the From name
  is "CourseLit". See section 6.

**S22. Community notifications are platform mail sent in bulk (high).**
- Every new post emails each active member (`communities.ts`, then
  `notifications.ts`, then `queueNotificationEmail`). That makes it
  platform mail sent to many recipients at once.
- A learner posting in a large community could use up the school's daily
  platform cap, which would block that school's sign-in codes and receipts.
- Admins would also gain an unmetered broadcast channel.
- **Decided:** notifications are their own platform stream, with their own
  daily cap per school (see the rate-limit table). Once a school's cap is
  used up, notifications for the rest of the day are in-app only. Nothing
  sent to many recipients shares a cap with sign-in codes or receipts.

**S23. Billing errors must not start a school's grace period (high).**
- `hasFeature` and `schoolHasFeature` answer no when billing can't be read.
  If `schoolPlan` did the same, a billing outage would make paying schools
  look expired: read-only, with deletion warnings sent to their owners.
- **Decided:** `schoolPlan` is built on `commercialState` and has an
  `unknown` result. The lifecycle job does nothing on `unknown`. See
  section 3.

**S24. Learner uploads can be abused for public hosting (high).**
- `authorizeLearnerCommunityMediaUpload` needs only a learner session, and
  anyone can get one with an email code.
- The learner chooses `accessPolicy: "public"` and declares the MIME type
  themselves. So any school becomes free public hosting for phishing or
  malware files, and throwaway learners can fill the school's storage up to
  the 90% cut-off.
- **Decided:**
  - learner uploads require an active community membership with permission
    to post;
  - access is always private, whatever the client asks for;
  - uploads that no post uses after 24 hours are deleted;
  - learner uploads together can use at most 25% of the school's
    `storage_bytes`;
  - at finalize, the type MediaLit detects must be an image, video, audio or
    PDF.

**S25. Trial code injection needs its own path (medium; decided: owner only).**
- Injected code is served by the public, unauthenticated
  `/v1/public/:id/site/settings` endpoint (`dispatch.ts`). The storefront
  caches that response for everyone for 60 seconds, and renders the code in
  the layout.
- During a trial:
  - leave the code out of the public endpoint;
  - the storefront fetches it through an authenticated call, with no
    caching, using the signed-in learner session;
  - the API returns the code only to the school's owner. See section 4.

**S26. Staff actions and school states need a home (medium).**
- No platform-staff role exists, and admin sign-in has no second factor.
  **Decided:** staff actions are a **CLI** run on the API server
  (`bun run staff <command>`), not a web role. Running it requires access to
  the server, which is the strongest check we have. The commands are:
  - `suspend <school>` and `unsuspend <school>`;
  - `import-school --owner-email <email> --name <name> --subdomain <slug>
    --main-school <id>`: creates an `imported` school owned by that
    account, then runs the existing content importer;
  - `remove-imported <school>`.

  Each command is written to a new `platform_audit_events` table: who ran
  it, the command, the school's ID and slug, and the time. The table has no
  foreign key to schools, so its rows survive deletion. (`audit_events`
  rows are deleted along with the school.)
- The offline states and `read_only` are enforced in one central place:
  `dispatch`, the worker and the custom-domain lookup. The allowlist is in
  section 3. Today the public and learner endpoints can be called directly:
  sign-in codes, lead magnets, checkout and uploads.

**S27. The imported flag's lifecycle (medium).**
- **Decided:** see "Where school state lives" in section 3.
  - `imported` becomes `active` at the first checkout.
  - Staff create imported schools.
  - `pending_checkout` covers an account whose trial is used up, and it
    expires after 7 days.
  - Only the lifecycle job and the staff CLI write the state fields.

**S28. Limits that are only per school (medium).**
- Sign-in codes and lead magnets are rate-limited per school
  (`rate-limit.ts`). One address could be flooded from many schools.
- **Decided:** add a platform-wide limit per recipient address: 10 sign-in
  codes an hour and 10 lead magnets a day, across all schools (see the
  rate-limit table).

**S29. Every paid status needs an end date (medium).**
- The billing package keeps `active` and `trialing` entitled with no limit,
  as well as `past_due`. A lost webhook grants access for good, whatever
  the status.
- Extend S17: every paid status stays entitled only until `paidThroughAt`
  plus the grace period.

**S30. Smaller fixes (low).**
- **Audit log:** it must hide `billing.*` events from anyone who isn't the
  owner, and keep them out of MCP entirely (S9).
- **"Report this site":** it needs a fixed CourseLit URL that works on every
  page, including the certificate page. A badge strip can be removed by a
  paid plan or hidden with CSS.

**S31. Custom domains during a trial (medium; decided: keep them, with slug links in mail).**
- The trial includes custom domains, and `schoolSiteUrl` prefers a school's
  verified custom host. So platform mail, sent under CourseLit's reputation,
  would link to a domain a trial school chose.
- **Decided:** a trial can still connect a custom domain, but platform mail
  links to `<slug>.courselit.app` until the school is on a paid plan.

## 8. Out of scope

### School deletion (a separate change)

It's irreversible and touches all three products. Deleting a school when its
owner asks will reuse it.

- **SendLit:** an endpoint that hard-deletes a team and everything in it.
  Today `DELETE /provisioning/teams/:teamId` only archives.
- **MediaLit:** delete every file in a group. It can't do this today.
- **CourseLit:**
  - a purge job across every school-scoped table, safe to repeat and able
    to resume after a partial failure;
  - a dry run;
  - a final check that the school still has no plan;
  - an audit record that outlives the school.
- **Also:** S16, the 90-day subdomain hold (S19), and the 12-month record
  (S12).

### Buying more email or storage (later)

In v1, a school that hits a limit upgrades or waits for the next month.

- **Later: prepaid packs,** such as 10,000 more emails, not overage billed
  afterwards. Overage would let a spammer send first and never pay.
- **What packs need:**
  - one-time offers and a credit ledger in `@codelitdev/billing` (it only
    supports recurring plans today);
  - support for the `order_created` and `order_refunded` webhooks in its
    LemonSqueezy provider.
- **How packs would work:**
  - email credits raise the SendLit team's monthly quota;
  - packs last 12 months and survive plan changes;
  - a refund takes back only the unused credits;
  - credits are granted only for a paid order of a known pack at the
    expected amount;
  - the order ID is the idempotency key.

## 9. Order of work

The trial isn't switched on for anyone until these are done:
- steps 0–4;
- S25 (owner-only code injection) from step 5;
- the acceptable use policy, the `abuse@` address and the "Report this
  site" link from step 9.

The rest of steps 5–10 can then follow in any order.

0. **Payment provider.** Replace Dodo in `apps/api/src/billing.ts` with the
   package's `createLemonSqueezyBillingProvider`. Copy MediaLit's setup:
   - `medialit/apps/api/src/billing/providers.ts`:
     - `LEMONSQUEEZY_API_KEY`
     - `LEMONSQUEEZY_STORE_ID`
     - `LEMONSQUEEZY_WEBHOOK_SECRET` and `LEMONSQUEEZY_WEBHOOK_SECRET_PREVIOUS`
   - `medialit/apps/api/src/billing/catalog.ts`: `BILLING_PROVIDER`, and the
     product ID and amount variables.

   Set the new prices, and start a new `BILLING_CATALOG_REVISION`. In our
   LemonSqueezy store, give the products no trial, and keep pausing turned
   off.
1. **Foundations:**
   - **`@codelitdev/billing`,** then release:
     - `planLimits`, `getLimit` and `limits`, tested for OSS mode, no plan,
       read errors and unknown keys;
     - the S17 and S29 fixes.
   - **CourseLit:**
     - upgrade to that release and declare `planFeatures` and `planLimits`;
     - the state columns and tables (section 3);
     - `schoolPlan` with the full result union (S23);
     - `checkLimit` and `plan_limit_reached`;
     - central enforcement of offline and `read_only` states (S26).
2. **SendLit quota (S20, S3).**
   - SendLit's field names, and provisioning followed by a `PATCH`.
   - The school organization's default of 0.
   - A contract test.
   - Quota set from `schoolPlan`, synced on plan changes and reconciled
     daily.
   - Drip pausing with `marketing_paused_until`.
3. **Email routing (section 6), S14, S21, S22 and S28:**
   - the platform organization and its four teams;
   - learner mail and notifications moved off school teams;
   - S14's templates and caps, and the per-address limits;
   - links on the slug host during a trial.
   - **SendLit, in parallel:** a sender name per message, and tags per
     message. Both are generic. Switch the From name to the school's name
     once they ship.
4. **The trial and its lifecycle (section 3):**
   - `school_trials` and one trial per account;
   - `pending_checkout`;
   - the onboarding change;
   - `evaluate_school_lifecycle` and its triggers;
   - the read-only allowlist;
   - the owner emails;
   - imported schools;
   - the staff CLI and `platform_audit_events` (S26);
   - the SSO fixes, S10 and S11.
5. **Plan features (section 4):**
   - the four badges and a working checkbox;
   - code injection for the owner only during a trial, through its own path
     (S25);
   - SCORM gating;
   - the audit log screen, with `billing.*` events for the owner only (S30).
6. **Invite limits (S6).**
7. **Storage:**
   - the check at finalize, and reservations (S1);
   - `learnerUploadLimitBytes` (S2);
   - S24: membership required, private access, deleting unused uploads,
     the 25% learner share, and the type allowlist.
8. **Usage:** the usage endpoint (owner only, off MCP with an exemption;
   S9), meters and 80% warnings.
9. **Abuse handling (S12, S19, S30):**
   - the acceptable use policy;
   - the `abuse@` address;
   - the fixed "Report this site" link on every page;
   - the reserved subdomains.
10. **Docs in `frontlit/docs`:**
    - the trial;
    - plans and prices;
    - limits, and what happens at a limit;
    - what happens when a trial or subscription ends.
