# Drip Hardening Gaps And Roadmap

## Context

This document captures the current missing pieces in drip functionality (queue + web integration), focused on scalability, maintainability, and industry-standard operational behavior.

Date: 2026-03-21  
Scope:

- `apps/queue/src/domain/process-drip.ts`
- `apps/queue/src/domain/queries.ts`
- `apps/web/graphql/courses/logic.ts`

This list reflects remaining open hardening gaps on the current branch.
Last updated after:

- Domain-scoped membership query contract in queue drip flow.
- Regression test coverage for domain-scoped membership lookup and multi-group drip email behavior.

## 1) Duplicate Emails In Horizontal Scale (Critical)

Current behavior:

- Multiple queue instances can execute `processDrip()` concurrently.
- They can compute same unlocked groups and queue duplicate emails.
- User progress update is idempotent (`$addToSet`), email queueing is not.

Impact:

- Duplicate notifications to learners.
- Hard-to-debug race conditions.

Recommendation:

- Add distributed lock for drip worker cycle (Redis lock / BullMQ job lock / leader election).
- Add idempotency key for drip emails (for example: `drip:<domain>:<course>:<user>:<group>`).

Acceptance criteria:

- Running N workers concurrently does not create duplicate drip emails for same user/group release event.

## 2) Non-Atomic Unlock + Notify Flow (High)

Current behavior:

- Unlock state is written first, email queueing happens afterwards.
- If email enqueue fails, unlock succeeds but notification may be partially/fully lost.

Impact:

- Inconsistent learner communication.
- No deterministic retry for missed notifications.

Recommendation:

- Introduce outbox pattern:
    - Persist release events atomically with unlock update.
    - Separate reliable sender consumes outbox with retries and idempotency.

Acceptance criteria:

- If queue/email subsystem is down temporarily, unlock notifications are eventually delivered without duplicates.

## 3) Full Polling + In-Memory Expansion (High)

Current behavior:

- Every minute:
    - loads all courses with drip,
    - loads memberships per course,
    - loads users per course,
    - loops in application memory.

Impact:

- High DB load and memory pressure as tenants/courses/users scale.
- Runtime grows with total data size, not just due work.

Recommendation:

- Move to due-work driven execution:
    - precompute next drip due per user/course purchase, or
    - enqueue per-user drip check jobs at enrollment/release events.
- Use cursor/batch processing where full scan remains necessary.

Acceptance criteria:

- Runtime and DB pressure scale roughly with due drip events, not total historical volume.

## 4) Missing/Weak Indexing For Drip Query Paths (Medium)

Current behavior:

- Frequent query shapes in drip path do not have explicit compound indexes aligned to usage.

Primary candidates:

- `Membership`: `(domain, entityType, entityId, status, userId)`
- `User`: `(domain, userId)` (for bulk lookup by userIds in a domain)
- `Course`: if keeping scan approach, index around drip-enabled groups and domain as feasible.

Impact:

- Degraded throughput and elevated DB CPU at scale.

Recommendation:

- Add and validate compound indexes for hot predicates.
- Run explain plans before/after.

Acceptance criteria:

- Explain plans avoid broad collection scans for hot drip queries.

## 5) Rank Reorder Semantics For Relative Drip (Medium)

Current behavior:

- Relative drip is rank-ordered each run.
- If groups are reordered after enrollments, in-flight learner release path changes.

Impact:

- Learner-facing release schedule may shift unexpectedly.
- Support burden and potential trust issues.

Recommendation (choose one explicit product policy):

- Policy A (simple): lock relative rank editing once enrollments exist.
- Policy B (robust): persist per-user drip cursor/snapshot so future rank changes affect only new learners (or only after explicit migration).

Acceptance criteria:

- Reordering behavior is deterministic and documented.

## 6) Multi-Email Burst For Same-Run Unlocks (Medium)

Current behavior:

- If multiple groups unlock in one run and each has drip email configured, user gets multiple emails.

Impact:

- Notification fatigue.

Recommendation:

- Add configurable notification policy:
    - `per_group` (current),
    - `digest_per_run` (recommended default for larger schools).
- If digest enabled, provide editable digest template with localization strategy.

Acceptance criteria:

- Multi-unlock runs follow configured policy and are test-covered.

## 7) Data Validation Hardening For Drip Inputs (Medium)

Current behavior:

- Some server-side constraints are implicit/incomplete (for example, exact-date vs relative-date required fields).

Impact:

- Invalid drip configs can be stored and silently skipped.

Recommendation:

- Enforce stricter validation in `updateGroup`:
    - `relative-date` requires numeric `delayInMillis >= 0`,
    - `exact-date` requires valid numeric `dateInUTC`,
    - optional sanity checks for email schema consistency.

Acceptance criteria:

- Invalid drip payloads are rejected with explicit errors.

## 8) Observability Gaps For Release Lifecycle (Medium)

Current behavior:

- Error capture exists, but release lifecycle visibility is limited.

Recommendation:

- Add structured counters/events:
    - `drip_courses_scanned`
    - `drip_users_evaluated`
    - `drip_groups_unlocked`
    - `drip_emails_queued`
    - `drip_emails_failed`
    - `drip_loop_duration_ms`
- Add per-domain dimensions where safe.

Acceptance criteria:

- Can answer: "How many unlocks and drip emails happened per domain/day and failure rate?"

## 9) Test Coverage Still Missing For Some Hard Cases (Medium)

Current behavior:

- Unit-level coverage has improved significantly, but concurrency/idempotency/outbox/reorder-policy and digest policy are not covered yet.

Recommendation:

- Add tests for:
    - concurrent worker execution idempotency,
    - outbox retry semantics,
    - rank reorder policy behavior,
    - digest mode behavior.

Acceptance criteria:

- Regression suite catches duplicate-email races and policy regressions.

## Proposed Implementation Plan

## Phase 1 (P0 - Safety)

- Add strict drip input validation in `updateGroup`.
- Add key indexes for hot query paths.
- Add release metrics counters.

## Phase 2 (P1 - Correctness Under Scale)

- Introduce distributed locking for drip worker cycle.
- Add email idempotency key to avoid duplicate sends.

## Phase 3 (P1/P2 - Reliability)

- Implement outbox for unlock-notification events.
- Add sender worker retry + dead-letter handling.

## Phase 4 (P2 - Product Policy)

- Decide and implement rank-reorder semantics for relative drip.
- Add digest mode and editable template/localization design.

## Suggested Ownership Split

- Queue worker correctness/scalability: `apps/queue`
- GraphQL validation + admin constraints: `apps/web/graphql`
- Schema/index migrations: `packages/common-logic`, `packages/orm-models`, migration scripts
- Metrics/dashboarding: observability owner

## Decision Log Needed

Before implementation, confirm:

- Reorder policy for in-flight learners (lock vs cursor snapshot).
- Email policy for multi-unlock runs (per-group vs digest).
- Preferred reliability model (direct enqueue with idempotency vs outbox).

## References

- `apps/queue/src/domain/process-drip.ts`
- `apps/queue/src/domain/queries.ts`
- `apps/web/graphql/courses/logic.ts`
- `apps/queue/src/domain/__tests__/process-drip.test.ts`
- `apps/web/graphql/courses/__tests__/update-group-drip.test.ts`
