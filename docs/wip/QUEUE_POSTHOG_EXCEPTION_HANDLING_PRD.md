# Queue PostHog Error Tracking PRD

## Document Control

- Status: Draft
- Last updated: March 15, 2026
- Owner: Queue/Backend team
- Target workspace: `apps/queue` (`@courselit/queue`)

## Problem Statement

`apps/queue` currently writes logs to MongoDB (`pino-mongodb`), but production error visibility is still fragmented:

- no single error stream across loops, workers, DB lifecycle, and API routes
- inconsistent error context (`domain`, `sequence`, `job`, `source`)
- weak alertability for queue incidents

This PRD narrows scope to one priority: **error tracking primarily via PostHog**.

## Goals

1. Capture uncaught exceptions in Express via PostHog exception autocapture + Express error handler.
2. Capture caught exceptions in `catch` blocks across all in-scope queue surfaces using controlled completeness.
3. Normalize error payload shape across all queue components.
4. Keep existing `logger.error` calls, but treat PostHog as the primary incident-tracking surface.
5. Avoid sending sensitive data.

## Non-Goals

- Broad product analytics or funnel instrumentation
- Replacing Mongo logs entirely
- Distributed tracing across services
- Refactoring queue business logic beyond instrumentation hooks

## Scope

In-scope files/surfaces:

- Startup/lifecycle:
    - `apps/queue/src/index.ts`
    - `apps/queue/src/start-email-automation.ts`
    - `apps/queue/src/db.ts`
- Core processors:
    - `apps/queue/src/domain/process-rules.ts`
    - `apps/queue/src/domain/process-drip.ts`
    - `apps/queue/src/domain/process-ongoing-sequences/index.ts`
    - `apps/queue/src/domain/process-ongoing-sequences/process-ongoing-sequence.ts`
- Bull workers:
    - `apps/queue/src/domain/worker.ts`
    - `apps/queue/src/notifications/worker/notification.ts`
    - `apps/queue/src/notifications/worker/dispatch-notification.ts`
- API routes:
    - `apps/queue/src/job/routes.ts`

Out-of-scope (for this PRD):

- Success/throughput event taxonomy for all workflows
- Frontend or `apps/web` PostHog work

## Proposed Solution

Add a small observability module for PostHog Node SDK with two capture paths:

- automatic capture for uncaught Express exceptions
- manual capture for caught exceptions in in-scope `catch` blocks

### Implementation shape

1. Add `posthog-node` to `apps/queue`.
2. Add `apps/queue/src/observability/posthog.ts` with:
    - singleton PostHog client
    - no-op behavior when `POSTHOG_API_KEY` is not set
    - initialize with `enableExceptionAutocapture: true`
    - expose `captureError(...)` that calls `posthog.captureException(...)`
3. Wire Express integration in `apps/queue/src/index.ts`:
    - call `setupExpressErrorHandler(posthog, app)` only when PostHog is enabled
    - keep this after routes/middlewares are registered
4. For Express routes with `try/catch`, add manual capture in route-level catch blocks:
    - keep `logger.error(err)`
    - call `captureError({ error, source, context })` before sending response
5. Keep `setupExpressErrorHandler` for uncaught Express exceptions not handled in route-level `catch` blocks.
6. For non-Express surfaces (workers/loops/db/startup), add dual logging in `catch` blocks:
    - keep `logger.error(err)`
    - call `captureError({ error, source, context })`
7. Apply controlled completeness policy in `captureError(...)`:
    - dedupe key: `source + error_name + error_stack_top`
    - dedupe window: 60 seconds
    - per-source cap: `POSTHOG_ERROR_CAP_PER_SOURCE_PER_MINUTE` events/minute (default `100`, counter-reset each minute)

### Runtime Dedupe Spec

`captureError(...)` dedupes inside each queue process as follows:

1. Sanitize and normalize error fields first (`error_message`, `error_stack_top`, context).
2. Build fingerprint: `source + error_name + error_stack_top`.
3. Check in-memory TTL cache for this fingerprint (TTL: 60s).
4. If fingerprint is not present, send `posthog.captureException(...)` and store fingerprint with expiry.
5. If fingerprint is present, suppress PostHog send.
6. Apply per-source cap after dedupe decision: max `POSTHOG_ERROR_CAP_PER_SOURCE_PER_MINUTE` sends/min/source (default `100`). Over-cap sends are dropped from PostHog but still written to `logger.error`.
7. Bound dedupe cache to 10,000 fingerprints per process; if limit is reached, clear the cache before inserting new entries.

Scope note:

- Dedupe is process-local (per pod/instance). Duplicate exceptions across multiple instances may still be captured.
- Cross-instance dedupe is out of scope for this version.

## Environment Variables

- `POSTHOG_API_KEY`: optional; when present, PostHog is enabled
- `POSTHOG_HOST`: optional (defaults to PostHog cloud host)
- `POSTHOG_ERROR_CAP_PER_SOURCE_PER_MINUTE`: optional; per-source exception send cap per minute (default `100`)
- `DEPLOY_ENV`: optional; explicit deployment environment label for telemetry events (recommended)

## Error Payload Contract

Primary capture method:

- `posthog.captureException(error, distinctId, properties)`
- plus PostHog exception autocapture for uncaught/unhandled exceptions
- `distinctId` should be `domain_id` for all events
- when tenant context is unavailable (startup/db/global uncaught), use `domain_id = "system"` and set `distinctId = "system"`

Common properties:

- `service`: `courselit:queue`
- `environment`
- `source` (code location identifier)
- `domain_id` (required)
- `severity`: `error | warning | critical`
- `error_name`
- `error_message`
- `error_stack_top` (first stack frame only)
- `sequence_id` (optional)
- `user_id` (optional)
- `job_id` (optional)
- `queue_name` (optional)

Environment resolution:

- `environment = process.env.DEPLOY_ENV || "unknown"`

## Instrumentation Matrix

Auto-captured sources:

- `express.uncaught`

Manual capture should be added in `catch` blocks for all in-scope surfaces listed above.
Unhandled route exceptions should be captured via `setupExpressErrorHandler`.
When tenant context is missing in any capture path, set `domain_id = "system"`.

## Privacy and Safety

Must never send:

- email HTML/body
- recipient email addresses
- JWT/pixel tokens
- raw request bodies

Redaction and size limits:

- truncate `error_message` to 500 characters
- truncate `error_stack_top` to 300 characters
- mask token-like substrings and email-like substrings in free-text fields
- allowlist context keys; drop unknown keys

Reliability requirement:

- PostHog capture must be best-effort and non-blocking.
- Errors in capture pipeline must never fail queue processing paths.

Allowed identifiers:

- `domain_id`, `sequence_id`, `user_id`, `job_id`, `activity_type`

## Dashboards and Alerts (PostHog)

Required dashboards:

1. Error volume by `source` (last 24h/7d)
2. Error volume by `severity`
3. Error volume by `environment`

Required alerts:

- total exception events > 50 in 10 minutes (per environment)
- critical exception events > 20 in 10 minutes (production)
- no exception events for long periods should **not** alert (absence is normal)

## Implementation Plan

### Phase 1: Foundation

- Add dependency and PostHog wrapper.

### Phase 2: Error Capture Rollout

- Add `captureError` to `catch` blocks in all in-scope surfaces.
- Add manual route-level catch capture in `apps/queue/src/job/routes.ts`.
- Keep uncaught Express route coverage via `setupExpressErrorHandler`.
- Standardize `source` and context properties.
- Add dedupe and per-source rate limiting in helper.

### Phase 3: Validation and Production Rollout

- Enable in staging.
- Validate property schema and privacy constraints.
- Enable in production with alerts.

## Testing Plan

- Unit tests for wrapper:
    - no-op when `POSTHOG_API_KEY` is missing
    - `captureException` call shape when `POSTHOG_API_KEY` is present
    - client is created with `enableExceptionAutocapture: true`
    - dedupe and rate-limit behavior
    - cache bound behavior when dedupe cache reaches limit
    - capture failures are swallowed (non-throwing)
- Update/add tests for queue error paths where feasible:
    - route validation/runtime failures in `catch` call `captureError(...)`
    - worker failure path calls `captureError(...)`
    - sequence processing failure calls `captureError(...)`
    - startup/db/global failures without tenant context use `domain_id = "system"`
- Manual staging checks:
    - trigger one synthetic failure per major source
    - verify exception appears with expected `source` and context
    - verify Express errors are captured by `setupExpressErrorHandler`
    - verify handled route errors are captured (duplicates are acceptable)

## Acceptance Criteria

1. When `POSTHOG_API_KEY` is set, uncaught Express exceptions are captured via `setupExpressErrorHandler`.
2. Handled exceptions in route `catch` blocks are captured via `captureError(...)`.
3. Manual capture in non-Express `catch` blocks follows controlled completeness policy.
4. Exception events are deduped and rate-limited as defined.
5. Event payload follows the defined contract.
6. Exceptions without tenant context are captured with `domain_id = "system"` and `distinctId = "system"`.
7. No sensitive fields are observed in sampled production/staging events.
8. Existing queue behavior is unchanged apart from instrumentation.

## Risks and Mitigations

- Missing catch boundaries:
    - Mitigation: source checklist + code review gate.
- High volume in noisy loops:
    - Mitigation: hard dedupe window and per-source rate limit.

## Deferred Work (Optional Phase 2)

If needed later, add a limited set of non-error operational events (e.g. loop heartbeat, worker success counters). This is intentionally deferred to keep current scope focused on error tracking.

## Open Questions

1. Should user identifiers be hashed in PostHog from day one?
2. Which team owns alert tuning after production rollout?
3. Do we require a separate PostHog project per environment?
