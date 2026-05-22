# Public API Product And Customer Management PRD

## Document Control

- Status: Draft
- Last updated: May 8, 2026
- Owner: Web/API team
- Target workspace: `apps/web` (`@courselit/web`)

## Assumptions

1. This document is the implementation spec for the public REST API expansion in `apps/web`, not just a product narrative.
2. The API must only expose workflows that already exist in CourseLit today.
3. The API surface will be authenticated with school-domain API keys.
4. Product/customer API routes must not modify `apps/web/graphql/**`; existing product, lesson, payment-plan, customer, and progress business logic must be consumed as-is.
5. The API contract should be pleasant for alternate frontends even when existing internal GraphQL logic still uses stringified JSON or GraphQL-specific wrappers internally.
6. Existing API endpoints must not be altered; this work should add new public REST routes only.
7. API keys are tenant-level credentials. They are not associated with an individual CourseLit user.
8. For API-key calls that need existing user-backed business logic, the school owner is resolved and used as the integration actor.

## Objective

Build a public REST API in `apps/web` that lets alternate frontends use CourseLit as the system of record for:

- products
- product payment plans
- product structure
- lesson content
- customers
- customer progress reporting
- media upload signatures for media-backed lesson content

Success means an alternate frontend, including an AI-generated course application, can:

1. create a CourseLit product
2. create payment plans required for publishing and checkout
3. create sections and lessons for that product
4. publish and manage the product
5. generate direct-upload signatures for media-backed lesson content
6. enroll customers
7. read customer progress for reporting and integration workflows

This must happen without adding new platform behavior beyond what CourseLit already supports today.

## Tech Stack

- Monorepo: `pnpm` workspace
- App workspace: `apps/web` (`@courselit/web`)
- Framework: Next.js app router
- Language: TypeScript
- Data layer: MongoDB + Mongoose
- Internal business layer: GraphQL logic modules under `apps/web/graphql`
- API documentation: OpenAPI + Swagger UI
- Validation/document contracts: existing app validation patterns plus OpenAPI schemas

## Commands

Development:

- Dev server: `pnpm dev`
- Web-only dev server: `pnpm --filter @courselit/web dev`

Build:

- Full build: `pnpm build`
- Web build: `pnpm --filter @courselit/web build`

OpenAPI:

- Generate web OpenAPI spec: `pnpm --filter @courselit/web openapi:generate`

Testing:

- Full test suite: `pnpm test`
- Coverage: `pnpm test:coverage`

Lint and formatting:

- Lint: `pnpm lint`
- Format: `pnpm prettier`

## Project Structure

- `apps/web/app/api`
  Existing Next.js route handlers. New REST endpoints should be added here.
- `apps/web/app/api/user`
  Current public API reference implementation for API-key auth + route-local OpenAPI fragment patterns.
- `apps/web/app/api/media/presigned`
  Existing MediaLit signature endpoint used before direct resumable uploads.
- `apps/web/app/api/media/openapi.mjs`
  OpenAPI fragment for MediaLit signature generation.
- `apps/web/openapi`
  OpenAPI assembly and generated spec output.
- `apps/web/models/ApiKey.ts`
  App-local API-key model used by public REST auth.
- `packages/orm-models/src/models/apikey.ts`
  Shared API-key schema used by scripts and shared model exports.
- `apps/web/graphql/courses`
  Existing product, section/group, and product-reporting business logic.
- `apps/web/graphql/lessons`
  Existing lesson authoring and lesson detail logic.
- `apps/web/graphql/paymentplans`
  Existing payment-plan validation, creation, update, archive, and default-plan logic.
- `apps/web/graphql/users`
  Existing user/customer, enrollment, membership, and progress-related helpers.
- `apps/web/app/api/payment/helpers.ts`
  Existing membership activation helper.
- `apps/web/config/strings.ts`
  Shared user-facing/backend response strings where applicable.
- `apps/web/models` and `packages/orm-models/src/models`
  Existing persistence models the REST layer must align with.
- `apps/docs/src/pages/en/developers`
  Public developer docs that should be updated after implementation.

## Code Style

The REST layer should stay thin and delegate behavior to existing business logic. Prefer explicit request validation, small helpers, and co-located OpenAPI fragments.

```ts
export async function POST(req: NextRequest) {
    const auth = await validateDomainAndApiKey(req);
    if (auth.error) {
        return NextResponse.json(
            { error: { code: "unauthorized", message: auth.error.message } },
            { status: auth.error.status },
        );
    }

    const body = await req.json();
    const input = createCustomerSchema.parse(body);

    const result = await callExistingCustomerInviteFlow({
        productId: auth.params.productId,
        email: input.email,
        tags: input.tags,
        ctx: auth.ctx,
    });

    return NextResponse.json(result, { status: 200 });
}
```

Conventions:

- Keep route handlers small and explicit.
- Prefer reusing existing logic over re-implementing business rules in routes.
- Use stable resource naming in the REST contract, even if internal naming differs.
- For text lessons, accept and return Tiptap/ProseMirror JSON rather than stringified blobs.
- Preserve current CourseLit permission and visibility behavior exactly.
- Do not infer user identity from the API key itself; resolve the school owner where existing business logic requires `ctx.user`.

## Testing Strategy

Primary test levels:

- Route tests for new REST endpoints under `apps/web/app/api/...`
- Adapter/helper tests for new REST-layer composition outside `apps/web/graphql/**`
- Existing GraphQL/business-logic tests remain unchanged and serve as baseline coverage for behavior reused as-is
- OpenAPI generation verification for new fragments and merged schemas

Coverage expectations:

- happy-path behavior for every endpoint family
- authentication and authorization failures
- tenant isolation by domain
- parity with existing product/customer/lesson behavior
- customer roster and progress reporting behavior
- media upload signature authorization for both API keys resolved through the school owner and existing dashboard sessions

Verification requirements:

- run `pnpm test`
- run `pnpm lint`
- run `pnpm prettier`
- run `pnpm --filter @courselit/web openapi:generate`
- focused media signature tests: `pnpm exec jest --config apps/web/jest.server.config.ts --runInBand --runTestsByPath apps/web/app/api/media/presigned/__tests__/route.test.ts`

## Boundaries

- Always:
  Keep the REST layer as an alternate interface to existing CourseLit behavior, reuse existing business logic, add/update tests for new API routes, and keep Swagger/OpenAPI in sync.
- Ask first:
  Introducing new dependencies, adding an API-key scope/role system, changing default API-key access, requiring migrations, changing creator attribution, or changing customer progress semantics.
- Never:
  Add product/customer platform capabilities disguised as API work, modify product/customer business logic in `apps/web/graphql/**`, alter existing API endpoint behavior, add `/api/me` runtime endpoints, add SCORM lesson creation/processing support, expose raw SCORM runtime ingestion, require stringified Tiptap JSON in the public REST contract, expose session-cookie auth in Swagger, store API keys as user-owned credentials, or accept caller-provided ownership fields.

## Problem Statement

CourseLit already exposes a small public REST API in `apps/web`, but today it is effectively limited to basic user management via `/api/user`.

At the same time, the product already has mature internal capabilities for:

- product creation and updates
- product payment-plan creation, updates, archiving, and default-plan selection
- section/group authoring and reordering
- lesson authoring and publishing
- customer enrollment and customer invitation
- membership activation and status management
- customer progress tracking
- customer roster/reporting

Those capabilities are currently available only through internal GraphQL flows and app UI. External integrators cannot reliably:

- create new products in CourseLit
- create course structure and lesson content in CourseLit
- enroll customers from an external CRM/LMS/commerce system
- fetch customer rosters for a product
- read customer progress for course completions and downloads
- build alternate admin/integration frontends that manage CourseLit products, content, and customers

This creates a gap for agencies, self-hosters, enterprise customers, and technical schools that want to automate CourseLit as a system of record or as part of a larger workflow.

## Background And Current State

Current public API surface:

- `/api/user`
    - `POST` create user
    - `PATCH` update user
- authentication via school-domain request + API key
- API keys are currently tenant-level credentials with no per-key permission model
- OpenAPI generation exists and is already wired into development Swagger UI
- `/api/media/presigned` exists for dashboard media uploads and currently uses the logged-in user's `media:manage` permission

Relevant existing internal building blocks:

- product management in `apps/web/graphql/courses/*`
- payment-plan management in `apps/web/graphql/paymentplans/*`
- section/group operations in `apps/web/graphql/courses/*`
- lesson creation, updates, deletion, and authoring reads in `apps/web/graphql/lessons/*`
- user and customer helpers in `apps/web/graphql/users/*`
- membership activation in `apps/web/app/api/payment/helpers.ts`
- customer progress stored on `User.purchases`
- customer enrollment status stored in `Membership`
- customer reporting in `getProductMembers` and `getStudents`

This PRD proposes expanding the public REST API by reusing those existing business flows instead of re-implementing them in a separate stack.

## Goals

1. Add a public REST API for product management in `apps/web`.
2. Add public REST endpoints for product payment-plan management using workflows that already exist in the product today.
3. Add public REST endpoints for section/group and lesson authoring using workflows that already exist in the product today.
4. Add a public REST API for customer management using workflows that already exist in the product today.
5. Add customer progress read APIs for reporting and integrations.
6. Keep the API aligned with existing CourseLit multi-tenant auth and domain resolution.
7. Ensure the API only exposes capabilities already supported by the current platform.
8. Generate OpenAPI documentation for all new endpoints and surface them in Swagger during development.
9. Reuse existing business logic and validations wherever possible.
10. Expose the existing media upload signature flow to API-key callers by resolving the school owner as the integration actor and applying the existing `media:manage` permission check.

## Non-Goals

- Payment checkout, refunding, invoice creation, or webhook orchestration
- Creating or configuring payment providers
- Public API for community management
- Public API for page-builder content editing
- SCORM lesson creation, SCORM package processing, or raw SCORM runtime ingestion over the public API
- Direct multipart file upload as part of lesson create/update requests
- Customer-runtime `/api/me` endpoints
- Arbitrary customer progress write endpoints beyond the existing learner lesson actions explicitly listed in this PRD
- Privileged API-key writes that set or overwrite a customer's progress without going through existing lesson completion or quiz evaluation behavior
- Bulk import/export jobs in v1
- Webhooks in this PRD
- Any new platform capability that does not already exist in UI/GraphQL/business logic today
- API key rotation redesign in this PRD
- API-key scope or role management in this PRD
- User-owned API keys or per-user API-key impersonation
- Replacing the internal GraphQL API

## Scope

Guiding constraint:

- the public API is an alternate interface to existing CourseLit capabilities
- this PRD must not introduce new business behavior, new lifecycle states, or admin powers that do not already exist elsewhere in the system

GraphQL constraint:

- no files under `apps/web/graphql/**` should be modified for this work
- no new GraphQL queries, mutations, types, fields, helpers, or behavior should be added
- existing exported GraphQL/business functions may be called as-is where they already provide the required behavior
- if existing GraphQL logic does not expose a suitable function, create REST-layer adapter code outside `apps/web/graphql/**` or defer the endpoint; do not alter GraphQL to support the REST API

Existing API endpoint constraint:

- existing route handlers under `apps/web/app/api/**` must not be behaviorally altered as part of this work
- this includes `/api/user`, payment initiation/webhook routes, existing media upload signature routes, and any existing lesson/media processing routes
- new behavior must live in new API route files or new REST-layer adapter/helper files
- existing endpoints may be referenced or called by clients as part of documented workflows, but their request/response contracts, auth behavior, validation, status codes, and side effects must remain unchanged

Capability parity gate:

- every endpoint must map to an existing CourseLit UI, GraphQL, route, or business-logic workflow before implementation starts
- if an endpoint cannot be mapped to an existing capability, it must be removed from this PRD or explicitly deferred
- route handlers may compose existing reads into a REST-friendly shape, but must do so outside `apps/web/graphql/**`, without modifying existing API endpoints, and without exposing fields, lifecycle transitions, state mutations, or admin powers that are not already available through the current platform
- OpenAPI examples must describe existing CourseLit behavior only; Swagger must not imply support for capabilities that the app cannot already perform

### In Scope For V1

- Product CRUD for CourseLit products backed by `CourseModel`
- Product listing and detail retrieval
- Product payment-plan list, create, update, archive, and default-plan selection for `course` and `download` products
- Section/group create, update, remove, and reorder for products that support structured content
- Lesson create, update, delete, move, and fetch for products that support lessons
- Customer enrollment into a product
- Product customer roster retrieval
- Customer enrollment detail retrieval as a single-row view of existing product roster/member data
- Customer progress read APIs
- Learner lesson actions for quiz evaluation and lesson completion using existing `evaluateLesson` and `markLessonCompleted` behavior
- OpenAPI docs and route-level contract tests

### Product Types In Scope

For product-management endpoints, v1 should support full existing `CourseModel` product-type parity from day one:

- `course`
- `download`
- `blog`

For customer-management endpoints, v1 should support only enrollable product types:

- `course`
- `download`

Reason:

- product CRUD already exists for `course`, `download`, and `blog`
- full product-management parity avoids launching a REST API that behaves differently from existing product management for supported product types
- customer enrollment, customer reporting, and progress concepts apply to `course` and `download`
- `blog` should remain excluded from customer endpoints because the existing system does not treat blogs as customer-managed products

## Users And Use Cases

Primary users:

- agencies managing client schools
- enterprise integrators
- self-hosted operators
- developers building custom admin portals or workflow automation

Primary use cases:

1. Generate a product in CourseLit from an alternate frontend or AI workflow.
2. Generate sections and lessons for that product using existing CourseLit content structures.
3. Create and manage payment plans required for checkout and publishing.
4. Update title, slug, publication, metadata, payment plans, and lesson content from an external admin tool.
5. Enroll a customer after an off-platform purchase or contract event.
6. Grant free access to a customer for support, migration, or enterprise provisioning.
7. Fetch product rosters for reporting or support workflows.
8. Read customer progress and completion state from an external dashboard.

### Alternate Frontend Coverage

This API should explicitly support the following alternate-frontend pattern:

1. An admin or AI workflow creates a CourseLit product.
2. The same workflow creates one or more payment plans for the product.
3. The same workflow creates the product structure and lesson content.
4. The workflow publishes the product when ready.
5. The workflow enrolls customers.
6. CourseLit remains the system of record for enrollments, completion state, certificates, and related reporting.

## Proposed Solution

Add a new REST API surface in `apps/web` that exposes existing CourseLit management capabilities for admin and integration use cases.

The API should follow the current CourseLit public API model:

- request is sent to the school domain
- API key is provided in `x-api-key`
- domain is resolved from request context
- route handlers are thin
- internal business logic is reused by calling existing exported functions as-is where possible
- OpenAPI fragments are defined per route and merged into the generated spec

### API Design Principles

1. Use stable CourseLit IDs in public responses.

    - product identifier: `courseId`
    - customer identifier: `userId`
    - enrollment identifier: `membershipId`

2. Prefer resource-oriented REST routes.

3. Use API-key authentication for all endpoints in this scope.

    - management/admin endpoints should use `x-api-key`
    - legacy body `apikey` support remains only on `/api/user` for backward compatibility

4. Expose only workflows that already exist in the current system.

    - if a behavior is not already supported in the app/business logic, the API should not invent it
    - this applies even if adding it to REST would be convenient

5. Keep new response envelopes consistent even if `/api/user` remains legacy-shaped.

6. Return real customer email addresses on authenticated read endpoints.
    - unlike `/api/user` mutation responses, roster and customer management endpoints are not useful if email is hidden

### Existing Capability Mapping

Each endpoint family must remain a REST interface over existing platform behavior:

| REST endpoint family   | Existing CourseLit capability it maps to                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Product CRUD           | product management in `apps/web/graphql/courses/*` and dashboard product management UI                   |
| Product payment plans  | payment-plan management in `apps/web/graphql/paymentplans/*` and product manage UI                       |
| Sections/groups        | existing course group/section authoring and reorder logic                                                |
| Lessons                | existing lesson authoring, update, delete, move, visibility, and media-reference behavior                |
| Media signatures       | existing `apps/web/app/api/media/presigned` direct-to-MediaLit upload flow                               |
| Customer list/detail   | existing product member/customer roster reporting, including `getProductMembers`/`getMembers`-style data |
| Customer enrollment    | existing user creation/reuse, membership creation/reuse, and membership activation flow                  |
| Customer progress read | existing `User.purchases`/product reporting data already shown by CourseLit                              |

If implementation discovers that an endpoint requires behavior beyond the mapped existing capability, the endpoint should be cut or the PRD should return to review before code is written.

## Proposed Endpoints

### Product Management

- `GET /api/products`
    - list products
    - filters: `type`, `published`, `search`, `page`, `limit`, `sort`
- `POST /api/products`
    - create a product
- `GET /api/products/{productId}`
    - fetch one product
- `PATCH /api/products/{productId}`
    - update product metadata
- `DELETE /api/products/{productId}`
    - delete a product using existing product deletion rules

### Product Payment Plans

- `GET /api/products/{productId}/payment-plans`
    - list non-internal, non-archived payment plans for a product
- `POST /api/products/{productId}/payment-plans`
    - create a payment plan for a product
    - if the product has no default payment plan, the created plan becomes the default, matching existing behavior
- `GET /api/products/{productId}/payment-plans/{planId}`
    - fetch one payment plan for a product
- `PATCH /api/products/{productId}/payment-plans/{planId}`
    - update a payment plan using existing payment-plan validation rules
- `DELETE /api/products/{productId}/payment-plans/{planId}`
    - archive a payment plan using existing archive behavior
    - must fail if the plan is the product default
- `POST /api/products/{productId}/payment-plans/{planId}/default`
    - set a product's default payment plan

### Product Structure And Content Management

- `GET /api/products/{productId}/sections`
    - list sections/groups for a product
- `POST /api/products/{productId}/sections`
    - create a section/group
- `PATCH /api/products/{productId}/sections/{sectionId}`
    - update section/group metadata
- `DELETE /api/products/{productId}/sections/{sectionId}`
    - remove a section/group using existing product rules
- `POST /api/products/{productId}/sections/reorder`
    - reorder sections/groups
- `GET /api/products/{productId}/lessons`
    - list lessons for a product
- `POST /api/products/{productId}/lessons`
    - create a lesson
- `GET /api/products/{productId}/lessons/{lessonId}`
    - fetch a lesson for authoring/admin use
- `PATCH /api/products/{productId}/lessons/{lessonId}`
    - update a lesson
- `DELETE /api/products/{productId}/lessons/{lessonId}`
    - delete a lesson
- `POST /api/products/{productId}/lessons/{lessonId}/move`
    - move a lesson to a target section/group and position

### Customer Management

- `GET /api/products/{productId}/customers`
    - list enrolled customers for a product
    - filters: `status`, `search`, `page`, `limit`
- `POST /api/products/{productId}/customers/invitations`
    - invite a customer using the existing CourseLit customer invitation flow
    - must preserve existing behavior, including published-product validation, internal payment-plan membership activation, tag application, and best-effort invite email sending
- `GET /api/products/{productId}/customers/{userId}`
    - fetch one customer's enrollment snapshot for a product
    - this must be a single-row lookup over existing product roster/member data, not a new customer profile capability
    - response fields must be limited to enrollment/customer fields already visible through existing product customer/member reporting flows

### Customer Progress

- `GET /api/products/{productId}/customers/{userId}/progress`
    - fetch customer progress snapshot
    - this must be read-only and limited to progress/completion data already tracked by CourseLit today

### Learner Lesson Actions

- `POST /api/products/{productId}/customers/{userId}/lessons/{lessonId}/evaluations`
    - evaluate a quiz lesson submission for the target customer
    - request body: `{ "answers": number[][] }`
    - backed by existing `evaluateLesson`
    - evaluation records the existing lesson evaluation result but does not mark the lesson complete
- `POST /api/products/{productId}/customers/{userId}/lessons/{lessonId}/completion`
    - mark a lesson complete for the target customer
    - backed by existing `markLessonCompleted`
    - quiz lessons must still have a passing evaluation before completion, matching existing behavior

## Data Contracts

### Product Representation

The public product representation should include:

- `productId`
- `type`
- `title`
- `slug`
- `description`
- `published`
- `privacy`
- `tags`
- `featuredImage`
- `pageId`
- `defaultPaymentPlan`
- `paymentPlans`
- `createdAt`
- `updatedAt`

Admin/content endpoints should expose lesson and section data needed for parity with current CourseLit product authoring.

V1 should still not expose page-builder editing through this API.

Fields that are not actionable through this API must be hidden from public product representations. This includes `leadMagnet` and `certificate`.

`paymentPlans` and `defaultPaymentPlan` apply only where the existing platform exposes payment plans for the product type. They should not imply payment-plan support for `blog` products.

`course.cost` and `course.costType` are legacy internal constructs and must not be accepted, returned, surfaced in Swagger, or documented as part of this public API. Payment plans are the only public API contract for product pricing, checkout readiness, and publishing readiness.

### Payment Plan Representation

The public payment-plan representation should mirror the existing `PaymentPlan` model for course/download products:

- `planId`
- `name`
- `type`
- `entityId`
- `entityType`
- `oneTimeAmount`
- `emiAmount`
- `emiTotalInstallments`
- `subscriptionMonthlyAmount`
- `subscriptionYearlyAmount`
- `description`
- `isDefault`

Supported plan types:

- `free`
- `onetime`
- `emi`
- `subscription`

Validation must reuse existing payment-plan rules:

- `name` is required
- `type` is required
- `onetime` requires `oneTimeAmount`
- `emi` requires `emiAmount` and `emiTotalInstallments`
- `subscription` requires exactly one of `subscriptionMonthlyAmount` or `subscriptionYearlyAmount`
- paid plan types require the tenant to already have a supported payment provider configured
- duplicate plan types must be rejected according to the existing duplicate-plan rules
- `includedProducts` must not be accepted for product-owned plans because existing CourseLit validation disallows included products for course entities

Implementation note:

- the REST API should call existing `apps/web/graphql/paymentplans` logic as-is where possible; it should not modify GraphQL files or implement a separate payment-plan validation system

### Lesson Content Representation

The API must explicitly support the same lesson content model used by CourseLit today.

For `text` lessons:

- `lesson.content` should be represented as a Tiptap/ProseMirror JSON document
- the canonical shape should match `TextEditorContent`
- minimum expected shape:

```json
{
    "type": "doc",
    "content": []
}
```

Important notes:

- alternate frontends should send and receive structured JSON for text lessons, not HTML or Markdown
- the REST API may transform that JSON internally if existing business logic still expects a stringified document, but that is an implementation detail
- Swagger examples should show realistic Tiptap-style payloads for text lessons

For non-text lesson types, the API should continue to mirror the existing underlying content model:

- `quiz`: existing quiz JSON structure
- `embed`/simple media-backed types: existing content/value structure

### Unsupported Lesson Types

If a client attempts to create or update a lesson with `type = "scorm"`, the API must reject the request before any lesson or media-processing side effect occurs.

Expected response:

- HTTP status: `422 Unprocessable Entity`
- error code: `not_supported`
- error message: `SCORM lessons are not supported by the public API.`

Example:

```json
{
    "error": {
        "code": "not_supported",
        "message": "SCORM lessons are not supported by the public API."
    }
}
```

Swagger should document this response on lesson create/update operations so API clients do not mistake SCORM omission for missing documentation.

### File-Backed Lesson Representation

Lesson creation should not accept raw multipart files directly. File-backed lesson types should use the same two-step media model CourseLit already uses:

1. request a MediaLit upload signature
2. upload the file to MediaLit using the returned signature and endpoint
3. create or update the lesson by referencing the returned `mediaId`

This applies to lesson types such as:

- `video`
- `audio`
- `pdf`
- `file`

For regular media-backed lessons, the lesson payload should reference the uploaded media:

```json
{
    "title": "Intro video",
    "type": "video",
    "groupId": "section_123",
    "requiresEnrollment": true,
    "published": false,
    "media": {
        "mediaId": "media_123"
    }
}
```

Important constraints:

- the REST API should not proxy large file bodies through lesson create/update routes
- file upload authorization should preserve existing media-management permissions
- media-backed lesson creation must validate that the referenced `mediaId` belongs to the same tenant/domain
- SCORM lesson creation is intentionally out of scope for this public API and must return the documented `not_supported` error
- Swagger examples should document the existing media signature flow for supported media-backed lesson types

### Customer Representation

The customer/enrollment representation should include:

- `userId`
- `email`
- `name`
- `avatar`
- `membershipId`
- `membershipStatus`
- `subscriptionMethod`
- `subscriptionId`
- `enrolledAt`
- `updatedAt`

### Progress Representation

For `course` products:

- `productId`
- `userId`
- `completedLessonIds`
- `completedLessonsCount`
- `totalPublishedLessons`
- `progressPercent`
- `certificateId`
- `lastAccessedAt`
- `enrolledAt`

For `download` products:

- `productId`
- `userId`
- `downloaded`
- `enrolledAt`
- `lastAccessedAt`

V1 should not expose raw `scormData` publicly.

Progress fields may be derived from existing CourseLit progress data, published lesson counts, and reporting helpers, but must not introduce any new progress state or write capability.

### Lesson Evaluation Result

The public lesson evaluation result should mirror the existing quiz evaluation result:

- `pass`
- `score`
- `requiresPassingGrade`
- `passingGrade`

The evaluation endpoint must not return correct answers or raw lesson content.

## Write Semantics

### Product Create

`POST /api/products` should support the minimum metadata needed to create a usable product:

- `title`
- `type`

Product creation should not require a payment plan when the product is created as a draft.

Product creation must always create a draft product and must match the existing CourseLit app flow, which only accepts title and product type. `slug`, `description`, `published`, `privacy`, `tags`, `featuredImage`, and other metadata must not be accepted on `POST /api/products`; clients should use `PATCH /api/products/{productId}` after creation for metadata, publish, and privacy changes.

The recommended flow for alternate frontends is:

1. `POST /api/products`
2. `POST /api/products/{productId}/payment-plans`
3. optionally `POST /api/products/{productId}/payment-plans/{planId}/default`
4. `PATCH /api/products/{productId}` with `published = true`

### Payment Plan Management

Payment-plan endpoints should expose the same behavior currently available through CourseLit product management UI/GraphQL.

`POST /api/products/{productId}/payment-plans` should accept:

- `name` required
- `type` required: `free`, `onetime`, `emi`, or `subscription`
- `oneTimeAmount` required for `onetime`
- `emiAmount` and `emiTotalInstallments` required for `emi`
- exactly one of `subscriptionMonthlyAmount` or `subscriptionYearlyAmount` required for `subscription`
- `description` optional

Expected behavior:

- create a non-internal payment plan for the product
- set `entityId` to the product ID and `entityType` to `course`
- set the plan as `defaultPaymentPlan` if the product does not already have one
- reject paid plans when the tenant has no payment provider configured
- reject `includedProducts` for product-owned plans
- return the created payment plan with `isDefault`

`PATCH /api/products/{productId}/payment-plans/{planId}` should support the same editable fields and validations.

`DELETE /api/products/{productId}/payment-plans/{planId}` should archive the plan, not hard-delete it. If the plan is the product's `defaultPaymentPlan`, the API must return a validation error matching existing behavior.

`POST /api/products/{productId}/payment-plans/{planId}/default` should set the product's default payment plan after verifying the plan belongs to the same product and tenant.

### Publishing With Payment Plans

Publishing should not create payment plans implicitly.

When `PATCH /api/products/{productId}` sets `published = true` for `course` or `download` products:

- the API must verify that at least one non-internal, non-archived payment plan exists for the product
- the API should preserve the existing error semantics for missing payment plans
- the API should expose default-plan selection so checkout-capable alternate frontends can select the intended default plan before publishing
- the normal API workflow should have a valid `defaultPaymentPlan` because creating the first plan sets it as default using existing behavior
- Swagger should document the recommended draft → payment plan → publish sequence

### Section And Lesson Authoring

The API should expose existing product-structure and lesson-authoring workflows already supported by CourseLit, including:

- create section/group
- update section/group metadata
- reorder sections/groups
- create lesson
- update lesson
- delete lesson
- move lesson across sections/groups

This is required to support alternate frontends that generate complete courses, not just empty product shells.

For lesson create/update payloads:

- `text` lessons should accept `content` as a Tiptap/ProseMirror JSON document
- responses for `text` lessons should return the same document shape
- the API contract should not force clients to send stringified JSON blobs for text lessons
- if internal reuse of existing GraphQL logic requires stringification, that conversion should happen inside the REST layer or a new helper outside `apps/web/graphql/**`
- file-backed lessons should accept `media.mediaId` references, not raw files
- SCORM lessons should not be creatable or processable through this public API in v1 and must fail with the documented `not_supported` error

### Product Update

`PATCH /api/products/{productId}` should support metadata-only updates for the same field set.

### Customer Invitations

`POST /api/products/{productId}/customers/invitations` should accept:

- `email` required
- `tags` optional

Expected behavior:

- follow the existing `inviteCustomer` behavior without adding new controls
- require the product to be published if the existing flow requires it
- create user if missing using the existing defaults
- reuse existing user if present
- apply tags using existing tag behavior when tags are supplied
- create or reuse membership using the existing internal payment plan flow
- activate membership using existing membership activation flow
- ensure customer gets product access in `User.purchases`
- send the existing customer invitation/enrollment email if the existing flow sends it
- return current customer enrollment snapshot

The endpoint must not introduce new customer-invitation controls that the existing platform flow does not support, such as overriding the invite email behavior, setting a custom enrollment email, or accepting arbitrary customer profile fields beyond the existing flow.

If the customer is already actively enrolled, the endpoint should preserve existing behavior and return success/current state if the existing flow does so.

### Customer Progress

Customer progress reads remain read-only in this API scope.

Important constraints:

- API-key-based callers must not gain a new ability to arbitrarily set another customer’s progress.
- The only learner progress writes in scope are existing lesson runtime actions exposed as REST: quiz evaluation through `evaluateLesson` and lesson completion through `markLessonCompleted`.
- These learner action endpoints must resolve the target customer by path `userId`, set `ctx.user` to that customer, and then call the existing GraphQL lesson function without modifying `apps/web/graphql/**`.
- Quiz evaluation and lesson completion remain separate operations; successful quiz evaluation does not automatically mark the lesson complete.
- `/api/me` runtime APIs are not part of this implementation spec.

### Learner Lesson Actions

Learner lesson action endpoints should expose existing runtime behavior for integrations that need to submit quiz answers or mark a customer's lesson complete.

Expected behavior:

- require a valid tenant API key and school domain
- resolve the school owner only to authenticate the API key request using the standard public API auth path
- resolve `{userId}` as a `User` in the same domain and fail with `404` if the learner cannot be found
- verify `{lessonId}` belongs to `{productId}` before invoking lesson runtime behavior
- call `evaluateLesson(lessonId, { answers }, learnerCtx)` for quiz evaluation
- call `markLessonCompleted(lessonId, learnerCtx)` for completion
- preserve existing errors for not enrolled, unreleased drip content, non-quiz evaluation, missing answers, and quiz completion before passing

These endpoints must not accept `creatorId`, learner email, target domain, or any caller-controlled ownership fields.

## Permissions And Authentication

Authentication:

- all new public REST endpoints in this scope require `x-api-key`
- requests must be made against the target school domain
- `/api/media/presigned` is the only exception because it is an existing CourseLit dashboard endpoint, not a new public management endpoint; it keeps its pre-existing dashboard-session auth path so the dashboard media upload UI remains backward compatible

Authorization:

- product management endpoints require product-management capability equivalent to current internal checks
- payment-plan management endpoints require product-management capability equivalent to current internal checks
- customer management endpoints require user/product-management capability equivalent to current internal checks
- media upload signature access via API key resolves the school owner as the integration actor and requires that resolved owner user to pass the existing `media:manage` permission check
- media upload signature access via dashboard session continues to require the logged-in user permission `media:manage`
- learner lesson action endpoints use the resolved school owner only for API-key validation, then deliberately switch `ctx.user` to the domain learner identified by path `userId`

V1 API key decision:

- public API keys remain tenant-level credentials following the current public API model
- API keys remain tenant-level credentials with no per-key permission model in this PRD
- API-key settings UI and API-key persistence model remain unchanged
- user-owned keys or per-key permission models may be revisited later, but are out of scope here
- after a valid API key is resolved, the REST auth layer resolves the school owner and sets that user as `ctx.user` for all new public API routes
- learner lesson action routes are the only exception: after API-key validation, they set `ctx.user` to the target learner resolved from the same domain before calling existing lesson runtime logic
- if the school owner cannot be resolved, the request fails with `403` and no route-specific business logic runs

### Media Upload Signature Authorization

`POST /api/media/presigned` should support two auth modes only because the route already exists and is used by the CourseLit dashboard:

- Dashboard session mode, retained for the CourseLit dashboard only:
    - existing behavior
    - requires logged-in user with `media:manage`
- Public API-key mode:
    - requires valid school API key
    - resolves the school owner from `domain.email`
    - requires the resolved owner user to have `media:manage`
    - uses the resolved owner as the integration actor, matching the rest of the public management API

Authorization outcomes:

- no valid session and no valid API key: `401`
- valid API key whose owner actor cannot be resolved: `403`
- valid API key whose resolved owner lacks `media:manage`: `403`
- valid API key whose resolved owner has `media:manage`: return `{ signature, endpoint }`
- logged-in dashboard user without `media:manage`: `403`

Swagger/OpenAPI requirements:

- Show `/api/media/presigned` in Swagger under `Media Uploads`.
- Document it with `ApiKeyAuth`.
- State that API-key calls run as the resolved school owner integration actor and require that actor to pass `media:manage`.
- State that the route also retains dashboard session auth for CourseLit's own UI, but this is not a public API auth mode and does not apply to new product, payment-plan, content, customer, or progress endpoints.
- Do not expose or document session-cookie token entry fields.

### Creator Attribution And GraphQL Context

API keys are not associated with a `creatorId`.

However, existing CourseLit business logic expects a `ctx.user` for permission checks and for fields such as `creatorId` when creating products, pages, sections, lessons, and related records. The REST API must not accept `creatorId`, `userId`, or any equivalent caller-controlled creator override.

V1 creator attribution decision:

- API-key-authenticated management calls run as a tenant integration actor derived from the school owner.
- The school owner is resolved from the current domain record, using the existing domain owner email (`domain.email`) to find the matching user in that domain.
- Created records that require `creatorId` use that resolved owner user’s `userId`, because that is how the existing CourseLit creation logic models ownership today.
- This does not mean the API key is owned by that user or is a general-purpose impersonation token. It is only the v1 bridge required to call existing business logic without adding per-key user identity.
- If the owner user cannot be resolved for endpoints that need existing GraphQL `ctx.user`, the API must fail with `403` and must not proceed with a synthetic or caller-provided creator.
- The existing `deleteUser` mutation must prevent deletion of the user whose email matches `domain.email`, because that user is the v1 API actor.
- Supported user update mutations do not currently expose `email` as an editable field, and the settings/theme/page mutations reviewed for this PRD do not update `domain.email`. If future ownership transfer or email-change functionality is added, it must preserve API actor resolvability or move this design to a stable owner reference such as `domain.ownerId`.

Future user-owned API keys may replace this attribution model, but that is outside this PRD.

### Created Record Ownership And User Fields

API-key-created resources must use existing model semantics. The API must not add `createdByApiKey`, `apiKeyId`, `creatorId`, or caller-controlled `userId` fields in this PRD.

The expected behavior is:

| Resource / model field                                                                  | Behavior when created by API key                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Course.creatorId` for course/download/blog products                                    | Set by existing product creation logic from `ctx.user.userId`, where `ctx.user` is the resolved school owner integration actor.                                                                                                                                                                                                                                                                                                                                                |
| `Page.creatorId` for product pages created with course/download products                | Set to the resolved school owner integration actor by existing page creation logic.                                                                                                                                                                                                                                                                                                                                                                                            |
| Default section/group creation side effects                                             | Use the same `ctx.user` and permission context as existing product creation. No caller-supplied ownership fields are accepted.                                                                                                                                                                                                                                                                                                                                                 |
| `Lesson.creatorId` for text/video/audio/PDF/file lessons                                | Set by existing lesson creation logic from the resolved school owner integration actor.                                                                                                                                                                                                                                                                                                                                                                                        |
| `PaymentPlan.userId` for payment plans created through product payment-plan endpoints   | Set by existing payment-plan creation logic from the resolved school owner integration actor.                                                                                                                                                                                                                                                                                                                                                                                  |
| `Media.userId` for media uploaded through MediaLit after an API-key signature           | Not set by CourseLit REST route code in this PRD. The API returns a MediaLit signature for the school/domain after resolving the school owner as the actor and applying the existing `media:manage` permission check. The direct MediaLit upload response is later referenced by `mediaId`. If tenant ownership validation requires a CourseLit `Media` document owner, implementation must use existing media-management behavior and must not invent a caller-provided user. |
| Customer `User.userId`                                                                  | Represents the target customer, created or reused by existing user/customer flows. It is never the API key, and it is not the school owner unless the target email is the owner.                                                                                                                                                                                                                                                                                               |
| `Membership.userId`                                                                     | Represents the target enrolled customer, not the API key and not the integration actor.                                                                                                                                                                                                                                                                                                                                                                                        |
| `User.purchases[*]` progress records                                                    | Stored on the target customer user, not on the integration actor.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Certificates, lesson evaluations, activity, and other customer-runtime `userId` records | Created only through the existing learner lesson action behavior explicitly exposed by this PRD, or where existing enrollment/payment side effects already do so. These records use the target learner user resolved from the same domain.                                                                                                                                                                                                                                     |

This split is intentional:

- creator/owner fields required by admin authoring flows use the resolved school owner integration actor
- customer/enrollment/progress and learner action fields use the target customer user
- API keys themselves are not stored as `creatorId` or `userId`
- public request payloads must not expose ownership assignment knobs

If future API-key ownership/auditing is needed, it should be designed as a separate additive model, for example `createdByApiKeyId` or an audit log, rather than overloading existing `creatorId`/`userId` fields.

## Error Contract

New endpoints should standardize on:

```json
{
    "error": {
        "code": "not_found",
        "message": "Product not found"
    }
}
```

Suggested common codes:

- `bad_request`
- `unauthorized`
- `forbidden`
- `not_found`
- `conflict`
- `not_supported`
- `unprocessable_entity`
- `internal_error`

Unsupported lesson types should use HTTP `422` with `code = "not_supported"` so clients can distinguish unsupported-but-recognized CourseLit lesson formats from malformed payloads.

This contract should apply to new endpoints even if `/api/user` remains unchanged for backward compatibility.

## Pagination, Filtering, And Sorting

Defaults:

- default `page = 1`
- default `limit = 50`
- max `limit = 200`

Product list:

- `type`
- `published`
- `search`
- `direction = asc | desc`

Product list ordering should mirror existing product-list behavior without exposing internal timestamp fields in the public response contract.

Customer list:

- `status`
- `search` by email or name
- `page`
- `limit`

## OpenAPI And Documentation

Implementation should follow the existing pattern:

1. each route family exposes an OpenAPI fragment near the route
2. fragments are merged in `apps/web/openapi/index.mjs`
3. spec is generated to `apps/web/openapi/generated/openapi.json`
4. development Swagger UI automatically reflects the new endpoints

### Swagger Documentation Upgrade

This work should explicitly improve the Swagger experience, not just add more paths to the generated spec.

Required Swagger/OpenAPI upgrades:

- add new top-level tags:
    - `Products`
    - `Payment Plans`
    - `Content`
    - `Customers`
    - `Progress`
- group endpoints so the UI reads as task-oriented API documentation rather than a flat route dump
- add request and response examples for every new endpoint
- define reusable schemas for:
    - `Product`
    - `Section`
    - `Lesson`
    - `TextEditorContent`
    - `Media`
    - `MediaUploadSignature`
    - `PaymentPlan`
    - `PaymentPlanListResponse`
    - `ProductListResponse`
    - `Customer`
    - `CustomerListResponse`
    - `CustomerProgress`
    - `ErrorResponse`
- define reusable query/path/header parameters where practical
- document `x-api-key` consistently on every secured operation
- document school-domain calling expectations clearly in endpoint descriptions
- mark legacy body `apikey` authentication as deprecated and avoid extending that pattern to new endpoints
- ensure Swagger "Try it out" works cleanly with the current `Authorize` flow for API-key entry
- ensure pagination/filter parameters show defaults and max limits in Swagger
- ensure destructive routes like `DELETE /api/products/{productId}` clearly describe side effects and existing platform constraints

Nice-to-have Swagger improvements:

- add operation IDs that are SDK-friendly and stable
- add short, copy-pasteable examples for common workflows such as:
    - create product
    - create a free payment plan
    - create a paid payment plan
    - set default payment plan
    - publish a product after payment-plan setup
    - create section
    - generate a MediaLit upload signature with an API key whose resolved school owner has `media:manage`
    - create text lesson with Tiptap content
    - create video/audio/PDF/file lesson with uploaded `mediaId`
    - enroll customer
    - fetch customer roster
    - fetch customer progress
- if needed later, customize Swagger UI presentation so the most common public API flows are easier to discover first

Success criteria for the Swagger upgrade:

- a developer can authenticate once in Swagger and test the full public API flow end to end
- endpoint descriptions make the tenant/domain model understandable without reading source code
- examples are sufficient for a first successful API call without external support

Documentation follow-up after implementation:

- update `apps/docs/src/pages/en/developers/introduction.md`
- add developer docs for product management
- add developer docs for product payment-plan management and the publish workflow
- add developer docs for owner-backed API-key auth and direct media upload signatures
- add developer docs for customer management

## Implementation Plan

### Phase 1: REST Foundation

- create shared API auth/domain validation helpers for new routes by matching current `/api/user` behavior without modifying the existing `/api/user` endpoint
- after a valid API key is resolved, resolve the school owner and set that user as `ctx.user` for all new public API routes
- fail with `403` when the school owner cannot be resolved; do not proceed with synthetic or caller-provided ownership
- define common response/error helpers for new public routes
- define shared OpenAPI schemas for products, payment plans, media signatures, customers, and progress
- identify places where existing GraphQL logic can be called directly as-is and places where REST-layer adapter helpers are needed outside `apps/web/graphql/**`

### Phase 2: Product APIs

- add product list/detail/create/update/delete routes
- wire routes to existing course/product business logic

### Phase 3: Product Payment Plan APIs

- add product payment-plan list/detail/create/update/archive/default routes
- wire routes to existing payment-plan business logic
- ensure product publish routes preserve the existing payment-plan-required validation
- document the draft → payment plan → publish workflow in Swagger examples

### Phase 4: Product Structure And Content APIs

- add section/group routes
- add lesson CRUD and move routes
- update `/api/media/presigned` so API-key callers can generate upload signatures through the resolved school owner actor while existing dashboard-session behavior remains intact
- document the client workflow that generates a media upload signature and then creates media-backed lessons with uploaded `mediaId`
- wire routes to existing course and lesson business logic

### Phase 5: Customer Enrollment APIs

- add customer roster and customer detail routes
- add enroll route

### Phase 6: Customer Progress APIs

- add progress read route
- ensure read behavior reflects existing completion, enrollment, downloaded, and certificate state

### Phase 7: Docs And Hardening

- generate OpenAPI updates
- upgrade Swagger grouping, examples, and reusable schemas
- expand developer docs
- validate multi-tenant isolation, idempotency, and permission handling

## Testing Plan

Add or update tests for:

- API key authentication failures
- tenant isolation by domain
- endpoint responses stay within the documented existing-capability mapping
- product create/update/delete success and validation failures
- product publishing fails when required payment plans are missing
- product publishing succeeds after a valid payment plan exists
- payment-plan list/create/update/archive/default flows
- paid payment-plan creation fails when no payment provider is configured
- archiving the default payment plan fails with existing validation behavior
- section/group create/update/delete/reorder flows
- lesson create/update/delete/move flows
- media upload signature auth, owner resolution, and domain isolation
- media-backed lesson creation using `mediaId`
- SCORM lesson create/update attempts return the documented `not_supported` error and do not create partial resources
- customer enrollment for:
    - new user
    - existing user
    - already-enrolled user
- customer roster pagination and filtering
- progress retrieval
- learner lesson quiz evaluation, including target learner context switching and malformed answer payloads
- learner lesson completion, including quiz completion before passing and lesson/product path mismatch
- OpenAPI generation including new route fragments

Preferred test locations:

- route tests under `apps/web/app/api/...`
- adapter/helper tests outside `apps/web/graphql/**` where REST-layer composition is needed

## Acceptance Criteria

1. Authenticated admin/integration callers can create, list, read, update, and delete supported products via REST.
2. Authenticated admin/integration callers can create, list, update, archive, and choose default payment plans for course/download products via REST.
3. Publishing a course/download through the API enforces the existing payment-plan-required rules.
4. Authenticated admin/integration callers can create and manage product sections/groups and lessons via REST using existing CourseLit behavior.
5. Authenticated admin/integration callers can list product customers, fetch customer enrollment snapshots, and enroll customers into supported products.
6. Authenticated admin/integration callers can read customer progress for supported product types.
7. Authenticated admin/integration callers can submit quiz evaluations and mark lessons complete for enrolled customers using existing learner lesson behavior.
8. No API endpoint in this scope introduces behavior that is not already supported by the existing CourseLit system.
9. No `/api/me` customer-runtime endpoints are added as part of this work.
10. All new endpoints appear in generated OpenAPI output and development Swagger UI.
11. All new endpoints respect school-domain isolation and existing permission rules.
12. Existing `/api/user` behavior remains backward compatible.
13. Swagger documentation is upgraded so the new product, payment-plan, content, customer, media upload, and progress APIs are discoverable, example-driven, and testable through the UI.
14. Every API-key-authenticated management route resolves the school owner as the integration actor, sets that user as `ctx.user` where existing logic needs context, and fails with `403` if the owner cannot be resolved.
15. Every learner lesson action route resolves the school owner for API-key validation, then sets `ctx.user` to the same-domain target learner before calling existing lesson runtime logic.
16. Every endpoint has an explicit existing-capability mapping, and implementation does not proceed for endpoints whose mapping cannot be proven.
17. Product/customer API work does not modify product/customer business logic in `apps/web/graphql/**`.
18. Existing API endpoint handlers and contracts remain backward compatible.
19. `/api/media/presigned` accepts API keys by resolving the school owner actor and requiring that actor to pass the existing `media:manage` permission check; it continues accepting logged-in dashboard sessions with `media:manage`.
20. Swagger does not expose or request CourseLit session-cookie tokens.

## Task Breakdown

### Phase 1: REST Foundation

- [ ] Task 1: Public API auth and response helpers

    - Description: Add shared helpers for new public REST routes by matching current `/api/user` API-key/domain behavior without modifying existing endpoints.
    - Acceptance: New helpers validate school-domain API keys, resolve the school owner from the domain record, set the resolved owner as `ctx.user`, fail with `403` when that owner cannot be resolved, and return standardized error responses.
    - Verify: `pnpm test`
    - Dependencies: None
    - Files: new helper files under `apps/web/app/api/*` or `apps/web/lib/*`, route tests
    - Estimated scope: M

- [ ] Task 2: OpenAPI schema foundation

    - Description: Define reusable OpenAPI components for auth, errors, pagination, products, payment plans, sections, lessons, media references, customers, and progress.
    - Acceptance: Shared schemas exist, `x-api-key` auth is documented, owner-backed media upload auth is documented, and generated OpenAPI output includes the new reusable components.
    - Verify: `pnpm --filter @courselit/web openapi:generate`
    - Dependencies: Task 1
    - Files: `apps/web/openapi/*`, new OpenAPI fragments
    - Estimated scope: M

- [ ] Task 3: Existing-capability mapping checklist
    - Description: Add a lightweight implementation checklist that each new endpoint family must satisfy before code lands.
    - Acceptance: Checklist confirms no product/customer business-logic edits under `apps/web/graphql/**`, no incompatible existing endpoint edits, and an explicit existing CourseLit capability mapping for each route family.
    - Verify: manual review against this PRD
    - Dependencies: None
    - Files: this spec or a small docs/checklist file near the new API routes
    - Estimated scope: S

### Checkpoint: Foundation

- [ ] `pnpm test` passes
- [ ] `pnpm --filter @courselit/web openapi:generate` passes
- [ ] Product/customer GraphQL business logic is unchanged
- [ ] Existing `/api/user`, payment, and lesson API route handlers are backward compatible
- [ ] `/api/media/presigned` supports both existing session auth and owner-backed API-key auth

### Phase 2: Product And Payment Plans

- [ ] Task 4: Product list and detail endpoints

    - Description: Add `GET /api/products` and `GET /api/products/{productId}` for full existing product type parity: `course`, `download`, and `blog`.
    - Acceptance: Routes reuse existing product read behavior, support documented filters/pagination, and do not expose `course.cost` or `course.costType`.
    - Verify: `pnpm test`, `pnpm --filter @courselit/web openapi:generate`
    - Dependencies: Tasks 1, 2, 3
    - Files: `apps/web/app/api/products*`, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 5: Product create and update endpoints

    - Description: Add `POST /api/products` and `PATCH /api/products/{productId}` using existing product behavior.
    - Acceptance: Draft product creation works, metadata updates work, publishing enforces existing payment-plan-required validation, and `blog` parity is preserved where existing behavior supports it.
    - Verify: `pnpm test`
    - Dependencies: Task 4
    - Files: `apps/web/app/api/products*`, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 6: Product delete endpoint

    - Description: Add `DELETE /api/products/{productId}` using existing product deletion behavior.
    - Acceptance: Deletion follows existing side effects and permissions, OpenAPI clearly documents destructive behavior, and no existing delete logic is altered.
    - Verify: `pnpm test`
    - Dependencies: Task 4
    - Files: `apps/web/app/api/products*`, route tests, OpenAPI fragments
    - Estimated scope: S

- [ ] Task 7: Product payment-plan read endpoints

    - Description: Add `GET /api/products/{productId}/payment-plans` and `GET /api/products/{productId}/payment-plans/{planId}` for `course` and `download` products.
    - Acceptance: Routes return non-internal, non-archived plans, include `isDefault`, reject unsupported product types according to existing capability boundaries, and do not imply blog payment-plan support.
    - Verify: `pnpm test`
    - Dependencies: Task 4
    - Files: `apps/web/app/api/products/*/payment-plans*`, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 8: Product payment-plan write endpoints
    - Description: Add create, update, archive, and default-plan routes using existing payment-plan behavior.
    - Acceptance: Existing validations are preserved, paid-provider checks work, first plan becomes default when existing behavior does so, and archiving the default plan fails.
    - Verify: `pnpm test`
    - Dependencies: Task 7
    - Files: `apps/web/app/api/products/*/payment-plans*`, route tests, OpenAPI fragments
    - Estimated scope: M

### Checkpoint: Product And Payment Plans

- [ ] Product draft → payment plan → publish flow works through REST
- [ ] Product CRUD supports `course`, `download`, and `blog` parity where existing behavior supports it
- [ ] Payment-plan endpoints are absent or rejected for product types without existing payment-plan support
- [ ] No legacy `course.cost` or `course.costType` appears in schemas, examples, or responses

### Phase 3: Product Structure And Lessons

- [ ] Task 9: Section/group read and write endpoints

    - Description: Add section/group list, create, update, delete, and reorder routes.
    - Acceptance: Routes map to existing section/group behavior, preserve ordering semantics, and reject unsupported product types without adding new structure behavior.
    - Verify: `pnpm test`
    - Dependencies: Task 4
    - Files: `apps/web/app/api/products/*/sections*`, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 10: Lesson list/detail and text lesson write support

    - Description: Add lesson list/detail plus create/update/delete/move routes for text lessons.
    - Acceptance: Text lesson create/update accepts and returns Tiptap/ProseMirror JSON, REST-layer conversion happens outside `apps/web/graphql/**` if needed, and delete/move behavior matches existing logic.
    - Verify: `pnpm test`
    - Dependencies: Task 9
    - Files: `apps/web/app/api/products/*/lessons*`, REST-layer adapters, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 11: Media upload signatures and media-backed lesson support

    - Description: Add support for `video`, `audio`, `pdf`, and `file` lesson payloads that reference existing MediaLit `mediaId`s.
    - Acceptance: `/api/media/presigned` accepts API keys by resolving the school owner actor, requires that actor to pass the existing `media:manage` permission check, keeps existing dashboard session behavior, lesson routes accept `media.mediaId`, validate same-tenant ownership using existing media-management behavior where available, and document the direct-to-MediaLit upload flow.
    - Verify: `pnpm test`
    - Dependencies: Tasks 1, 10
    - Files: `apps/web/app/api/media/presigned/route.ts`, `apps/web/app/api/products/*/lessons*`, REST-layer adapters, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 12: Unsupported SCORM contract
    - Description: Add explicit SCORM rejection behavior to lesson create/update routes.
    - Acceptance: `type = "scorm"` returns HTTP `422` with `code = "not_supported"` and message `SCORM lessons are not supported by the public API.`, with no partial lesson or media side effects.
    - Verify: `pnpm test`
    - Dependencies: Task 10
    - Files: `apps/web/app/api/products/*/lessons*`, route tests, OpenAPI fragments
    - Estimated scope: S

### Checkpoint: Content Authoring

- [ ] A product can be created, structured, populated with text/media-backed lessons, and published through REST
- [ ] SCORM create/update attempts fail with the documented contract
- [ ] Existing dashboard-session media signature flow remains backward compatible
- [ ] SCORM processing/runtime endpoints remain unchanged
- [ ] Swagger examples show Tiptap JSON and media `mediaId` references

### Phase 4: Customers And Progress

- [ ] Task 13: Customer roster and detail endpoints

    - Description: Add `GET /api/products/{productId}/customers` and `GET /api/products/{productId}/customers/{userId}` as REST views over existing product roster/member data.
    - Acceptance: Roster supports documented pagination/filtering, detail is only a single-row lookup over existing roster/member data, and responses do not expose new customer profile capability.
    - Verify: `pnpm test`
    - Dependencies: Task 4
    - Files: `apps/web/app/api/products/*/customers*`, REST-layer adapters, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 14: Customer invitation endpoint

    - Description: Add `POST /api/products/{productId}/customers/invitations` using the existing customer invitation/enrollment flow.
    - Acceptance: Request accepts `email` and optional `tags` only, preserves published-product validation, creates/reuses users and memberships through existing behavior, applies tags through existing behavior, and does not add email/profile override controls.
    - Verify: `pnpm test`
    - Dependencies: Task 13
    - Files: `apps/web/app/api/products/*/customers*`, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 15: Customer progress read endpoint

    - Description: Add `GET /api/products/{productId}/customers/{userId}/progress` as a read-only view over existing progress/reporting data.
    - Acceptance: Route returns course/download progress fields derived from existing state, excludes raw `scormData`, and provides no write path for progress.
    - Verify: `pnpm test`
    - Dependencies: Task 13
    - Files: `apps/web/app/api/products/*/customers/*/progress*`, REST-layer adapters, route tests, OpenAPI fragments
    - Estimated scope: M

- [ ] Task 16: Learner lesson action endpoints
    - Description: Add quiz evaluation and lesson completion endpoints for a product customer using existing `evaluateLesson` and `markLessonCompleted` behavior.
    - Acceptance: Routes resolve the target learner by same-domain `userId`, switch `ctx.user` to that learner before calling existing lesson runtime logic, verify the lesson belongs to the product path, keep evaluation and completion as separate operations, and preserve existing validation for enrollment, drip release, missing answers, non-quiz lessons, and quiz completion before passing.
    - Verify: `pnpm test`, `pnpm --filter @courselit/web openapi:generate`
    - Dependencies: Tasks 10, 13, 15
    - Files: `apps/web/app/api/products/*/customers/*/lessons*`, REST-layer adapters, route tests, OpenAPI fragments
    - Estimated scope: M

### Checkpoint: Customers And Progress

- [ ] Customer invite/enroll flow works through REST using only existing behavior
- [ ] Customer roster/detail/progress reads match existing reporting semantics
- [ ] Learner quiz evaluation and lesson completion work through REST without adding arbitrary progress writes
- [ ] No `/api/me` endpoints are added

### Phase 5: Documentation And Release Readiness

- [ ] Task 17: Swagger workflow documentation

    - Description: Upgrade generated Swagger/OpenAPI documentation for the complete public API flow.
    - Acceptance: Swagger includes tags, reusable schemas, operation IDs, examples, owner-backed API-key auth, pagination defaults, destructive-route warnings, SCORM rejection examples, and draft → payment plan → publish workflow examples.
    - Verify: `pnpm --filter @courselit/web openapi:generate`, manual Swagger review
    - Dependencies: Tasks 1-16
    - Files: `apps/web/openapi/*`, route OpenAPI fragments
    - Estimated scope: M

- [ ] Task 18: Developer documentation

    - Description: Update public developer docs after implementation.
    - Acceptance: Docs cover products, payment plans, content authoring, owner-backed API-key auth, media upload flow, customers, progress, auth, tenant/domain model, unsupported SCORM, and no `course.cost`/`course.costType` contract.
    - Verify: manual docs review, docs build if applicable
    - Dependencies: Task 17
    - Files: `apps/docs/src/pages/en/developers/*`
    - Estimated scope: M

- [ ] Task 19: Final hardening and regression guard
    - Description: Run the full verification suite and confirm implementation boundaries.
    - Acceptance: Tests/lint/format/OpenAPI generation pass, product/customer GraphQL business logic remains unchanged, existing API endpoint handlers are backward compatible, and every endpoint has an existing-capability mapping.
    - Verify: `pnpm test`, `pnpm lint`, `pnpm prettier`, `pnpm --filter @courselit/web openapi:generate`
    - Dependencies: Tasks 1-18
    - Files: no feature files unless fixing verification failures
    - Estimated scope: S

### Checkpoint: Complete

- [ ] All acceptance criteria in this PRD are satisfied
- [ ] Full alternate-frontend flow works: create product, create payment plan, create structure/content, publish, enroll customer, read progress
- [ ] Swagger and developer docs are aligned with shipped behavior
- [ ] Product/customer GraphQL behavior and existing API endpoint behavior remain backward compatible

## Risks And Mitigations

- Risk: logic drift between REST endpoints and internal app behavior

    - Mitigation: keep route handlers thin and reuse existing business logic modules

- Risk: enrollment state and customer progress drift apart

    - Mitigation: treat membership status and `User.purchases` updates as a single shared flow

- Risk: exposing too much mutable customer state too early

    - Mitigation: keep progress read-only in this scope

- Risk: API scope drifts into platform feature work

    - Mitigation: require every endpoint to map directly to an existing UI/GraphQL/business workflow before it is included

- Risk: powerful tenant-level API keys increase blast radius

    - Mitigation: keep API keys tenant-level and owner-backed for v1, rely on the resolved school owner’s existing permissions, document the blast radius clearly, and defer per-key permission models to a separate product decision

- Risk: file upload handling becomes expensive or unreliable if routed through Next.js lesson endpoints
    - Mitigation: keep the direct-to-MediaLit upload flow, gate signature generation with the resolved owner actor’s existing `media:manage` permission, and pass `mediaId` references to lesson APIs
