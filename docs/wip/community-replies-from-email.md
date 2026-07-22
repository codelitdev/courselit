# Issue #811 — Enhanced conversation email notifications & reply-by-email

## Context

GitHub issue [#811](https://github.com/codelitdev/courselit/issues/811): before Phase 1, notification emails for Community Discussions and Product Discussions were one-line summaries ("X commented on your post 'Y' in Z") with a "View notification" button — no comment content or thread context. The issue asks for:

1. **Richer notification emails** — author, thread title, parent-comment context, the comment content itself, and a clear CTA.
2. **Reply-by-email** — reply tokens embedded in the Reply-To address on a dedicated reply domain; inbound provider adapters for Amazon SES, Postmark, Mailgun, and later SendGrid post replies back into the right thread, attributed to the right user, quoted text stripped, participants notified as usual.

MVP out of scope: attachments, rich HTML reply parsing, email reactions, advanced threading.

## Implementation status

- **Phase 1 is implemented and verified.** Conversation emails now include the actor, activity label, thread title, relevant thread context, new content, and a discussion CTA. The in-app notification channel remains compact and unchanged.
- **Phase 2 is implemented and browser-verified.** Conversation emails conditionally mint reusable opaque reply tokens, add a validated `Reply-To` header, and show the direct-reply hint when `INBOUND_EMAIL_DOMAIN` is configured. The feature remains disabled when the variable is absent.
- **Phases 3–4 are implemented.** Amazon SES, Postmark, and Mailgun callbacks are authenticated, normalized, and processed through the existing discussion mutations. Operational configuration guides are published in both documentation sites. SendGrid remains a separate Phase 3b follow-up.

## Verified architecture facts

- **Pipeline**: `recordActivity()` (`apps/web/lib/record-activity.ts`) → JWT POST to queue app → `dispatch-notification` BullMQ worker (`apps/queue/src/notifications/worker/dispatch-notification.ts`) fans out per `metadata.forUserIds` gated by `NotificationPreferenceModel` → `AppChannel` / `EmailChannel` → `mail` queue → nodemailer SMTP.
- **`EmailChannel`** (`apps/queue/src/notifications/services/channels/email.ts`): calls `getNotificationEmailContent()` (`packages/common-logic/src/utils/get-notification-email-content.ts`), which delegates compact subject/URL generation to `getNotificationMessageAndHref()` as the single source of truth. It builds email via `buildNotificationEmailTemplate()` (`apps/queue/src/notifications/services/channels/notification-email-template.ts`) and passes arbitrary `headers` to `addMailJob` (already sets `List-Unsubscribe`) — so `Reply-To` needs no mail-pipeline changes.
- **The queue re-fetches entities at send time** via `createNotificationEntityResolver()` (`packages/common-logic/src/utils/notification-entity-resolver.ts`, lazy mongoose models from `@courselit/orm-models`). Community posts/comments and product-discussion comments/replies are filtered with `deleted: false`, and deleted embedded community replies are removed before email content is derived.
- **Resolver calls are cached per email.** `getNotificationEmailContent()` wraps the resolver in a request-scoped promise cache keyed by entity type, domain, and ID. Subject/URL generation and rich-body generation therefore share fetched entities without introducing a cross-notification cache or stale data.
- **Community**: comment/reply content is a **plain string**; `postComment()` (`apps/web/graphql/communities/logic.ts:1686`) handles both comment and reply, enforcing membership + `MembershipRole.COMMENT`, auto-subscribe, and `recordActivity`.
- **Product discussions** (separate collections): content is `TextEditorContent`; `createDiscussionComment()`/`createDiscussionReply()` (`apps/web/graphql/product-discussions/logic.ts`) enforce enrollment, content validation, and rate limits. `extractTextFromTextEditorContent()` in `@courselit/utils` now preserves document paragraphs (`\n\n`), hard breaks (`\n`), and list boundaries by default. Presentation consumers retain those boundaries; validation/previews trim boundary whitespace; duplicate-content fingerprints normalize Unicode and collapse whitespace so formatting changes cannot bypass rate limiting.
- **Reply coordinates are shared types.** `ReplyByEmailContext` lives in `packages/common-models/src/email-reply-context.ts`; the product coordinate uses `ProductDiscussionEntityType` rather than an unbounded string.
- Both create-functions need only a synthesized `GQLContext` `{ user, subdomain, address }` (`apps/web/models/GQLContext.ts`) — an inbound handler reuses them wholesale, inheriting all permission checks, rate limits, subscriptions, and notification fan-out.
- **Constraint**: RFC 5321 caps the email local-part at 64 octets → a JWT cannot fit in Reply-To → opaque DB token (precedent: `DownloadLinkSchema` with TTL in orm-models).
- Tenant for inbound webhooks must come from the token (providers post to one shared URL; the `proxy.ts` domain header is host-based).
- Tests: jest + `@shelf/jest-mongodb` in both `apps/web` and `apps/queue`; reference: `apps/web/graphql/communities/__tests__/logic.test.ts` (node env, real in-memory-Mongo models, `jest.mock("@/services/queue")`).

---

## Phase 1 — Richer emails (Part A, independently shippable — tracked as [#825](https://github.com/codelitdev/courselit/issues/825))

**Status: implemented.**

**Decision: re-fetch content in the queue worker (thin metadata)** — the resolver pattern already exists and fetches comment content; zero changes to `recordActivity` callers, no payload bloat in Redis, no stale content. The APP channel stays byte-for-byte unchanged.

**Constraint: content richness is per-channel.** The in-app notification panel must stay compact (current one-liners with `truncate(20)` titles) to avoid bloating the UI — only emails get the full content blocks. This falls out of the design: the panel/APP channel keeps `getNotificationMessageAndHref()` as-is; only `EmailChannel` adopts `getNotificationEmailContent()`.

1. **Extended `NotificationEntityResolver`** (`packages/common-logic/src/utils/notification-entity-resolver.ts`) with optional `getDiscussionComment(commentId, domainId)` and `getDiscussionReply(replyId, domainId)` using the same lazy-model pattern with product-discussion schemas from orm-models. The community post projection includes `content`; post, comment, and reply lookups suppress soft-deleted content.
2. **Added `packages/common-logic/src/utils/get-notification-email-content.ts`** (exported from the barrel):
    - Returns `NotificationEmailContent { subject, message, href, commentText?, parentText?, parentAuthorName?, parentLabel?, threadTitle?, conversationLabel?, replyContext? }`.
    - Internally calls `getNotificationMessageAndHref()` for `message`/`href` (single source of truth).
    - Populates extras only for the five conversation activity types:
        - `COMMUNITY_POST_CREATED` — `New post`, post body excerpt (plain string or `TextEditorContent`) + post title; `replyContext.community = { communityId, postId }` (no `parentCommentId` — an email reply becomes a top-level comment on the post).
        - `COMMUNITY_COMMENT_CREATED` — `New comment`, comment content + post title, plus the original post excerpt and author in a gray context block labeled `Original post`; `replyContext.community = { communityId, postId, parentCommentId: entityId }`.
        - `COMMUNITY_REPLY_CREATED` / `COMMUNITY_COMMENT_REPLIED` — `New reply`, reply content plus the active parent reply/comment excerpt and author in a gray context block labeled `Earlier comment`; `replyContext.community = { …, parentCommentId: commentId, parentReplyId: replyId }`.
        - `COURSE_DISCUSSION_COMMENT_CREATED` (`eventType: comment_created | reply_created`) — `New comment` or `New reply`, rich-text content + course title. Replies include their active parent comment/reply context. `replyContext.product = { productId, entityType, entityId, commentId, parentReplyId? }`.
    - Exact caps: `commentText` 1000 characters and `parentText` 200 characters. Optional `resolveUserName(userId)` resolves context-author names; the queue passes a domain-scoped `UserModel` lookup.
    - All other activity types: output identical to today.
    - `ReplyByEmailContext` contains thread coordinates consumed by Phase 2 token minting.
3. **Extended the template** (`apps/queue/src/notifications/services/channels/notification-email-template.ts`): actor/activity header, 18px thread title, gray context block with an explicit label (`Original post` or `Earlier comment`), 16px new-content block, preserved line breaks, and CTA text `View discussion` for conversation types. Dynamic content is encoded through `encodePlainTextForMarkdown`. The reply-by-email hint exists behind `showReplyByEmailHint` but is not enabled until Phase 2 supplies a working `Reply-To` address.
4. **Wired `EmailChannel`** (`apps/queue/src/notifications/services/channels/email.ts`): replaced its direct `getNotificationMessageAndHref()` call with `getNotificationEmailContent()`, passes the rich content/context fields to the template, resolves context-author names within the current domain, and uses `content.subject` as the email subject.
    - **Subject strategy**: keep `subject = one-line message` (actor + action + truncated title — good inbox scanability). Alternative `Re: "<title>"` for mail-client threading noted; can revisit.

**Supporting rich-text refactor:** `extractTextFromTextEditorContent()` is now the single structure-preserving plain-text extractor used by emails, moderation previews, validation, and discussion fingerprints. Fingerprints deliberately canonicalize the extracted output (`NFKC`, trim, lowercase, collapse whitespace), keeping duplicate detection insensitive to paragraph-only formatting differences while avoiding accidental `Hello` + `world` → `Helloworld` collisions.

## Phase 2 — Reply tokens + Reply-To (Part B)

**Status: implemented and browser-verified.**

**Decision: opaque DB token** (an HMAC `id.sig` scheme can't fit the thread coordinates in 64 octets anyway). 20 random bytes encoded as unpadded base64url → 27 characters; `reply+<token>` is 33 octets, below the RFC 5321 64-octet local-part limit.

**Provider boundary:** Phase 2 is provider-neutral: it mints the token and emits the `Reply-To` address, but does not ingest the resulting email. Phase 3 initially ships Amazon SES, Postmark, and Mailgun adapters so a Phase 2 address has a complete inbound path. SendGrid follows as Phase 3b.

5. **New schema `packages/orm-models/src/models/email-reply-token.ts`** (mirror `download-link.ts`, export from index):
    - `{ domain, token (unique), userId, kind: "community"|"product", community?: {communityId, postId, parentCommentId?, parentReplyId?}, product?: {productId, entityType, entityId, commentId, parentReplyId?}, contextKey, expiresAt (TTL index), createdAt }` (`parentCommentId` absent = reply targets the post itself as a top-level comment).
    - Unique index `{ domain, userId, contextKey }` (the context key is a SHA-256 digest of canonical thread coordinates) → minting is an idempotent upsert without duplicating readable coordinates in the index.
    - A TTL index expires unused records automatically. User deletion also removes that user's tokens immediately; the web deletion regression suite covers this lifecycle path.
    - Model registrations: `apps/queue/src/domain/model/email-reply-token.ts` and `apps/web/models/EmailReplyToken.ts`.
6. **Minting service `apps/queue/src/notifications/services/email-reply-token.ts`**:
    - `mintReplyToken({ domainId, userId, context })` — validates exactly one complete community/product context, performs a concurrency-safe upsert, slides `expiresAt` by 30 days, and returns the existing token for the same recipient and thread position.
    - `isReplyByEmailEnabled()` = `!!process.env.INBOUND_EMAIL_DOMAIN`; `buildReplyToAddress(token)` validates both the base64url-safe token and a normalized ASCII email domain before returning `` `reply+${token}@${INBOUND_EMAIL_DOMAIN}` ``. Invalid or header-injection-shaped configuration fails the notification job instead of emitting an unsafe header.
    - In `EmailChannel.send`: when `replyContext` exists and feature enabled, add `"Reply-To"` to the existing headers object. Env absent → no Reply-To, everything else identical (self-hosters unaffected). Tokens are multi-use (standard reply-address semantics).
7. **Env/configuration**:
    - Phase 2: `INBOUND_EMAIL_DOMAIN` is read by the queue (presence enables token minting and the `Reply-To` header). Phase 3 also supplies the same value to the web app so inbound recipients can be matched. The queue environment template and Docker Compose example include the optional queue setting. TTL is a constant (30 d), not env.
    - Phase 3 common: `INBOUND_EMAIL_WEBHOOK_SECRET` for providers protected by a shared endpoint secret.
    - Amazon SES: `INBOUND_EMAIL_SES_TOPIC_ARN`, `INBOUND_EMAIL_SES_BUCKET`, `INBOUND_EMAIL_SES_REGION`, and optional `INBOUND_EMAIL_SES_OBJECT_PREFIX`. Prefer the workload's IAM role over static AWS credentials; the web workload needs `s3:GetObject` for the inbound bucket. The S3 bucket must have a short lifecycle expiration so raw MIME objects do not accumulate.
    - Mailgun: `MAILGUN_WEBHOOK_SIGNING_KEY` for HMAC verification.

## Phase 3 — Inbound endpoint + provider abstraction (Part C)

**Status: implemented for Amazon SES, Postmark, and Mailgun.**

8. **Adapter layer, `apps/web/lib/inbound-email/`**:
    - `types.ts` — `NormalizedInboundEmail { to[], from, subject?, textBody, strippedReply?, messageId? }`; `InboundEmailAdapter { provider, verify({rawBody, headers, searchParams}), parse({rawBody, contentType}) }`.
    - Initial adapters: `providers/ses.ts`, `providers/postmark.ts`, and `providers/mailgun.ts`; `providers/sendgrid.ts` follows in Phase 3b. `providers/index.ts` is the registry.
    - **Amazon SES (first-class because the production stack is hosted on AWS):** follow the [AWS email-receiving prerequisites](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-setting-up.html): verify the reply subdomain in an SES email-receiving Region, point its MX record at that Region's SES inbound endpoint, and grant SES access to the AWS resources used by the receipt rule. Add an active receipt rule scoped to the reply subdomain. The rule stores raw MIME in S3 and publishes the S3 receipt notification to SNS. SNS subscribes `POST /api/inbound-email/ses`. The adapter validates the SNS signature and expected `TopicArn`, safely handles `SubscriptionConfirmation`, reads the expected bucket/object key using the workload IAM role, parses the MIME message, and normalizes it. S3 is preferred over putting content directly in an SNS action because direct SNS email content is limited to 150 KB, while the S3 action supports messages up to 40 MB.
    - **Postmark:** JSON payload with `StrippedTextReply`; protect the configured webhook URL with the shared endpoint secret.
    - **Mailgun:** form/multipart payload with `stripped-text`; verify the HMAC of timestamp + token with the signing key and enforce 5-minute freshness for replay protection.
    - **SendGrid (Phase 3b):** multipart Inbound Parse payload with raw-body ECDSA signature verification.
    - `extract-reply-text.ts` — use a provider's stripped reply when present; otherwise use `email-reply-parser` on `textBody`. SES raw MIME additionally needs a MIME parser before this step. Trim and cap accepted reply text at 5000 characters. (Add the required dependencies to `apps/web/package.json`.)
9. **Processing pipeline `apps/web/lib/inbound-email/process-inbound-email.ts`**:
    1. Find `reply+<token>@$INBOUND_EMAIL_DOMAIN` among recipients → else `no_reply_address`.
    2. Token lookup + expiry check → `invalid_token`.
    3. Load Domain (from token) + `User.findOne({ domain, userId: token.userId, active: true })`.
    4. **Sender check**: parsed From must equal `user.email` (case-insensitive) → `sender_mismatch` (token possession alone is insufficient — emails get forwarded).
    5. Extract reply text → `empty_reply` if blank.
    6. If the provider supplied a message ID, atomically lease an `InboundEmailReceipt` before creating content. Accepted receipts are retained for 30 days; duplicate delivery is acknowledged without a second comment, while an active five-minute lease returns a retryable response. Receipts contain no message body and are removed when their user is deleted.
    7. Rate limit via existing `assertRateLimit` (`apps/web/lib/assert-rate-limit.ts`), scoped to `inbound_email` / `reply:create`, with 5 replies per minute and 50 per day.
    8. Synthesize `ctx = { user, subdomain: domain, address: "" }`; dispatch:
        - community → `postComment({ ctx, communityId, postId, content: replyText, parentCommentId?, parentReplyId? })` (no `parentCommentId` in token → top-level comment on the post)
        - product → `createDiscussionReply({ ctx, productId, entityType, entityId, commentId, parentReplyId, content: normalizeTextEditorContent(replyText) })`
        - All checks (membership, enrollment, deleted content, rate limits) re-enforced inside; `recordActivity` inside → participants re-notified as usual.
    9. Terminal rejections are logged and silently dropped. **Policy: no bounce emails** (bounces leak information and can loop); courtesy-failure email is a future enhancement.
10. **Route `apps/web/app/api/inbound-email/[provider]/route.ts`**:
    - `POST`; `await req.text()` first (raw body for HMAC — deliberately better than the payment-webhook precedent, which skips real verification).
    - Unknown provider → 404. Authenticate using the provider's strongest available mechanism: SNS Signature Version 2 plus expected topic for SES, Mailgun HMAC, and HTTP Basic authentication backed by the shared endpoint secret for Postmark.
    - `adapter.verify()` → provider-specific retrieval/parsing → `processInboundEmail()`. SES control messages are handled before normalized-email processing; a subscription is confirmed only after its signature and expected topic are validated.
    - Return 200 after successful processing, duplicate delivery, or a terminal application rejection so providers do not retry-loop. Return 503 for a transient infrastructure error, including an unavailable S3 object or a concurrently leased receipt. Log outcomes via `@/services/logger`. Ignore the `domain` request header — tenant comes from the reply token. `proxy.ts` explicitly bypasses host-based tenant resolution for this path.

## Phase 4 — Docs

**Status: implemented.**

11. **Self-hosting documentation is a release gate.** The same change adds equivalent Amazon SES, Postmark, and Mailgun configuration guides to both active documentation sites.
    - Legacy Astro docs: add `apps/docs/src/pages/en/self-hosting/reply-by-email.md`, add it to the `Self hosting` navigation in `apps/docs/src/config.ts`, and link it from `apps/docs/src/pages/en/self-hosting/self-host.md`.
    - Fumadocs site: add `apps/docs-new/content/docs/self-hosting/reply-by-email.mdx`, add it to `apps/docs-new/content/docs/self-hosting/meta.json`, and link it from `apps/docs-new/content/docs/self-hosting/self-host.mdx`.
    - The Docker Compose example identifies service placement for all inbound variables. The queue-side switch remains documented in `apps/queue/.env` and `apps/queue/README.md`.
12. **The guides cover common reply-by-email configuration**:
    - State the CourseLit version in which each provider became available. Initial support is Amazon SES, Postmark, and Mailgun; add SendGrid instructions only when Phase 3b ships.
    - Explain that outbound SMTP and inbound reply processing are independent and may use different providers.
    - Require a dedicated inbound subdomain such as `replies.example.com`; warn self-hosters not to replace the MX records of a root domain already used for normal mail.
    - Document `INBOUND_EMAIL_DOMAIN`, which services need each environment variable (web, queue, or both), the public HTTPS provider endpoint, reverse-proxy requirements, container restart steps, and how to disable the feature safely.
    - Include an end-to-end test: trigger a real conversation notification, confirm its `Reply-To`, reply from the notified user's address, verify one new thread entry, and inspect web/queue logs for rejection reasons.
    - Include troubleshooting for DNS propagation, an unverified provider domain, invalid webhook signatures/secrets, sender mismatch, expired tokens, empty stripped replies, inaccessible S3 objects, and missing membership/enrollment permissions.
    - Never instruct users to log or paste real reply tokens, webhook secrets, signing keys, or AWS credentials.
13. **Amazon SES documentation** uses the official [email-receiving prerequisites](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-setting-up.html), [S3 receipt action](https://docs.aws.amazon.com/ses/latest/dg/receiving-email-action-s3.html), and [SNS signature verification](https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html):
    - Choose a Region that supports SES email receiving; verify the inbound subdomain and publish its regional inbound MX record.
    - Create the active receipt rule scoped to the reply subdomain. Store raw MIME in the expected S3 bucket/prefix and publish the S3 action notification to the expected SNS topic.
    - Subscribe `https://<courselit-host>/api/inbound-email/ses` to the topic and explain that CourseLit confirms the subscription only after signature and topic validation.
    - Configure `INBOUND_EMAIL_SES_TOPIC_ARN`, `INBOUND_EMAIL_SES_BUCKET`, `INBOUND_EMAIL_SES_REGION`, and optional `INBOUND_EMAIL_SES_OBJECT_PREFIX`.
    - Prefer an instance/task role granting the web workload least-privilege `s3:GetObject` access over static AWS keys. Document the permissions SES itself needs for S3/SNS and the same-Region constraints.
    - Require a short S3 lifecycle expiration for raw inbound messages and document the direct-SNS 150 KB versus S3 40 MB rationale.
14. **Postmark documentation** uses its official [inbound server](https://postmarkapp.com/developer/user-guide/inbound/configure-an-inbound-server) guide:
    - Create an Inbound Message Stream, configure the dedicated inbound domain and MX record, and set `https://<courselit-host>/api/inbound-email/postmark` as its inbound webhook.
    - Configure the CourseLit shared webhook secret through the implemented Postmark authentication mechanism and explain how it maps to `INBOUND_EMAIL_WEBHOOK_SECRET` without exposing the value in screenshots or logs.
15. **Mailgun documentation** uses its official [domain verification](https://documentation.mailgun.com/docs/mailgun/user-manual/domains/domains-verify), [receiving route](https://documentation.mailgun.com/docs/mailgun/user-manual/receive-forward-store/routes), and [HTTP payload](https://documentation.mailgun.com/docs/mailgun/user-manual/receive-forward-store/receive-http) guides:
    - Add and verify the dedicated receiving domain, publish both Mailgun MX records, and create a route that forwards matching recipients to `https://<courselit-host>/api/inbound-email/mailgun`.
    - Configure `MAILGUN_WEBHOOK_SIGNING_KEY`; explain that CourseLit validates Mailgun's timestamp/token HMAC and rejects stale requests.
16. **Document SendGrid only with Phase 3b** using the official [Inbound Parse setup](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/setting-up-the-inbound-parse-webhook) and [security policy](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/securing-your-parse-webhooks) guides. Cover the dedicated hostname/MX record, destination URL, raw multipart handling, security-policy public key/configuration, and the corresponding CourseLit environment variables introduced by that adapter.

---

## Decisions taken (flag if you disagree)

| Decision                    | Choice                                                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content enrichment location | Queue-side re-fetch via existing resolver (no metadata changes)                                                                                                                                                         |
| Token format                | Opaque DB token, 30-day sliding TTL, multi-use per (recipient, thread position)                                                                                                                                         |
| Provider support            | Initial: Amazon SES, Postmark, and Mailgun. Phase 3b: SendGrid. SES uses S3 + SNS and the AWS workload role; Postmark and Mailgun supply pre-stripped reply text.                                                       |
| Subject line                | Keep one-line summary as subject (vs `Re: "<title>"`)                                                                                                                                                                   |
| Per-channel sizing          | Notification panel stays compact (unchanged one-liners); only email shows full content blocks                                                                                                                           |
| Thread-context labels       | New comments show the original post as `Original post`; replies show their active parent as `Earlier comment`                                                                                                           |
| Rich-text extraction        | Preserve structural line breaks by default; normalize whitespace only in consumers such as duplicate-content fingerprinting                                                                                             |
| Entity lifecycle            | Do not send conversation email content for soft-deleted posts/comments/replies; exclude deleted parents from context                                                                                                    |
| Rejection UX                | Silent drop + server log; no bounce emails in MVP                                                                                                                                                                       |
| Rich treatment scope        | 5 conversation activity types: `COMMUNITY_POST_CREATED` (post body excerpt; email reply → top-level comment), the 2 community comment/reply types, and `COURSE_DISCUSSION_COMMENT_CREATED` (comment + reply eventTypes) |

## Verification

### Phase 1 — completed

- `getNotificationEmailContent` tests cover the default database resolver, all conversation variants, deleted entities/parents, original-post context, structured rich-text boundaries, request-scoped resolver reuse, and unchanged non-conversation output.
- `EmailChannel`/template tests cover the actor/avatar header, safe text encoding, unsubscribe behavior, legacy non-conversation layout, `Original post` versus `Earlier comment` labels, preserved new-content line breaks, and the discussion CTA.
- Shared extractor/product-discussion tests cover paragraph and hard-break extraction plus duplicate detection across formatting-only differences.
- Latest full verification: **91 test suites and 783 tests passed**. Formatting, lint, relevant type checks, and `@courselit/orm-models` / `@courselit/queue` builds also passed. A standalone web `tsc --noEmit` reports four pre-existing errors in `apps/web/graphql/pages/__tests__/logic.test.ts` unrelated to this change.

### Phase 2 — completed

- Queue tests cover concurrency-safe, idempotent minting; 27-character base64url tokens; product and community coordinates; sliding expiry; disabled configuration; and token/domain header-injection validation.
- `EmailChannel` tests cover enabled conversation headers and reply hints, non-conversation omission, and failure behavior when token minting fails. The user-deletion regression suite confirms immediate token cleanup.
- **Browser E2E:** with `INBOUND_EMAIL_DOMAIN=replies.example.test`, a real community comment produced a Mailpit message containing the expected `Reply-To` address, `Original post` context, preserved paragraph break, reply hint, and `View discussion` CTA. The community page had no console errors; associated GraphQL requests returned 200.

### Phase 3–4 — implementation coverage

- Adapter tests cover Postmark HTTP Basic verification and `StrippedTextReply`, Mailgun fresh/stale HMAC signatures and quote stripping, plus SES SNS signature verification, unexpected topic rejection, S3 prefix and MIME parsing, and safe subscription confirmation.
- Processor tests cover community and product dispatch, expired tokens, sender mismatch, empty replies, membership enforcement, and idempotent provider redelivery. Route tests cover unknown providers, authentication, terminal rejection acknowledgement, retryable processing, and SES controls. A proxy test proves the shared webhook endpoint does not derive tenancy from its host.
- The endpoint is represented in the generated OpenAPI contract. Both self-hosting navigation trees link the equivalent provider guide, and the Docker Compose template lists the exact app/queue environment placement.
- Live-provider E2E remains a deployment acceptance step because it requires a real SES, Postmark, or Mailgun account and DNS. It should verify one new thread entry and the usual re-notification fan-out using the provider configured for the deployment.
