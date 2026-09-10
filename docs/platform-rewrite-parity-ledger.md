# CourseLit platform rewrite parity ledger

This document is the implementation control plane for the Platform-based CourseLit rewrite. It turns the current repository and the external `courselit-subscriptions` application into an explicit list of behavior and data that must be migrated, replaced, archived, or retired.

It complements [the rewrite PRD](./platform-based-rewrite.md). The PRD defines the target; this ledger records what exists and how completion will be proved.

## Status and evidence rules

Last source inventory: 2026-09-05, branch `platform-based-rewrite` at legacy baseline `62b5abb5`.

Statuses used below:

- **Inventoried**: the current source and target disposition are known.
- **Contract pending**: the target contract or migration transform has not been implemented yet.
- **Evidence pending**: implementation exists or is delegated, but parity evidence is not yet attached.
- **Verified**: automated evidence named in the row passes against representative legacy fixtures and the target system.
- **Retired**: the capability was deliberately removed and its replacement or archive has been verified.

No row becomes **Verified** from code review alone. The evidence must cover tenant isolation, authorization, read-only behavior, migration, and deletion where those concerns apply.

This inventory is complete for code visible in the CourseLit and `courselit-subscriptions` repositories. Production-only configuration, traffic, data volume, provider usage, and operational procedures still require operator evidence; they are tracked in the Milestone 0 exit checklist below.

## Workload and deployment inventory

| ID    | Current workload                  | Current responsibility                                                                                                                                   | Target                                                 | Disposition                                                   | Status           | Evidence                                                     |
| ----- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- | ---------------- | ------------------------------------------------------------ |
| W-001 | `apps/web` (`@courselit/web`)     | Multi-tenant Next.js app containing admin UI, learner UI, Better Auth, GraphQL, public REST, checkout, webhooks, media proxying, SCORM, and certificates | `apps/admin`, `apps/learners`, and `apps/api`          | Migrate and split by responsibility                           | Inventoried      | Current package manifest, `apps/web/app`, `apps/web/graphql` |
| W-002 | `apps/queue` (`@courselit/queue`) | Express ingress, BullMQ workers, notification delivery, drip unlock, email automation, and SSE                                                           | `apps/api/src/worker.ts` plus API-owned job ingress    | Migrate CourseLit jobs; retire CourseLit marketing automation | Inventoried      | `apps/queue/src/index.ts`, worker inventory below            |
| W-003 | `apps/docs-new`                   | Current Fumadocs documentation site                                                                                                                      | `apps/docs`                                            | Migrate current content and regenerate API/MCP docs           | Inventoried      | `apps/docs-new/content`                                      |
| W-004 | `apps/docs`                       | Older documentation implementation                                                                                                                       | Archive after content reconciliation                   | Retire                                                        | Inventoried      | `apps/docs/src/pages`                                        |
| W-005 | `courselit-subscriptions`         | Cloud account login, KYC, school provisioning, custom domains, school deletion, plan checkout/switch/cancel/resume, and subscription state               | CourseLit admin/API plus Platform billing composition  | Migrate data and workflows; retire application                | Inventoried      | External repository inventory below                          |
| W-006 | `codelit/courselit-app` image     | Production legacy web image                                                                                                                              | New admin, learner, and API images                     | Replace                                                       | Inventoried      | `services/app/Dockerfile`, Docker publish workflow           |
| W-007 | `codelit/courselit-queue` image   | Production legacy queue image                                                                                                                            | API image with separate worker entrypoint              | Replace                                                       | Inventoried      | `services/queue/Dockerfile`, Docker publish workflow         |
| W-008 | MongoDB                           | Product and queue persistence                                                                                                                            | PostgreSQL                                             | School-scoped import, reconcile, then archive                 | Inventoried      | Mongoose models listed below                                 |
| W-009 | Redis/BullMQ                      | Legacy jobs                                                                                                                                              | Target queue selected by generated Platform foundation | Migrate only retained jobs                                    | Contract pending | `apps/queue/src` and deployment compose                      |
| W-010 | Caddy/server load balancer        | TLS and, in the rollout, hostname-to-generation routing                                                                                                  | External Caddy cohort router                           | Extend outside this repository                                | Contract pending | PRD routing state machine and operator runbook               |

## Capability parity ledger

### Schools, tenancy, and identity

| ID      | Current behavior                                                       | Target owner                   | Disposition and migration rule                                                                   | Status           | Required evidence                                                         |
| ------- | ---------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------- |
| SCH-001 | A `Domain` represents a school and owns its settings and data          | CourseLit API                  | Migrate each non-deleted domain to one school; preserve legacy ID mapping                        | Evidence pending | School-level currency update is owner-only, tenant-bound, audited, and covered by `apps/api/src/slice.test.ts`; domain importer fixture, counts/checksums, host-resolution and full cross-school isolation tests remain pending |
| SCH-002 | CourseLit subdomains and optional custom domains resolve schools       | CourseLit API + Caddy          | Migrate normalized hostnames; reject duplicates; promote atomically in Caddy                     | Evidence pending | Custom-host lifecycle and duplicate-host tests; Caddy validation/reload still pending |
| SCH-003 | `domain.email` identifies the owner                                    | CourseLit API                  | Resolve the legacy email to exactly one admin account and owner membership; quarantine ambiguity | Evidence pending | Owner reconciliation fixture/report and invariant tests                 |
| SCH-004 | Cloud users create schools in `courselit-subscriptions`                | CourseLit API                  | New schools are created in PostgreSQL and provision integrations without Mongo writes            | Contract pending | Signup/provisioning browser test and absence-of-Mongo-write proof         |
| SCH-005 | Custom domains can be added, verified, removed, and reused             | CourseLit API + Caddy          | Preserve verification state where trustworthy; otherwise reverify before routing                 | Evidence pending | DNS-token lifecycle, takeover prevention, removal, and routing tests     |
| SCH-006 | School deletion coordinates owner, subscription, and product cleanup   | CourseLit API + integrations   | Implement an audited deletion workflow with table-by-table policy and integration cleanup        | Contract pending | Deletion matrix, idempotency tests, financial-retention proof             |
| ADM-001 | Admins and learners currently share `User` and auth state              | CourseLit API                  | Deterministically split admin principals from school-local learners; force reauthentication      | Contract pending | Classification report; mixed-user fixtures; session-boundary tests        |
| ADM-002 | Permissions live on legacy users                                       | Platform authorization adapter | Map owners and invited members to school memberships and explicit roles/permissions              | Contract pending | Authorization matrix and tenant conformance                               |
| ADM-003 | API keys act as the domain owner                                       | Platform authentication        | Replace with school-bound keys and explicit actor/audit semantics                                | Contract pending | Key scope, revocation, owner attribution, and audit tests                 |
| ADM-004 | SSO and Google login settings are stored per domain                    | Learner auth realm             | Migrate only supported school-local learner providers; never reuse admin credentials             | Complete         | Better Auth SSO, Google, and Email OTP configured per-school via admin settings and public API; verified in `apps/api/src/learner-auth.test.ts` |
| ADM-005 | CourseLit Cloud account login is separate in `courselit-subscriptions` | Admin auth realm               | Migrate account ownership/membership; retire subscription-app sessions                           | Contract pending | Admin auth and forced-reauthentication tests                              |

### Products and learning

| ID      | Current behavior                                                          | Target owner                | Disposition and migration rule                                                           | Status           | Required evidence                                             |
| ------- | ------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| PRD-001 | Courses and digital downloads share the product model                     | CourseLit API               | Migrate products, visibility, pricing links, authors, metadata, and slugs                | Evidence pending | `apps/api/src/migrations/products.test.ts` covers source-typed course import, school mapping, rich description preservation, and idempotency; `apps/api/src/migrations/payment-plans.test.ts` covers source payment-plan amount fields, default state, school currency isolation, rejection, and idempotency; public/admin read parity and production-shaped fixture evidence remain pending |
| PRD-002 | Courses contain ordered groups/sections and lessons                       | CourseLit API               | Normalize sections and ordering without changing learner-visible order                   | Evidence pending | Section ordering, assignment, cross-school, and malformed-order tests |
| PRD-003 | Lessons support multiple content types and visibility rules               | CourseLit API               | Migrate supported types; preserve opaque unsupported payloads for repair                 | Evidence pending | Lesson type enum/content JSON contract, rich-text authoring, dedicated learner lesson viewer, authorization tests, type-by-type renderer and malformed-data report still pending |
| PRD-004 | SCORM packages, runtime state, evaluations, and size limits are supported | CourseLit API + learner app | Migrate package references and learner state; preserve sandbox/private-delivery controls | In progress | SCORM package processing, private delivery, membership-scoped runtime state, quiz evaluations, completion guards, and focused tests are ported; migration/browser evidence remains pending |
| PRD-005 | Admins can preview unpublished products as learners                       | CourseLit API + learner app | Replace implicit privilege with short-lived, school/product-bound preview grants         | Evidence pending | Grant expiry, scope, replay, and no-membership-mutation tests |
| PRD-006 | Certificates and templates are generated from course completion           | CourseLit API + learner app | Migrate templates and issued certificates; retain verification identifiers               | Evidence pending | `certificates.test.ts` covers completion, idempotence, learner listing, public verification, template presentation fields, stable certificate-ID lookup, and school isolation; learner My Content exposes the active certificate ID and `/certificates/[verificationId]` renders a printable template-backed certificate; template import still pending |
| PRD-007 | Memberships and `User.purchases` grant product access                     | CourseLit API               | Normalize into `learner_memberships` with lifecycle and included-plan provenance       | Evidence pending | Free/admin membership activation creates one school-scoped learner membership; duplicate activation remains idempotent; learner `My content` reads active published products through `/v1/learner/products`, including published-lesson progress, featured artwork, certificate linkage, and download state; authenticated digital-download links and archive delivery are covered by `downloads.test.ts`; purchase/import reconciliation still pending |
| PRD-008 | Drip schedules unlock course content asynchronously                       | CourseLit worker            | Move unlock calculation and scheduling into the API application worker                   | Evidence pending | `drip.test.ts` covers relative/fixed unlock precedence, locked-content omission, preview bypass, start/completion guards, and idempotent progress reads/writes; dedicated lesson viewer consumes locked-content/access state; durable worker scheduling and read-only behavior remain pending |
| PRD-009 | Admin reports and learner activity summarize product usage                | CourseLit API               | Migrate required state plus 12 months of queryable raw activity; archive older events    | Contract pending | Aggregate comparison and archive manifest                     |

## Feature-level porting briefs

The capability rows above are not sufficient evidence for Milestone 3. The following
brief is the first feature-level comparison opened against the `main` worktree. It is
intentionally marked **In progress** until the target journey has side-by-side browser
evidence and the production regression cases are ported.

### M3-FPB-001 — Product Manage and storefront payment plans

- **Status:** In progress; Milestone 3 remains open.
- **Production entry points and hierarchy:** `main` uses `/dashboard/product/[id]` for the
  product dashboard, `/dashboard/product/[id]/manage` for Manage, and the Manage screen
  composes Product details, Featured image, Payment plans, Discussions, Download options,
  Publishing, Certificates, and Deletion. The payment-plan list links to
  `/dashboard/paymentplan/product/[id]/new` and
  `/dashboard/paymentplan/product/[id]/edit/[planid]`. The rewrite deliberately adapts
  only the last navigation step: create and edit are dialogs from the Manage screen.
- **Main source and regression evidence:**
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/page.tsx`,
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/components/payment-plans.tsx`,
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/components/product-details.tsx`,
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/components/product-publishing.tsx`,
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/components/download-options.tsx`,
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/components/certificates.tsx`,
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/components/product-deletion.tsx`,
  `apps/web/components/admin/payments/payment-plan-list.tsx`,
  `apps/web/components/admin/payments/payment-plan-form.tsx`,
  `apps/web/hooks/use-payment-plan-operations.ts`, and the payment-plan route/API tests
  under `apps/web/app/(with-contexts)/dashboard/(sidebar)/paymentplan` and
  `apps/web/app/api/products/[productId]/payment-plans`.
- **Visible behavior:** the list shows plan name, amount, payment-type/frequency badges,
  included-product count where applicable, a recommended/default star, an archive action
  with confirmation, and a dashed New Plan entry. The editor has Basic Information
  (name and description) and Pricing sections. Pricing conditionally shows Free,
  One-time, Subscription (monthly/yearly), or EMI fields; non-free amounts and EMI
  installment count are validated before save. EMI is monthly payment amount × total
  installments and has no separate frequency control; only subscriptions choose
  monthly or yearly. Active plans allow one Free, One-time, and EMI plan, plus one
  Monthly and one Yearly subscription; display names may repeat across those types.
  Product-owned plans reject included products. The rewrite dialog preserves these
  controls and behavior while adapting the route to an in-place dialog.
- **Source persistence contract:** `PaymentPlan` stores `name` as required String,
  `type` as the source `free`/`onetime`/`emi`/`subscription` enum, and separate
  numeric fields `oneTimeAmount`, `emiAmount`, `emiTotalInstallments`,
  `subscriptionMonthlyAmount`, and `subscriptionYearlyAmount`. It also stores
  `archived` and `internal` booleans, `description` as String,
  `includedProducts` as an array of strings, and indexes by domain/entity/archive and
  plan identity. Currency is not a plan input or field in `main`; it is centrally managed by
  the school. The target therefore derives currency server-side from `schools.currency`,
  exposes it only as a response projection, and snapshots it on checkout attempts for
  immutable payment verification. It does not accept a client-provided currency on
  create/update.
- **School currency persistence:** The rewrite exposes the central currency setting
  through the owner-only `PATCH /v1/schools/:schoolId` contract. The selected school
  context must match the public ID in the path; updates are normalized to uppercase,
  audited as `school.updated`, and reflected in subsequent plan projections and
  checkout snapshots. The setting is intentionally not part of the payment-plan
  dialog or plan persistence record.
- **Amount-model porting rule:** The target persists the source amount fields and source
  type semantics. Its `kind`, `amountMinor`, `billingInterval`, and `installmentCount`
  values are adapter projections for the selected school checkout provider;
  they must not replace the source fields. When a plan changes type, fields belonging to
  the previous type are cleared rather than silently retained.
- **Operations and side effects:** create, update, set recommended/default, archive,
  duplicate-type conflict, archived-plan conflict, and product/tenant lookup are
  required. Default selection must leave one active default; archiving the default
  is rejected with the source `default_payment_plan_cannot_be_archived` behavior;
  administrators must select another default before archiving it. Each mutation is
  school-scoped, permission checked, transactionally persisted, and audited.
- **Target implementation/evidence:** `apps/admin/components/products/payment-plan-list.tsx`,
  `apps/admin/components/products/payment-plan-dialog.tsx`,
  `apps/api/src/storefront.ts`, `apps/api/src/db/schema/storefront.ts`, and
  `apps/api/drizzle/0000_baseline.sql`. The API behavior is
  covered by `apps/api/src/storefront.test.ts`; source payment-plan migration is covered by
  `apps/api/src/migrations/payment-plans.test.ts` and the operator path is
  `apps/api/scripts/import-payment-plans.mjs`. Admin typecheck and the storefront/commerce
  API tests pass. Browser side-by-side evidence is still pending.
- **Disposition:** port existing behavior, adapted only from dedicated plan routes to a
  dialog as explicitly requested; preserve source field semantics and centralized school
  currency. The broader Manage parity brief (featured media, publishing/privacy,
  download lead-magnet behavior, certificates/templates, deletion, and product details)
  remains open and must be completed before M3 can close.

### M3-FPB-002 — Remaining product Manage sections

- **Status:** In progress; implementation is being ported in slices and Milestone 3
  remains open.
- **Production composition:** `main` renders the Manage sections in this order:
  Product details, Featured image, Payment plans, Discussions, Download options,
  Publishing, Certificates, and Deletion. Existing controls, conditional visibility,
  validation, optimistic updates, error recovery, and destructive-action confirmation
  are part of the feature—not optional polish.
- **Main source of truth:**
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/page.tsx` and
  its `components/product-details.tsx`, `product-featured-image.tsx`,
  `product-publishing.tsx`, `download-options.tsx`, `product-discussions.tsx`,
  `certificates.tsx`, and `product-deletion.tsx` files. Relevant model fields are
  cross-checked against `packages/orm-models/src/models/course.ts`:
  `description` is a String containing ProseMirror JSON, `privacy` is the public /
  unlisted enum, `leadMagnet`, `certificate`, and `discussions` are booleans, and
  `featuredImage` is an embedded Media value.
- **Porting dispositions:** Product details keep the production hierarchy and behavior
  (Name, Slug, then Description) while using `@frontlit/text-editor`; the source slug is
  a required String and is normalized with `validateSlug` before uniqueness checks;
  the target preserves that behavior with a school-scoped unique text slug and a
  200-character boundary, including the source slug helper copy. Publishing maps `published` to the target product
  status and preserves the public/unlisted visibility setting; download lead magnets
  remain available only for digital downloads with exactly one free payment plan;
  discussions remain course-only and retain the reported-content route; deletion keeps
  the typed `delete` confirmation and school-scoped cascade, while products with
  storefront payment or subscription history are rejected so financial records remain
  retained under PRD Section 11.4; featured media adapts to the MediaLit
  catalog/reference model and supports both reusable-library selection and
  public upload; certificate settings adapt to the target certificate-template and
  media-reference APIs, support public signature/logo uploads, and save those uploads
  immediately. Product descriptions use the same `@frontlit/text-editor` host picker as
  lessons, preserve ProseMirror JSON, and reconcile MediaLit-backed `product_content`
  references transactionally from the saved image URLs. Product and certificate media
  selection now uses the published `@frontlit/media-uploader` package with CourseLit
  adapters for school-scoped MediaLit upload, reuse, and optional Unsplash search. The
  requested payment-plan dialog
  is the only deliberate navigation adaptation in this Manage surface.
  Certificate template text remains optional as in `main`; public certificate rendering
  applies the source defaults for blank title, subtitle, description, designation, and
  creator signature name. This behavior is covered by the blank-template regression in
  `apps/api/src/certificates.test.ts`. Selected signature and logo assets are also
  rehydrated with school-scoped MediaLit reads when they are outside the first library
  page, preserving the existing template's visible selection and removal path.
- **Content-board parity note:** The source board also exposes section move controls,
  scheduled-release indicators, deletion confirmation, and source-preserving deletion
  rules: a section with lessons cannot be deleted, and the sole section of a digital
  download must remain. The rewrite now ports these through
  `apps/admin/components/products/product-workspace.tsx` and
  `apps/api/src/catalog.ts`; `apps/api/src/sections.test.ts` covers the invariant and
  empty-section deletion. Lesson rows preserve the source Text, Video, and Quiz type
  icons, and “Add Section” is rendered for courses only, matching the source board;
  digital downloads retain their automatically-created sole section.
  Browser evidence remains pending.
- **Required evidence:** each section needs a target contract/model mapping, tenant and
  authorization coverage, source-to-target behavior tests, and side-by-side browser
  evidence for normal, loading, validation/error, disabled/conditional, and destructive
  states. M3 cannot close while any production Manage section is only represented by a
  generic CRUD replacement or an unaccounted-for source behavior.
- **Current target evidence:** `apps/admin/components/products/product-featured-image.tsx`,
  `apps/admin/components/products/product-certificates.tsx` (including the source
  `Preview` control as an in-place template preview dialog and the closed-by-default
  collapsible certificate-template editor), `apps/admin/components/ui/codelit/switch.tsx`,
  and `apps/admin/components/products/product-workspace.tsx` (source switch controls, Lead Magnet terminology, and source pricing labels), and the shared
  `apps/admin/components/products/media-upload-button.tsx` and
  `apps/admin/lib/course-media-uploader.ts` cover school-scoped public upload plus
  reusable MediaLit catalog selection. `apps/api/src/products.ts` guards
  deletion when financial history exists, with the behavior asserted in
  `apps/api/src/commerce.test.ts`. Admin typecheck/build pass; browser side-by-side
  evidence and dedicated component regression tests remain pending.

### M3-FPB-003 — Lesson authoring and content types

- **Status:** In progress; the target authoring journey is being ported and Milestone 3
  remains open.
- **Production entry point and hierarchy:** `main` uses
  `/dashboard/product/[id]/content/section/[section]/lesson` for both new and edit
  flows. The screen contains the lesson-type cards, title, type-specific content area,
  Preview and Visibility switches, destructive delete confirmation, Cancel/Save or
  Update actions, and a post-save Media/SCORM area for media-backed lessons. Editing
  does not permit changing the lesson type. New media-backed lessons redirect back to
  their edit screen so an asset can be selected after the lesson receives an ID.
- **Main source and regression evidence:**
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/content/section/[section]/lesson/page.tsx`,
  `.../lesson/lesson-content-renderer.tsx`,
  `.../lesson/scorm-lesson-upload.tsx`,
  `apps/web/components/admin/products/quiz-builder/index.tsx`,
  `.../quiz-builder/question-builder.tsx`, and their page/renderer/quiz-builder tests.
- **Source behavior and data contract:** lesson types are text, video, audio, PDF, file,
  embed, quiz, and SCORM. Text content is a ProseMirror document; embed content is
  `{ value }`; quiz content stores questions/options plus graded-quiz settings; binary
  and SCORM assets are media-backed. The source Lesson model also exposes
  `downloadable` as a Boolean with a default of `false`; the target preserves it on
  lesson persistence and REST reads. Text and embed content are validated, quizzes
  require non-empty questions, at least two options, and one correct answer per
  question, and quizzes cannot be previewed. Media selection is school-scoped and
  reusable; SCORM packages are private and subject to the production 300MB limit.
  The source section editor also offers drip-release email notification settings
  (enable/disable, subject, and an EmailViewer/template-editing link). These are
  CourseLit delivery behavior, not merely presentation details.
- **Target implementation/evidence:**
  `apps/admin/components/products/lesson-authoring.tsx`,
  `apps/admin/components/products/rich-text-editor.tsx`,
  `apps/admin/components/products/quiz-editor.tsx`,
  `apps/admin/components/products/media-picker.tsx`,
  `apps/admin/components/products/media-upload-button.tsx`,
  `apps/admin/components/products/scorm-lesson-upload.tsx`, and the lesson/section
  contracts and catalog service; the schema is created by
  `apps/api/drizzle/0000_baseline.sql`.
  The target adapts the editor to
  `@frontlit/text-editor` and `@frontlit/media-uploader` for binary handling to MediaLit;
  the rich-text picker preserves `main`'s MediaLit-backed image uploads while also
  supporting the package's library and optional Unsplash sources instead of the
  editor's data-URL fallback, and the API derives/reconciles `lesson_content` references from saved
  ProseMirror image URLs in the same lesson transaction. The media picker preserves
  inline upload, private-by-default lesson media, reuse, and removal behavior. The admin
  typecheck passes, and the target uses the shared CodeLit switch primitive for the
  source Preview and Visibility controls. The section editor also ports `main`'s contextual Drip content
  resource through `apps/admin/components/resources.tsx`, using the current docs
  route without the retired `/en` prefix;
  browser side-by-side evidence and dedicated target UI regression tests remain
  pending. Section drip scheduling is ported now; drip-release email configuration
  and delivery are explicitly deferred to Milestone 7's SendLit replacement
  integration because that integration owns the target email workflow. The target
  section screen names this deferral and does not persist a misleading partial email
  configuration. SCORM package runtime extraction, learner launch, and progress state are
  now ported in the Milestone 4 learner vertical: the API derives and stores manifest
  metadata, serves private package files through the learner app, exposes SCORM 1.2/2004
  browser APIs, and persists membership-scoped runtime state. Quiz evaluation is also
  server-side, persists every attempt with production-compatible scoring, and redacts
  correct answers from learner product responses. The learner app now also has a
  dedicated `/courses/[productId]/[lessonId]` viewer with course-back and previous/next
  navigation, shared rich-text/media/quiz/SCORM renderers, progress actions, and
  discussion placement. Completion guards require a passed quiz or production-compatible
  SCORM completion state. The learner My Content API/card now carries published-lesson
  progress, featured artwork, and certificate linkage. The certificate verification
  route renders product template fields and accepts both verification IDs and stable
  certificate IDs, matching the source certificate navigation. The learner course
  viewer now ports `main`'s course-specific navigation through
  `apps/learners/components/layout/course-viewer-sidebar.tsx`: About and Discussions,
  ordered section/lesson hierarchy, drip availability labels, lock/completion state,
  and a My content exit path. The course overview keeps the source's description,
  featured-artwork, and single Start/Continue entry flow instead of rendering every
  lesson inline; the target product-detail contract exposes the learner's enrolled
  state for that decision. `apps/api/src/migrations/products.ts` and
  `apps/api/scripts/import-products.mjs` now provide a source-typed, dry-run/apply
  Course/Lesson importer. It preserves ProseMirror lesson documents, source
  section/lesson ordering, section drip schedule precision, and rejects missing
  lessons, unsupported types, and MediaLit-backed records into the migration
  reconciliation ledger. Browser side-by-side evidence, production-shaped migration
  fixtures, and full public/admin read reconciliation remain pending.
- **Disposition:** port existing authoring behavior; adapt only the API transport,
  MediaLit reference lifecycle, admin/learner split, and the requested target UI
  component conventions. Preserve validation, read-only editing of lesson type,
  preview restrictions, media reuse, private SCORM storage, and redirect hierarchy.
  The target media picker also rehydrates the currently attached asset through the
  school-scoped single-media read when it falls outside the first catalog page, so
  existing media remains visible and removable without weakening tenant isolation.

### M3-FPB-004 — Product dashboard overview and analytics

- **Status:** In progress; implementation is being ported and Milestone 3 remains open.
- **Production entry point and hierarchy:** `main` renders the product dashboard at
  `/dashboard/product/[id]`. It shows the product type/publication badges, last-updated
  state, time-range selector (`1 week`, `30 days`, `90 days`, `1 year`), metric cards for
  sales and customers, course completions or digital-download activity, and a sales
  chart. The dashboard also provides product actions and an empty-content warning.
- **Main source of truth:**
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/page.tsx`,
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/overview/sales-card.tsx`,
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/metric-card.tsx`,
  `apps/web/hooks/use-activities.ts`, and the corresponding `getActivities` server
  query. The source sales metric sums purchase activity cost, while customer,
  completion, and download cards count activity events and compare the selected period
  with the preceding period.
- **Porting disposition:** preserve the dashboard metrics and date-series behavior in a
  school-scoped admin read model. The target returns sales in minor units and derives
  display currency from `schools.currency`; it does not introduce a product-level
  currency. Product actions that already have target routes are retained: Preview and
  Manage/publishing remain links, while Invite a customer is an in-place dialog backed
  by the existing admin membership-grant contract. The source share control is adapted
  to copy the learner app's `/courses/:productId` URL using
  `NEXT_PUBLIC_LEARNER_ORIGIN`; FrontLit-owned View page/Edit page actions remain
  explicitly deferred to the FrontLit milestone rather than being represented by
  misleading links. The dashboard must not be replaced with generic
  content/learner/description cards.
- **Target implementation/evidence:** `apps/api/src/product-analytics.ts`,
  `apps/api/src/product-analytics.test.ts`, `apps/admin/components/products/product-analytics.tsx`,
  `apps/admin/components/products/product-workspace.tsx`, and the
  `getProductAnalytics` contract/Express adapter. The API test covers complete
  date series, supported ranges, invalid-range validation, school isolation, and the
  school-currency projection; `ui-surface.test.ts` protects the dashboard surface.
  The target chart preserves the source grid, date labels, and currency-scaled
  Y-axis while using the target’s dependency-free SVG implementation.
  The product action grant is covered by `apps/api/src/learner-admin.test.ts` and the
  admin surface assertion. The source dashboard's contextual Resources links are
  ported through `apps/admin/components/resources.tsx` with the current docs URLs
  (without the retired `/en` prefix). The target dashboard also preserves the source
  empty-content warning and `Edit content` action when a product has no lessons or
  files. Browser side-by-side evidence and populated metric fixtures remain pending.
- **Disposition:** port the production dashboard read model and visual hierarchy;
  retain the requested dialog adaptation only for payment-plan create/edit.

### M3-FPB-005 — Product catalog list

- **Status:** In progress; the target list read model and current-page UI are now
  ported, with browser side-by-side evidence still pending.
- **Production entry point and hierarchy:** `main` renders the admin catalog at
  `/dashboard/products`. Products are grouped under the Products area rather than
  separate Course and Digital Download navigation. The screen has a New product
  action, an All/Course/Digital Download filter, a nine-card page, loading skeletons,
  an empty state, and pagination controls. Each card links to the product dashboard.
- **Main source of truth:**
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/products/page.tsx`,
  `apps/web/graphql/courses/logic.ts` (`getPaginatedCoursesForAdmin` caller),
  `apps/web/graphql/courses/helpers.ts`, and
  `packages/orm-models/src/models/course.ts`.
- **Source data and behavior:** cards use the featured image with
  `/courselit_backdrop_square.webp` fallback, the product title, a Course or
  Digital download badge, separate Public/Hidden and Published/Draft indicators,
  a school-currency-prefixed sales count, and a customer count. The source model
  stores `sales` as a Number and `customers` as a string array; the admin query
  calculates those values from purchase activity and memberships. The list is
  sorted by most recently updated and filtered before pagination. The empty state
  uses the source `No Products Found` title, BookOpen icon, and private-dashboard
  copy.
- **Target disposition:** adapt the list to the target cursor-pagination convention
  while preserving the nine-item page size, filter semantics, card hierarchy,
  terminology, privacy/publication distinction, and school-level currency display.
  `sales` is a count of succeeded storefront payments and `customers` is a count of
  school-scoped learner memberships; currency is a school response projection, never a
  product or payment-plan input. The target reuses the source
  `/courselit_backdrop_square.webp` asset when the MediaLit catalog has no featured
  image.
- **Target implementation/evidence:** `apps/admin/app/products/page.tsx`,
  `apps/admin/components/products/product-types.ts`, `apps/api/src/products.ts`,
  `apps/api/src/dispatch.ts`, `packages/api-contract/src/index.ts`, and
  `apps/api/src/products.test.ts`. The API test covers metrics, kind filtering,
  cursor pagination, and invalid limits; `apps/admin/components/resources.tsx` ports
  the source catalog's course and digital-download documentation links using the
  current no-`/en` docs routes; admin typecheck/build pass. Browser side-by-side
  evidence and the target featured-image fixture remain pending.
- **Disposition:** port existing catalog behavior and adapt only pagination and
  MediaLit fallback details to the target architecture. This brief is part of the
  Milestone 3 gate; it must be closed before Milestone 3 is reported complete.

### M4-FPB-001 — School-local learner email authentication

- **Status:** In progress; learner email OTP is provided only by the separate
  Better Auth learner realm. The rewrite does not expose or call the former custom
  learner OTP endpoints.
- **Production source and behavior:** `main` uses Better Auth email OTP in the
  public payment/login flow (`apps/web/components/public/payments/login-form.tsx`).
  The rewrite keeps learner principals and cookies separate from admin users.
- **Target implementation/evidence:** `apps/api/src/auth/options.ts` configures
  the learner realm with Better Auth email OTP, while
  `apps/learners/components/public-login-block.tsx` and
  `apps/learners/components/checkout-login-form.tsx` use that realm directly.
  `apps/api/src/learner-auth.test.ts` covers the separate learner realm and asserts
  that the legacy OTP routes are absent. The Better Auth session is bridged into
  the school-scoped learner session used by learner APIs; admin-to-learner linking
  continues to use the separate `learner_admin_links` relationship and its
  digest-only handoff token.

### M4-FPB-002 — Digital-download link and archive delivery

- **Status:** In progress; the authenticated download journey is ported and migration
  and browser evidence remain pending.
- **Production source and behavior:** `main` creates a `DownloadLink` for a school,
  course, and learner with a 128-character hex token and roughly two-day expiry.
  `apps/web/app/api/download/[token]/route.ts` resolves the published product,
  gathers published lesson media, writes the files under `files/` in a ZIP archive,
  marks the learner purchase as downloaded, records `DOWNLOADED`, and consumes the
  link after delivery. Lead-magnet email creation remains a SendLit milestone.
- **Target implementation/evidence:** `apps/api/src/downloads.ts` and
  `apps/api/drizzle/0000_baseline.sql` create school- and
  membership-scoped links, store only a SHA-256 token digest, resolve private files
  through the server-only MediaLit client, and expose a binary attachment route at
  `/v1/learner/downloads/:token`. Link creation is contract-first at
  `POST /v1/learner/products/:productId/download`; the learner product page exposes
  the download action for digital downloads. `apps/api/src/downloads.test.ts` covers
  access denial, archive contents, MediaLit resolution, expiry, replay prevention,
  audit state, and analytics.
- **Disposition:** preserve the production download semantics while using a bounded
  in-memory archive and safer digest-only, consumed-link storage in PostgreSQL. The
  raw link is returned only when it is created; future SendLit lead-magnet delivery
  must use the same creation service without moving marketing delivery into CourseLit.

### M4-FPB-003 — Learner My content product surface

- **Status:** In progress; the product-card journey is ported and browser evidence
  remains pending.
- **Production source and behavior:** `main` exposes learner content under the
  `My content` hierarchy, with a Products view that renders enrolled courses and
  digital downloads in a three-column responsive grid. Cards show the featured image,
  title, product-type badge with the corresponding BookOpen/Download icon, course
  progress, and a certificate indicator. Loading renders six card skeletons and an
  empty state offers product browsing.
- **Main source of truth:**
  `apps/web/app/(with-contexts)/dashboard/(sidebar)/my-content/layout.tsx`,
  `.../my-content/my-content-tabs.tsx`, `.../my-content/products/page.tsx`,
  `.../my-content/my-content-view.tsx`,
  `apps/web/components/admin/my-content/content-card.tsx`, and
  `apps/web/components/admin/my-content/skeleton-card.tsx` in the `main` worktree.
- **Target implementation/evidence:** the split learner app now redirects `/dashboard`
  to `/dashboard/feed` and mounts a shared authenticated learner workspace with
  `/dashboard/feed` and `/dashboard/products` tabs. `apps/learners/components/dashboard/learner-products.tsx`
  ports the source card hierarchy, featured-artwork fallback, Course/Digital download
  icon badges, certificate badge, progress bar, responsive three-column layout, and
  six-card loading state. Product cards link to `/courses/:productId`; product data
  includes published-lesson progress, featured artwork, certificate linkage, and
  download state.
- **Community Feed disposition:** the source Feed tab is now ported as the authenticated
  learner route `/dashboard/feed`. The new `/v1/learner/feed` contract aggregates
  non-deleted posts across the learner's active school memberships with cursor
  pagination, community metadata, author/media/reaction/comment-count projections,
  and membership isolation. The learner surface includes loading, empty, error,
  community-list, post-media, reaction, comment deep-link, and load-more states.
- **Required evidence:** browser comparison of loading, empty, course, digital-download,
  artwork, certificate, and progress states; learner tenant/access tests; and
  migration reconciliation for legacy `User.purchases`.
- **Disposition:** port existing learner card/feed behavior, adapting only the route and
  split-app shell. Keep the Feed as an explicit Milestone 6 item.

### M4-FPB-004 — Learner lesson content renderer

- **Status:** In progress; the supported lesson renderers are ported and browser
  evidence remains pending.
- **Production source and behavior:** `main` renders text lessons from
  ProseMirror documents, media lessons through the lesson media URL, YouTube and
  arbitrary embed lessons through the existing embed viewer, quizzes through the
  quiz viewer, and SCORM lessons through the SCORM runtime. The viewer exposes
  completion and previous/next navigation only in an enrolled learner or preview
  context.
- **Main source of truth:**
  `apps/web/components/public/lesson-viewer/index.tsx` and
  `apps/web/components/public/lesson-viewer/embed-viewer.tsx` in the `main`
  worktree.
- **Target implementation/evidence:** `apps/learners/components/lesson-viewer.tsx`
  uses `@frontlit/text-editor` for ProseMirror rendering and delegates embed
  lessons to `apps/learners/components/embed-viewer.tsx`. YouTube URLs render in
  the responsive player used by the production viewer; other embed code is
  isolated in a dynamically sized sandboxed iframe. Course and digital-download
  lesson routes pass the persisted lesson type into the renderer, so an embed is
  not reported as an unavailable lesson. `apps/api/src/ui-surface.test.ts`
  asserts the learner surface retains both renderer paths.
- **Disposition:** preserve the production content-type behavior and the target
  split-app routes. Preview continues to bypass learner writes, while normal
  completion remains protected by the existing API membership, drip, quiz, and
  SCORM guards. Add side-by-side browser evidence for each lesson type before
  closing this brief.

### Storefront commerce and Cloud billing

| ID       | Current behavior                                                                                                                   | Target owner                        | Disposition and migration rule                                                                         | Status           | Required evidence                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------- |
| PAY-001  | School storefront payment plans support free, one-time, subscription, installment, default, archive, and included-product behavior | CourseLit API                       | Preserve plan semantics; paid checkout uses the selected school provider                                      | Evidence pending | `storefront.test.ts` covers plan lifecycle; `commerce.test.ts` covers public plan discovery, free access, provider checkout entitlement grants, duplicate, refund, and mismatch behavior; included-product flows remain pending |
| PAY-002  | Storefront checkout supports Stripe, Lemon Squeezy, and Razorpay                                                                         | CourseLit API + school settings                | Keep one polymorphic provider contract; encrypt school credentials and verify provider webhooks   | In progress | `apps/api/src/payments.ts` contains the three adapters; provider adapter tests and sandbox rehearsal remain pending |
| PAY-003  | Invoices and purchases drive membership/access                                                                                     | CourseLit API                       | Import financial records separately from entitlement derivation and reconcile both                     | Evidence pending | Checkout/payment/invoice records are transactionally tied to verified entitlements; `commerce.test.ts` covers exactly one payment, invoice, and grant plus refund revocation; historical import/reconciliation remains pending |
| PAY-004  | Active recurring learner payments cannot be transferred between school providers | Product + migration | Require explicit learner re-consent before a provider change | Contract pending | Provider usage report and approved conversion acceptance tests |
| BILL-001 | `courselit-subscriptions` stores Cloud subscription customer, subscription, variant, end date, method, and status                  | Platform billing composition        | Import as legacy Cloud billing history; explicitly map active access state                             | Contract pending | Subscriber/domain join report and billing-state reconciliation              |
| BILL-002 | Cloud checkout/switch/cancel/resume uses Lemon Squeezy; records may identify historical Stripe or Lemon                            | Platform billing composition        | Do not relabel providers; new billing follows Platform billing policy                                  | Contract pending | Webhook/history fixtures and portal lifecycle tests                         |
| BILL-003 | Expired Cloud trial/subscription behavior is enforced outside the product app                                                      | Platform billing + CourseLit policy | Enforce school-wide read-only behavior on every transport and worker                                   | Contract pending | Admin/learner/REST/MCP/worker/webhook read-only matrix                      |
| BILL-004 | KYC and Enterprise feature/variant state live in the subscription app                                                              | CourseLit API / billing             | Preserve decision-relevant history and explicitly map or retire each flag                              | Contract pending | Migration exception report and operator review                              |

### Communities, discussions, and notifications

| ID      | Current behavior                                                                                    | Target owner         | Disposition and migration rule                                                                             | Status           | Required evidence                                                     |
| ------- | --------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------- |
| COM-001 | Communities have categories, public visibility, memberships, member roles, and statuses             | CourseLit API        | Normalize while preserving access and moderation semantics; admin management and learner participation are separate application surfaces | In progress | `apps/api/src/communities.test.ts` covers enabled/disabled access, pending approval, active membership, role changes, tenant isolation, featured-image MediaLit references, category add/duplicate/delete behavior, post migration before category deletion, cursor traversal of admin membership pages, status-filtered member listing, last-moderator leave/demotion protection, membership-change audit events, self-mutation protection, inactive-role protection, required membership rejection reasons, required joining reasons for manually approved free and paid access, and learner leave with active-subscription cancellation and entitlement cleanup; membership, post, comment, and report responses now include resolved learner/admin display actors; admin membership management now consumes the cursor with incremental loading and server-side status filtering and community settings support production-style category add/remove flows; admin settings can select, replace, and remove a public MediaLit featured image, and admin/learner cards and detail views render its thumbnail when available; admin create/manage forms now persist `main`-compatible TipTap community descriptions and optional learner-facing announcement banners through the shared MediaLit-backed rich-text editor, with banner image references reconciled on save and cleaned up on community deletion; learner cards and detail views render both rich-text and legacy plain-text descriptions, active community views render the announcement banner, manually approved joins collect the configured joining reason in an in-app dialog, and community responses expose school-scoped total post counts for accurate overview/discussion summaries; admin UI is management-only and learner discovery/joining/leaving is in `apps/learners`; publishing is blocked until an active default community plan exists; `apps/api/src/migrations/learners.ts` now imports school-scoped learner identities without copying sessions, and `apps/api/src/migrations/communities.ts` resolves those mappings for membership authors; production-shaped reconciliation and browser evidence remain pending |
| COM-002 | Community posts have media, comments, reactions, pins, subscriptions, and reports                   | CourseLit API        | Migrate all records with stable legacy mappings and deletion semantics; keep authoring/member interactions in learners and moderation in admin | In progress | `apps/api/src/communities.test.ts` covers posts, category filtering and invalid-category rejection on create/update, comments, replies, reaction summaries/toggles, comment counts, cursor pagination, reports, moderation deletion, report status filtering, required report rejection reasons, post/member/reaction notifications, public-ID boundaries, learner-owned MediaLit upload/list/finalize, attachment type restrictions, and reference cleanup; active learner moderators can now delete other members’ posts/comments with the same server-side permission check as the legacy community surface; deleted comments remain in thread context as an anonymized `Deleted` placeholder, cannot receive new replies or learner actions, and moderation reports no longer rehydrate deleted bodies or attachments; comment/reply creation and reactions now deep-link learner notifications to the exact comment/reply DOM target; learner community UI attaches and renders image/video/PDF media through the published `@frontlit/media-uploader`, displays post/comment reaction counts and active state, hides self-report actions, uses an in-app reason dialog for post/comment/reply reports, uses confirmation dialogs for leaving and deleting learner content, supports category filtering with URL persistence, stable `/community/:communityId/:postId` notification/share links, rich-text post/comment/reply authoring and rendering with legacy plain-text fallback, embedded-image media references, comment/reply reactions, and loads subsequent post/comment pages; the learner post read rehydrates a linked post outside the first feed page; new posts automatically subscribe their author for later activity notifications; admin activity uses the same cursor-backed post feed with pin/unpin controls, and admin moderation reports show read-only attachment/content previews with an in-app rejection-reason dialog; `apps/api/src/migrations/learners.ts` plus `apps/api/src/migrations/communities.ts` now cover legacy learner author mapping, flat replies, reactions, subscriptions, reports, and mapped MediaLit references, while unresolved attachments are rejected; production-shaped reconciliation and browser evidence remain pending |
The community response now includes an authoritative school-scoped `postsCount` that excludes deleted content; the admin overview and learner discussion summary use that count instead of the currently loaded page length. The learner post route focuses the requested discussion while retaining the shared authoring, comments, reactions, and moderation interactions.
| COM-003 | Product and lesson discussions have comments, replies, likes, subscriptions, summaries, and reports | CourseLit API        | Migrate as course discussions; preserve report state and anonymization behavior                            | In progress | `apps/api/src/product-discussions.test.ts` covers enrolled access, disabled discussions, flat reply context, likes, subscriptions, comment/reply/reaction notifications, duplicate-content/rate-limit behavior, moderation hide/restore, outsider denial, public-ID boundaries, and cursor traversal for lesson comments, replies, summaries, and reports; the learner discussion index and report-management UI are implemented; learner comment/reply create, edit, and display now use the published FrontLit TipTap document editor/renderer with ref-backed drafts and reset behavior matching `main`, discussion report submission and learner-owned comment/reply deletion use in-app dialogs instead of browser prompts, admin report rejection uses an in-app review-note dialog, and discussion notifications deep-link to comment/reply anchors; preview discussions now use token-scoped read-only comment, reply, and summary routes and preserve preview navigation; `apps/api/src/migrations/product-discussions.ts` migrates comments, replies, likes, summaries, subscriptions, and reports with stable mappings, parent-first reply ordering, school-scoped identity resolution, deleted-content anonymization, invalid-record rejection, dry-run/apply modes, idempotency, and synthesized summaries; `apps/api/src/migrations/product-discussions.test.ts` covers apply/dry-run/idempotency, deleted records, out-of-order replies, rejected identities/content, and no invented summaries; operator entrypoint is `apps/api/scripts/import-product-discussions.mjs` and usage is documented in `apps/api/README.md`; production-shaped reconciliation and browser evidence remain pending |
| COM-004 | Replies can arrive through signed inbound email providers                                           | CourseLit API/worker | Retain only if still required after SendLit integration; isolate provider verification from marketing mail | Contract pending | Product decision plus Postmark/Mailgun/SES signature and replay tests |
| COM-005 | Community payment plans control free and paid membership access                         | CourseLit API + admin app | Reuse the product plan dialog/list with a community-specific table and API; project school currency and keep plan authoring out of the learner app | In progress | `apps/api/src/communities.test.ts` covers create, list, edit, default, archive, school-currency projection, default-plan protection, learner plan discovery, free access, provider checkout, verified payment activation, recurring subscription lifecycle, payment-failure access revocation, refund access revocation, and the rule that communities cannot be published before an active default plan exists; the community importer preserves free/paid plan shape, default/archive state, included product mappings, and membership plan references; production-provider rehearsal remains pending |
| NOT-001 | In-app notifications, preferences, read state, and email dispatch exist                             | CourseLit API/worker | Keep learning/community notifications; migrate unread plus 12 months, archive older                        | In progress | Learner notification list/read/read-all API and UI are present; the learner page now consumes the cursor and incrementally loads subsequent notification pages; per-activity in-app preferences are persisted and enforced; community post, comment/reply, reaction, and membership-approval activity notifies the relevant learners while course-discussion comment/reply activity notifies relevant authors and subscribers; `apps/api/src/migrations/notifications.ts` now preserves recent/unread legacy notifications, read state, supported links and preferences while counting older read records as archived, and community links target the stable `/community/:communityId/:postId` learner route; email dispatch and delivery idempotency remain pending |
| NOT-002 | SSE exposes queue/notification state                                                                | CourseLit API        | Replace with the target realtime/polling contract only where a current user journey requires it            | Contract pending | Journey inventory and reconnect/access tests                          |

### Delegated capabilities and media

Integration topology decision: CourseLit owns each school's SendLit team and
will provision it through its own supported SendLit boundary. FrontLit may use
its own SendLit integration for FrontLit-owned features, but CourseLit must not
depend on FrontLit's SendLit team, retry outbox, or templates. The CourseLit
SendLit provisioning and synchronization rows remain deferred to Milestone 7;
the current school-bootstrap implementation covers FrontLit site provisioning
only.

| ID      | Current behavior                                                                                                                    | Target owner                                | Disposition and migration rule                                                                            | Status           | Required evidence                                                   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| FL-001  | Pages, menus, themes, typefaces, widgets, and school site settings are CourseLit-owned                                              | FrontLit                                    | Provision one team per school and import supported site content; public learner routes compose the published layout/theme and inject CourseLit-owned content through named page-builder data slots | Evidence pending | Per-school import report, rendered-page comparison, themed learner `/products` route, and authenticated dashboard theme evidence |
| FL-002  | Legacy page blocks may not exist in FrontLit alpha                                                                                  | FrontLit + CourseLit renderer               | Preserve original payload and render a safe `Unsupported` placeholder in builder and learner site         | Contract pending | Unsupported-block fixtures in both surfaces                         |
| FL-003  | Page/blog authoring is embedded in the admin app                                                                                    | FrontLit components or deliberate deep link | Use an exact-pinned supported alpha package; do not fork hidden behavior into CourseLit                   | Contract pending | `@frontlit/page-builder` and `@frontlit/text-editor` are mounted in viewport-sized editor shells with internal pane scrolling; package contract and browser evidence remain pending |
| SL-001  | Users/subscribers, tags, segments, broadcasts, sequences, templates, delivery events, tracking, and unsubscribe are CourseLit-owned | SendLit                                     | Provision one team per school; CourseLit learners remain canonical while marketing state moves to SendLit | Contract pending | Identity/consent/suppression reconciliation and degraded-mode tests |
| SL-002  | Queue executes CourseLit email sequences and scheduled broadcasts                                                                   | SendLit                                     | Retire legacy marketing workers after active automation state is imported or explicitly archived          | Contract pending | Automation cutover, duplicate-send prevention, and archive report   |
| SL-003  | Course/product delivery by email exists                                                                                             | SendLit + CourseLit                         | Reframe as a supported transactional or marketing workflow without changing access ownership              | Contract pending | End-to-end delivery and authorization tests                         |
| MED-001 | Media upload/proxy metadata is CourseLit-owned and binaries are stored through MediaLit                                             | CourseLit catalog + MediaLit                | Build a school-scoped media library; import each asset once and normalize references                      | Evidence pending | Resumable TUS upload to `/media/create/resumable` using a short-lived signature, `Media` response-header parsing, seal adapter, metadata/search/reuse, reference reconciliation, and tenant tests; legacy import still pending |
| MED-002 | Deletion can remove media used by content/community records                                                                         | CourseLit API                               | Reject in-use deletion, reconcile references, and clean unused/temporary uploads safely                   | Evidence pending | In-use conflict, unused-delete, lesson-media reference save, and MediaLit HTTP deletion tests; retryable cleanup and legacy import still pending |
| MED-003 | Private downloads and SCORM content use signed/proxied delivery                                                                     | CourseLit API + MediaLit                    | Preserve access checks and time-bounded private delivery                                                  | In progress     | `getLearnerLessonMedia` applies publication/membership/drip checks; private assets are resolved through the server-only MediaLit client; SCORM package extraction and learner runtime delivery are covered by focused tests; `downloads.test.ts` covers school/membership scoping, two-day one-use links, digest-only persistence, private MediaLit resolution, archive delivery, expiry/replay rejection, and download analytics; migration/browser evidence remains pending |

### API, operations, and cross-cutting behavior

| ID      | Current behavior                                                                   | Target owner                           | Disposition and migration rule                                                                                                  | Status           | Required evidence                                               |
| ------- | ---------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------- |
| API-001 | Internal product behavior is primarily GraphQL                                     | CourseLit API                          | Replace with `ts-rest` contracts; no GraphQL compatibility requirement unless the parity ledger identifies an external consumer | Inventoried      | Consumer audit and contract tests                               |
| API-002 | Public product/learner management REST API is documented and API-key authenticated | CourseLit API                          | Preserve supported behavior through versioned REST contracts                                                                    | Contract pending | Existing public API spec fixtures and OpenAPI/runtime parity    |
| API-003 | No complete MCP product surface exists                                             | CourseLit API + Platform MCP kit       | Add approved REST/MCP parity and explicit omission registry                                                                     | Contract pending | MCP conformance, DCR/auth, parity and omission tests            |
| OPS-001 | Legacy app and queue expose different process lifecycles                           | CourseLit API                          | One workspace with independently runnable API and worker entrypoints                                                            | Contract pending | Readiness, graceful shutdown, failure-isolation tests           |
| OPS-002 | Operational logging and PostHog instrumentation are ad hoc                         | Platform observability                 | Adopt structured logs, traces/metrics, redaction, audit, and 30-day legacy-log retention                                        | Contract pending | Origin canary, redaction and retention evidence                 |
| OPS-003 | New and legacy schools must coexist during rollout                                 | Caddy + migration coordinator          | Route every known hostname to exactly one generation; default unknown hosts fail closed                                         | Contract pending | Full routing-map reconciliation and continuous synthetic checks |
| OPS-004 | School migration is not currently a product workflow                               | CourseLit admin/API + operator tooling | Owner opt-in, maintenance fence, import, reconcile, promote, forward-recover                                                    | Contract pending | State-machine tests and two production-shaped rehearsals        |

## GraphQL operation inventory

GraphQL is an implementation detail of the legacy system, but every operation below must map to a target capability, an integration, or an explicit retirement decision.

| Domain              | Queries                                                                                                                                                                                                                                                                      | Mutations                                                                                                                                                                                                                                                                                                                                                                                                                        | Target                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Activities          | `getActivities`                                                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                                                                                                                                                                                                                | CourseLit analytics/activity                                       |
| Courses             | `getCourse`, `getCoursesAsAdmin`, `getProducts`, `getProductsCount`, `getReports`, `getProductMembers`, `getCourseCertificateTemplate`                                                                                                                                       | `createCourse`, `updateCourse`, `deleteCourse`, `addGroup`, `removeGroup`, `updateGroup`, `moveLesson`, `reorderGroups`, `updateCourseCertificateTemplate`                                                                                                                                                                                                                                                                       | CourseLit products                                                 |
| Lessons             | `getLesson`, `getLessonDetails`                                                                                                                                                                                                                                              | `createLesson`, `deleteLesson`, `updateLesson`, `markLessonCompleted`, `evaluateLesson`                                                                                                                                                                                                                                                                                                                                          | CourseLit learning                                                 |
| Communities         | `getCommunity`, `getCommunities`, `getMembers`, `getCommunitiesCount`, `getMembersCount`, `getCommunityMembership`, `getPost`, `getPosts`, `getFeed`, `getFeedCount`, `getPostsCount`, `getComments`, `getCommunityReports`, `getCommunityReportsCount`                      | `createCommunity`, `updateCommunity`, `addCategory`, `deleteCategory`, `joinCommunity`, `createCommunityPost`, `updateCommunityPost`, `deleteCommunityPost`, `updateMemberStatus`, `updateMemberRole`, `togglePinned`, `postComment`, `deleteComment`, `leaveCommunity`, `deleteCommunity`, `reportCommunityContent`, `updateCommunityReportStatus`, `togglePostReaction`, `toggleCommentReaction`, `toggleCommentReplyReaction` | CourseLit communities                                              |
| Product discussions | `getProductDiscussionComments`, `getProductDiscussionReplies`, `getProductDiscussionReports`, `getProductDiscussionSummaries`, `getProductDiscussionReportsCount`                                                                                                            | `createProductDiscussionComment`, `createProductDiscussionReply`, `toggleProductDiscussionLike`, `createProductDiscussionReport`, `deleteProductDiscussionComment`, `deleteProductDiscussionReply`, `updateProductDiscussionComment`, `updateProductDiscussionReply`, `updateProductDiscussionReportStatus`                                                                                                                      | CourseLit discussions                                              |
| Payment plans       | `getPaymentPlan`, `getPaymentPlans`, `getIncludedProducts`                                                                                                                                                                                                                   | `createPlan`, `updatePlan`, `archivePlan`, `changeDefaultPlan`                                                                                                                                                                                                                                                                                                                                                                   | CourseLit storefront commerce                                      |
| Users               | `getUser`, `getUsers`, `getUsersCount`, `inviteCustomer`, `segments`, `tags`, `tagsWithDetails`, `getUserContent`, `getMembershipStatus`, `getCertificate`                                                                                                                   | `updateUser`, `createSegment`, `deleteSegment`, `addTags`, `deleteTag`, `untagUsers`, `deleteUser`                                                                                                                                                                                                                                                                                                                               | Split between CourseLit learners/access and SendLit marketing; `/learners/tags` and standalone tag aggregation/mutations (`tags`, `tagsWithDetails`, `addTags`, `deleteTag`, `untagUsers`) are retired since SendLit contact management enables direct tagging on contacts and learners are SendLit contacts |
| Mails               | `getBroadcasts`, `getSequence`, `getSequences`, `getSequenceCount`, `getMailRequest`, `getEmailSentCount`, `getSequenceOpenRate`, `getSequenceClickThroughRate`, `getSubscribers`, `getSubscribersCount`, `getEmailTemplate`, `getEmailTemplates`, `getSystemEmailTemplates` | `createSubscription`, `createSequence`, `addMailToSequence`, `deleteMailFromSequence`, `updateEmail`, `updateSequence`, `updateMailInSequence`, `startSequence`, `pauseSequence`, `sendCourseOverMail`, `updateMailRequest`, `createEmailTemplate`, `updateEmailTemplate`, `deleteEmailTemplate`                                                                                                                                 | SendLit                                                            |
| Pages               | `getPage`, `getPages`                                                                                                                                                                                                                                                        | `updatePage`, `publish`, `createPage`, `deletePage`, `deleteBlock`                                                                                                                                                                                                                                                                                                                                                               | FrontLit                                                           |
| Menus               | —                                                                                                                                                                                                                                                                            | `saveLink`, `deleteLink`                                                                                                                                                                                                                                                                                                                                                                                                         | FrontLit                                                           |
| Themes              | `getTheme`, `getThemes`                                                                                                                                                                                                                                                      | `updateDraftTheme`, `switchTheme`                                                                                                                                                                                                                                                                                                                                                                                                | FrontLit                                                           |
| Notifications       | `getNotification`, `getNotifications`, `getNotificationPreferences`                                                                                                                                                                                                          | `markAsRead`, `markAllAsRead`, `updateNotificationPreference`                                                                                                                                                                                                                                                                                                                                                                    | CourseLit notifications                                            |
| Settings            | `getSiteInfo`, `getApikeys`, `getSSOProvider`, `getGoogleProviderSettings`, `getSSOProviderSettings`, `getExternalLoginProviders`, `getFeatures`                                                                                                                             | `updateSiteInfo`, `updatePaymentInfo`, `resetPaymentMethod`, `updateDraftTypefaces`, `addApikey`, `removeApikey`, `updateSSOProvider`, `updateGoogleProvider`, `removeSSOProvider`, `removeGoogleProvider`, `toggleLoginProvider`                                                                                                                                                                                                | Split across CourseLit, Platform auth/API keys, FrontLit, and school commerce providers |

## REST and webhook inventory

| Surface                | Methods and paths                                                                                                    | Target disposition                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Auth                   | `GET/POST /api/auth/[...all]`                                                                                        | Split admin and school-local learner realms                                           |
| GraphQL transport      | `POST /api/graph`                                                                                                    | Retire after consumer audit                                                           |
| Product API            | `GET/POST /api/products`; `GET/PATCH/DELETE /api/products/:productId`                                                | Replace with `ts-rest`, preserving supported public contract                          |
| Sections               | list/create/update/delete/reorder under `/api/products/:productId/sections`                                          | Replace with product contracts                                                        |
| Lessons                | list/create/read/update/delete/move under `/api/products/:productId/lessons`                                         | Replace with lesson contracts                                                         |
| Customers              | list, invite, progress, completion, evaluations under product/customer paths                                         | Split into learner, membership, progress, and evaluation contracts                    |
| Payment plans          | list/create/read/update/delete/set-default under product paths                                                       | Replace with storefront-plan contracts                                                |
| Checkout               | `POST /api/payment/initiate`, `POST /api/payment/verify-new`, Razorpay verification, `GET/POST /api/payment/webhook` | Replace with provider-contract checkout and Stripe/Lemon Squeezy/Razorpay webhook inbox                        |
| Media                  | presign, read, and delete under `/api/media`; SCORM upload/content/runtime                                           | Replace with CourseLit catalog plus MediaLit delivery                                 |
| Public user management | `POST/PATCH /api/user`                                                                                               | Replace with versioned admin/learner contracts; preserve required automation behavior |
| Downloads              | `GET /api/download/:token`                                                                                           | Preserve with scoped, expiring grants                                                 |
| Inbound mail           | `POST /api/inbound-email/:provider`                                                                                  | Decision pending under COM-004                                                        |
| Email tracking         | `GET /api/track/open`, `GET /api/track/click`, unsubscribe GET/POST                                                  | Move marketing behavior to SendLit                                                    |
| Auxiliary proxies      | Giphy search/trending, reCAPTCHA verification, Cloudflare request                                                    | Retain only after caller and threat-model review                                      |
| Runtime config         | `GET /api/config`                                                                                                    | Split public learner configuration from secret server configuration                   |

## MongoDB collection inventory

Mongoose pluralizes model names unless a schema overrides the collection. The importer must discover actual collection names from MongoDB and bind them to the logical models below rather than assuming pluralization.

| Group                 | Logical models                                                                                                                                                                    | Disposition                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| School/auth           | `Domain`, `User`, `Account`, `Apikey`, `SSOProvider`, `SiteInfo`                                                                                                                  | Migrate and split into schools, admin auth/membership, learner auth, keys, and settings |
| Products              | `Course`, `Lesson`, `LessonEvaluation`, `Membership`, `PaymentPlan`, `Invoice`, `Certificate`, `CertificateTemplate`, `DownloadLink`                                              | Migrate to normalized CourseLit tables                                                  |
| Communities           | `Community`, `CommunityPost`, `CommunityComment`, `CommunityMedia`, `CommunityReaction`, `CommunityPostSubscriber`, `CommunityReport`                                             | Migrate to CourseLit communities                                                        |
| Product discussions   | `ProductDiscussionComment`, `ProductDiscussionReply`, `ProductDiscussionLike`, `ProductDiscussionSubscriber`, `ProductDiscussionReport`, `ProductDiscussionSummary`               | Migrate to CourseLit discussions                                                        |
| Media/site            | `Media`, `Page`, `Theme`, `Typeface`, `UserTheme`, `Widget`, `Tab`                                                                                                                | Media to CourseLit/MediaLit; site content to FrontLit                                   |
| Activity/notification | `Activity`, `Notification`, `NotificationPreference`, `Log`, `RateLimitEvent`, `ApiRequest`                                                                                       | Migrate/archive according to retention and operational policy                           |
| Marketing mail        | `Sequence`, `OngoingSequence`, `Rule`, `EmailTemplate`, `EmailDelivery`, `EmailEvent`, `EmailReplyToken`, `InboundEmailReceipt`, `Subscriber`, `UserSegment`, `MailRequestStatus` | Move supported state to SendLit; archive or retire legacy-only state                    |

External `courselit-subscriptions` logical models are `Subscriber`, `Domain`, embedded `DomainSettings`, `Kyc`, `VerificationToken`, and `Log`. Login-provider, subscription-status, and severity files define enumerations rather than independent collections.

## Worker and scheduled-work inventory

| ID      | Current queue/loop/route                                                 | Behavior                                                    | Target                                                |
| ------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------- |
| JOB-001 | BullMQ `mail` worker; `POST /job/mail`                                   | Send queued email and update delivery state                 | SendLit; retire worker after cutover                  |
| JOB-002 | BullMQ `sequence` worker                                                 | Advance ongoing email sequences                             | SendLit; import or archive active state, then retire  |
| JOB-003 | `processRules()` one-minute loop                                         | Materialize due scheduled broadcasts into ongoing sequences | SendLit; retire                                       |
| JOB-004 | `processDrip()` one-minute loop and `drip` queue                         | Unlock drip course content and enqueue related mail         | CourseLit worker for unlock/access; SendLit for email |
| JOB-005 | BullMQ `notification` worker; `POST /job/notification`                   | Persist/process per-user notification                       | CourseLit worker                                      |
| JOB-006 | BullMQ `dispatch-notification` worker; `POST /job/dispatch-notification` | Expand activity into recipient notifications                | CourseLit worker                                      |
| JOB-007 | SSE routes                                                               | Stream job/progress events                                  | Replace only for verified user journeys               |

The target worker must use durable job identities, transactional enqueue/outbox semantics, bounded retry, dead-letter visibility, school fencing during migration, and the school read-only policy.

## `courselit-subscriptions` workflow inventory

| ID      | Current workflow/data                                                                                             | Target disposition                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| SUB-001 | OTP/magic-code account authentication                                                                             | Replace with CourseLit admin auth; force reauthentication                           |
| SUB-002 | Subscriber profile, KYC, marketing preference, trial/end date, status, method, customer/subscription IDs, variant | Import billing/account history and explicit active-access mapping                   |
| SUB-003 | List schools owned by account email                                                                               | Replace with school memberships                                                     |
| SUB-004 | Create school and bootstrap/update owner through CourseLit API key                                                | Create school transactionally, then provision FrontLit, SendLit, and MediaLit state |
| SUB-005 | Update/remove custom domain and verification route                                                                | Move to CourseLit API plus Caddy routing workflow                                   |
| SUB-006 | Delete school with retention delay                                                                                | Replace with audited CourseLit deletion state machine                               |
| SUB-007 | Enable learner email login                                                                                        | Move to school-local learner auth configuration                                     |
| SUB-008 | Lemon Squeezy webhook and checkout                                                                                | Preserve provider history; new Cloud billing uses Platform composition              |
| SUB-009 | Cancel, resume, switch plan                                                                                       | Replace with Platform billing portal/service behavior                               |
| SUB-010 | Manual `subscription:alter` maintenance script                                                                    | Replace with audited operator command or admin workflow if still needed             |

## Configuration inventory

The following variable names are referenced by current CourseLit source or deployment files. Values are intentionally not read or recorded here.

| Group                | Current names                                                                                                                             | Target action                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Database/runtime     | `DB_CONNECTION_STRING`, `DB_TRANSACTIONS`, `PORT`, `NODE_ENV`, `DEPLOY_ENV`, `CACHE_DIR`, `MULTITENANT`, `DOMAIN_NAME_FOR_SINGLE_TENANCY` | Replace Mongo settings with PostgreSQL and explicit API/worker configuration                   |
| Auth/security        | `AUTH_SECRET`, `COURSELIT_JWT_SECRET`, `SESSION_COOKIE_CACHE_MAX_AGE`, `SUPER_ADMIN_EMAIL`, CAPTCHA/Turnstile names                       | Split admin and learner auth secrets; validate at startup; never expose server secrets         |
| Queue                | `QUEUE_SERVER`, `REDIS_HOST`, `REDIS_PORT`, `SEQUENCE_BOUNCE_LIMIT`, `SEQUENCE_DELAY_BETWEEN_MAILS`, `NEXT_PUBLIC_RELATIVE_DRIP_UNIT_MS`  | Remove sequence settings; retain only selected durable-job configuration                       |
| Email/inbound        | `EMAIL_FROM`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, inbound provider variables, `PIXEL_SIGNING_SECRET`                  | Move marketing delivery/tracking to SendLit; decide reply-by-email ownership                   |
| Media                | `MEDIALIT_SERVER`, `MEDIALIT_APIKEY`, `SCORM_PACKAGE_SIZE_LIMIT`                                                                          | Retain with startup validation, secret redaction, and per-school catalog semantics             |
| Integrations         | `SUBSCRIPTION_APP_ENDPOINT`, `COURSELIT_SERVER`, `COURSELIT_APIKEY`                                                                       | Retire subscription-app callbacks; add `SENDLIT_*` and `FRONTLIT_*` provisioning configuration |
| Observability/search | PostHog names, Orama names                                                                                                                | Replace/retain only through explicit Platform observability and product search contracts       |
| Public/browser       | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BASE_PATH`, public CAPTCHA/Turnstile keys                                                             | Split by admin and learner app; prohibit accidental secret promotion                           |

The subscription app additionally references Lemon Squeezy product/store/variant/webhook variables, pricing variables, trial/grace/retention periods, maximum schools, and site URLs. They must be captured in the migration runbook before that application is retired.

## Current detailed specifications retained as parity inputs

- [`PUBLIC_API_PRODUCT_AND_LEARNER_MANAGEMENT_PRD.md`](./PUBLIC_API_PRODUCT_AND_LEARNER_MANAGEMENT_PRD.md)
- [`memberships.md`](./memberships.md)
- [`course-previews.md`](./course-previews.md)
- [`course-discussions.md`](./course-discussions.md)
- [`user-deletion.md`](./user-deletion.md)
- Current user-facing documentation in `apps/docs-new/content/docs`

These are evidence inputs, not automatic target architecture. Conflicts are resolved in favor of the Platform rewrite PRD, while externally visible behavior must receive an explicit parity or retirement decision.

## Milestone 0 exit checklist

### Repository evidence

- [x] Workloads and deployment artifacts inventoried.
- [x] GraphQL domains and operations inventoried.
- [x] REST routes and webhooks inventoried.
- [x] Logical Mongo models inventoried.
- [x] Queue workers, loops, and ingress routes inventoried.
- [x] Payment domains and providers separated.
- [x] Environment-variable names inventoried without recording secret values.
- [x] `courselit-subscriptions` models and workflows inventoried.
- [x] Current detailed specifications linked.

### Production/operator evidence

- [ ] Export actual Mongo collection names, document counts, storage sizes, index definitions, and largest-school distributions.
- [ ] Record active legacy storefront provider usage, currency distribution, active subscriptions/installments, disputes, refunds, and webhook rates.
- [ ] Record active CourseLit Cloud billing provider/status/variant distribution from `courselit-subscriptions`.
- [ ] Record current hostnames/custom-domain verification state and detect duplicates before generating a Caddy map.
- [ ] Measure production request volume, p50/p95/p99 latency, error rates, queue depth/age/failure, email backlog, and worker throughput.
- [ ] Enumerate production deployments, regions, databases, buckets, queues, DNS/TLS dependencies, backup policy, and incident ownership.
- [ ] Validate 12-month historical retention defaults against legal, contractual, erasure, and financial requirements.
- [ ] Confirm all GraphQL and auxiliary REST consumers; approve retirement of any externally consumed route.
- [ ] Resolve COM-004 (reply-by-email ownership) and PAY-004 (active legacy recurring payment conversion).
- [ ] Complete threat models for hostname tenancy, admin auth, learner auth, API keys, MCP, checkout/webhooks, integrations, and migration tooling.

Milestone 0 exits only when the unchecked items contain dated evidence and an accountable owner. Foundation implementation can proceed in parallel, but the new-signup cutoff and existing-school promotion cannot.
