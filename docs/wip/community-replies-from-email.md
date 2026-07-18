# Issue #811 — Enhanced conversation email notifications & reply-by-email

## Context

GitHub issue [#811](https://github.com/codelitdev/courselit/issues/811): notification emails for Community Discussions and Product Discussions are today one-line summaries ("X commented on your post 'Y' in Z") with a "View notification" button — no comment content, no thread context. The issue asks for:

1. **Richer notification emails** — author, thread title, parent-comment context, the comment content itself, and a clear CTA.
2. **Reply-by-email** — reply tokens embedded in the Reply-To address on a dedicated reply domain; inbound provider webhooks (vendor-agnostic: SES, Postmark, Mailgun, SendGrid) post replies back into the right thread, attributed to the right user, quoted text stripped, participants notified as usual.

MVP out of scope: attachments, rich HTML reply parsing, email reactions, advanced threading.

## Verified architecture facts

- **Pipeline**: `recordActivity()` (`apps/web/lib/record-activity.ts`) → JWT POST to queue app → `dispatch-notification` BullMQ worker (`apps/queue/src/notifications/worker/dispatch-notification.ts`) fans out per `metadata.forUserIds` gated by `NotificationPreferenceModel` → `AppChannel` / `EmailChannel` → `mail` queue → nodemailer SMTP.
- **`EmailChannel`** (`apps/queue/src/notifications/services/channels/email.ts`): calls `getNotificationMessageAndHref()` (`packages/common-logic/src/utils/get-notification-message-and-href.ts`), builds email via `buildNotificationEmailTemplate()` (`apps/queue/src/notifications/services/channels/notification-email-template.ts`), passes arbitrary `headers` to `addMailJob` (already sets `List-Unsubscribe`) — so `Reply-To` needs no mail-pipeline changes.
- **The queue already re-fetches entities at send time** via `createNotificationEntityResolver()` (`packages/common-logic/src/utils/notification-entity-resolver.ts`, lazy mongoose models from `@courselit/orm-models`); `getComment()` already returns comment content, postId, communityId, and embedded replies with content. Verified.
- **Community**: comment/reply content is a **plain string**; `postComment()` (`apps/web/graphql/communities/logic.ts:1686`) handles both comment and reply, enforcing membership + `MembershipRole.COMMENT`, auto-subscribe, and `recordActivity`.
- **Product discussions** (separate collections): content is `TextEditorContent`; `createDiscussionComment()`/`createDiscussionReply()` (`apps/web/graphql/product-discussions/logic.ts`) enforce enrollment, content validation, and rate limits. Converters already exist and are verified: `normalizeTextEditorContent` / `extractTextFromTextEditorContent` in `@courselit/utils`.
- Both create-functions need only a synthesized `GQLContext` `{ user, subdomain, address }` (`apps/web/models/GQLContext.ts`) — an inbound handler reuses them wholesale, inheriting all permission checks, rate limits, subscriptions, and notification fan-out.
- **Constraint**: RFC 5321 caps the email local-part at 64 octets → a JWT cannot fit in Reply-To → opaque DB token (precedent: `DownloadLinkSchema` with TTL in orm-models).
- Tenant for inbound webhooks must come from the token (providers post to one shared URL; the `proxy.ts` domain header is host-based).
- Tests: jest + `@shelf/jest-mongodb` in both `apps/web` and `apps/queue`; reference: `apps/web/graphql/communities/__tests__/logic.test.ts` (node env, real in-memory-Mongo models, `jest.mock("@/services/queue")`).

---

## Phase 1 — Richer emails (Part A, independently shippable — tracked as [#825](https://github.com/codelitdev/courselit/issues/825))

**Decision: re-fetch content in the queue worker (thin metadata)** — the resolver pattern already exists and fetches comment content; zero changes to `recordActivity` callers, no payload bloat in Redis, no stale content. The APP channel stays byte-for-byte unchanged.

**Constraint: content richness is per-channel.** The in-app notification panel must stay compact (current one-liners with `truncate(20)` titles) to avoid bloating the UI — only emails get the full content blocks. This falls out of the design: the panel/APP channel keeps `getNotificationMessageAndHref()` as-is; only `EmailChannel` adopts `getNotificationEmailContent()`.

1. **Extend `NotificationEntityResolver`** (`packages/common-logic/src/utils/notification-entity-resolver.ts`) with optional `getDiscussionComment(commentId, domainId)` and `getDiscussionReply(replyId, domainId)` using the same lazy-model pattern with product-discussion schemas from orm-models. Also add `content: 1` to the `getPost()` projection (community post `content` is `TextEditorContent | string` — handle both when extracting text).
2. **New `packages/common-logic/src/utils/get-notification-email-content.ts`** (export from the barrel):
    - Returns `NotificationEmailContent { subject, message, href, commentText?, parentText?, parentAuthorName?, threadTitle?, replyContext? }`.
    - Internally calls `getNotificationMessageAndHref()` for `message`/`href` (single source of truth).
    - Populates extras only for the five conversation activity types:
        - `COMMUNITY_POST_CREATED` — post body excerpt (string or via `extractTextFromTextEditorContent`) + post title; `replyContext.community = { communityId, postId }` (no `parentCommentId` — an email reply becomes a top-level comment on the post).
        - `COMMUNITY_COMMENT_CREATED` — comment content + post title; `replyContext.community = { communityId, postId, parentCommentId: entityId }`.
        - `COMMUNITY_REPLY_CREATED` — reply content, parent (reply or comment) excerpt; `replyContext.community = { …, parentCommentId: commentId, parentReplyId: replyId }`.
        - `COURSE_DISCUSSION_COMMENT_CREATED` (eventType comment_created | reply_created) — content via `extractTextFromTextEditorContent`; course title; `replyContext.product = { productId, entityType, entityId, commentId, parentReplyId? }`.
    - Caps: commentText ~1000 chars, parentText ~200 chars. Optional `resolveUserName(userId)` callback for parent-author names (queue passes a UserModel lookup).
    - All other activity types: output identical to today.
    - `ReplyByEmailContext` = thread coordinates consumed by Phase 2 token minting.
3. **Extend the template** (`apps/queue/src/notifications/services/channels/notification-email-template.ts`): parent-context block (small gray "In reply to X: …"), comment-body block (15px, line breaks preserved — verify markdown hard-break behavior in `renderEmailToHtml`), CTA text "View discussion" for conversation types, and a "You can reply to this email to respond directly" footer only when reply-by-email is active. All content through the existing `encodePlainTextForMarkdown`.
4. **Wire `EmailChannel`** (`apps/queue/src/notifications/services/channels/email.ts:30`): swap `getNotificationMessageAndHref` → `getNotificationEmailContent`; pass new fields to the template; subject = `content.subject`.
    - **Subject strategy**: keep `subject = one-line message` (actor + action + truncated title — good inbox scanability). Alternative `Re: "<title>"` for mail-client threading noted; can revisit.

## Phase 2 — Reply tokens + Reply-To (Part B)

**Decision: opaque DB token** (an HMAC `id.sig` scheme can't fit the thread coordinates in 64 octets anyway). 20 random bytes → 32-char string; `reply+<token>` ≈ 38 octets.

5. **New schema `packages/orm-models/src/models/email-reply-token.ts`** (mirror `download-link.ts`, export from index):
    - `{ domain, token (unique), userId, kind: "community"|"product", community?: {communityId, postId, parentCommentId?, parentReplyId?}, product?: {productId, entityType, entityId, commentId, parentReplyId?}, contextKey, expiresAt (TTL index), createdAt }` (`parentCommentId` absent = reply targets the post itself as a top-level comment).
    - Unique index `{ domain, userId, contextKey }` (precomputed context string) → minting is an idempotent upsert.
    - Model registrations: `apps/queue/src/domain/model/email-reply-token.ts` and `apps/web/models/EmailReplyToken.ts`.
6. **Minting service `apps/queue/src/notifications/services/email-reply-token.ts`**:
    - `mintReplyToken({ domainId, userId, context })` — upsert, sliding 30-day `expiresAt`, returns token.
    - `isReplyByEmailEnabled()` = `!!process.env.INBOUND_EMAIL_DOMAIN`; `buildReplyToAddress(token)` = `` `reply+${token}@${INBOUND_EMAIL_DOMAIN}` ``.
    - In `EmailChannel.send`: when `replyContext` exists and feature enabled, add `"Reply-To"` to the existing headers object. Env absent → no Reply-To, everything else identical (self-hosters unaffected). Tokens are multi-use (standard reply-address semantics).
7. **Env vars**: `INBOUND_EMAIL_DOMAIN` (queue + web; presence = feature on), `INBOUND_EMAIL_WEBHOOK_SECRET` (web), `MAILGUN_WEBHOOK_SIGNING_KEY` (web, optional). TTL is a constant (30 d), not env.

## Phase 3 — Inbound endpoint + provider abstraction (Part C)

8. **Adapter layer, new dir `apps/web/lib/inbound-email/`**:
    - `types.ts` — `NormalizedInboundEmail { to[], from, subject?, textBody, strippedReply?, messageId? }`; `InboundEmailAdapter { provider, verify({rawBody, headers, searchParams}), parse({rawBody, contentType}) }`.
    - `providers/postmark.ts` (JSON; `StrippedTextReply`), `providers/mailgun.ts` (form-encoded; `stripped-text`; HMAC of timestamp+token with signing key + 5-min freshness = replay protection), `providers/sendgrid.ts` (multipart, phase 3b), `providers/index.ts` registry.
    - **SES deferred** (needs SNS confirmation handling + S3 body fetch; the interface accommodates it later). Order: Postmark → Mailgun → SendGrid → SES.
    - `extract-reply-text.ts` — provider `strippedReply` when present, else `email-reply-parser` npm fallback on `textBody`; trim + 5000-char cap. (Add dep to `apps/web/package.json`.)
9. **Processing pipeline `apps/web/lib/inbound-email/process-inbound-email.ts`** — returns `{ok:true} | {ok:false, reason}`:
    1. Find `reply+<token>@$INBOUND_EMAIL_DOMAIN` among recipients → else `no_reply_address`.
    2. Token lookup + expiry check → `invalid_token`.
    3. Load Domain (from token) + `User.findOne({ domain, userId: token.userId, active: true })`.
    4. **Sender check**: parsed From must equal `user.email` (case-insensitive) → `sender_mismatch` (token possession alone is insufficient — emails get forwarded).
    5. Extract reply text → `empty_reply` if blank.
    6. Rate limit via existing `assertRateLimit` (`apps/web/lib/assert-rate-limit.ts`), key `inbound-email:<domain>:<userId>`.
    7. Synthesize `ctx = { user, subdomain: domain, address: "" }`; dispatch:
        - community → `postComment({ ctx, communityId, postId, content: replyText, parentCommentId?, parentReplyId? })` (no `parentCommentId` in token → top-level comment on the post)
        - product → `createDiscussionReply({ ctx, productId, entityType, entityId, commentId, parentReplyId, content: normalizeTextEditorContent(replyText) })`
        - All checks (membership, enrollment, deleted content, rate limits) re-enforced inside; `recordActivity` inside → participants re-notified as usual.
    8. Thrown errors → logged rejection. **Policy: silent drop with logging, no bounce emails** (bounces leak info and can loop); courtesy-failure email is a future enhancement.
10. **Route `apps/web/app/api/inbound-email/[provider]/route.ts`**:
    - `POST`; `await req.text()` first (raw body for HMAC — deliberately better than the payment-webhook precedent, which skips real verification).
    - Check `INBOUND_EMAIL_WEBHOOK_SECRET` (query param / basic auth) → 401 on mismatch; unknown provider → 404.
    - `adapter.verify()` → `adapter.parse()` → `processInboundEmail()`.
    - **Always 200 after auth passes** (even on rejection) so providers don't retry-loop; log reasons via `@/services/logger`. Ignores the `domain` header — tenant comes from the token. Confirm `proxy.ts` passes this path through for the apex hostname.

## Phase 4 — Docs

11. Document env vars + provider setup (reply-domain MX → provider inbound → webhook URL) in `docs/` and the self-hosting env reference.

---

## Decisions taken (flag if you disagree)

| Decision                    | Choice                                                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content enrichment location | Queue-side re-fetch via existing resolver (no metadata changes)                                                                                                                                                         |
| Token format                | Opaque DB token, 30-day sliding TTL, multi-use per (recipient, thread position)                                                                                                                                         |
| Provider order              | Postmark → Mailgun → SendGrid → SES (first two ship pre-stripped reply text)                                                                                                                                            |
| Subject line                | Keep one-line summary as subject (vs `Re: "<title>"`)                                                                                                                                                                   |
| Per-channel sizing          | Notification panel stays compact (unchanged one-liners); only email shows full content blocks                                                                                                                           |
| Rejection UX                | Silent drop + server log; no bounce emails in MVP                                                                                                                                                                       |
| Rich treatment scope        | 5 conversation activity types: `COMMUNITY_POST_CREATED` (post body excerpt; email reply → top-level comment), the 2 community comment/reply types, and `COURSE_DISCUSSION_COMMENT_CREATED` (comment + reply eventTypes) |

## Verification

- **Unit**: `getNotificationEmailContent` with a stub resolver (one test per conversation type + one non-conversation type asserting unchanged output); template block presence/absence tests; token-minting idempotency + disabled-env tests (queue jest); `process-inbound-email` tests modeled on `communities/__tests__/logic.test.ts` — happy paths (community + product), expired token, sender mismatch, empty reply, non-member; adapter parse/verify tests with fixture payloads (`__tests__/fixtures/{postmark,mailgun}.json`).
- **E2E local**: run web + queue with a dev SMTP inbox; post a comment in the UI → inspect rich email + Reply-To header; then simulate inbound:
    ```
    curl -X POST "http://localhost:3000/api/inbound-email/postmark?secret=$INBOUND_EMAIL_WEBHOOK_SECRET" \
      -H 'Content-Type: application/json' -d @fixtures/postmark.json
    ```
    (fixture `To` = minted `reply+<token>@…`, `From` = recipient email) → verify the reply appears in the thread and re-notification fires.
- Run existing suites in `apps/web` and `apps/queue` to catch regressions.
