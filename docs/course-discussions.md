# Course Discussions PRD

## Document Control

- Status: Draft
- Last updated: June 10, 2026
- Owner: Web/Product team
- Target workspace: `apps/web` (`@courselit/web`)

## Assumptions

1. This PRD covers discussions only for products whose type is `course`.
2. Discussions are lesson-scoped; there is no course-wide freeform discussion board in this release.
3. Existing community schemas and collections must not be reused for persistence, even where the UX is similar.
4. Existing community comment, report, notification, and highlight behavior may be used as implementation references.
5. Course viewer participants can participate only when they can access the course and lesson through learner access or product management permissions.
6. Product admins are users who can manage the product through existing product permissions.
7. Course preview mode is available to product admins through the course viewer based on existing product management permissions.
8. Product management permissions allow course viewer discussion participation for manageable lessons even when the actor is not enrolled as a learner; preview derives from the same permissions and must preserve those session params while navigating.
9. Replies are stored and displayed as one-level replies under the original top-level comment. Replying to a reply adds the new reply to that same reply list.
10. The feature should use existing GraphQL patterns unless a REST endpoint is already the natural integration point for the touched surface.
11. Discussions are available only to enrolled learners or product managers. A public lesson may be visible to guests or logged-in non-enrolled users when `requiresEnrollment` is `false`, but discussion entry points, hub rows, comments, replies, and composers must remain hidden until the actor is enrolled in the product or has product management permissions while accessing via preview mode.

## Objective

Add lesson-specific threaded discussions to course products so learners can ask questions, reply to each other, and return to the relevant lesson from notifications or the course discussion index.

Success means:

1. Product admins can enable or disable discussions per product.
2. Course viewer participants see the current lesson's discussion in a right sidebar on desktop and a full-screen panel on mobile.
3. Course viewer participants can create top-level comments, reply to comments or replies, like comments/replies, delete their own content, and report other participants' content.
4. Product admins receive notifications for new discussion activity and can moderate reported content under the product manage area.
5. Course discussion participants receive notifications for new comments/replies in the same lesson discussion.
6. Notification links open the exact lesson, open the discussion panel, scroll to the relevant comment or reply, and temporarily highlight it.
7. `/course/[slug]/[id]/discussions` lists lesson discussions and navigates to the relevant lesson with the discussion panel open.
8. The course viewer sidebar includes icons for introduction, discussions, sections, and lessons.

## Goals

1. Make discussion participation available directly inside the learning flow.
2. Keep discussions tied to lesson context rather than creating a separate community-like product.
3. Give admins a lightweight moderation queue for reported lesson discussion content.
4. Preserve CourseLit's multi-tenant and permission boundaries.
5. Avoid coupling this feature to community persistence models.

## Non-Goals

- Reusing `Community`, `CommunityPost`, `CommunityComment`, `CommunityReport`, or subscriber collections for course discussion data.
- Multi-level nested threads beyond one top-level comment plus flat replies.
- Course-wide categories, post feeds, membership workflows, or community-style product pages.
- Reactions beyond the existing requested comment/reply flow, unless already present in a reused UI component and explicitly kept.
- Real-time websockets or live cursors in the first release.
- Instructor-only private notes.
- Public API support unless explicitly added in a later API PRD.
- Product-level blog comments in this release. They are planned for a future release, but the discussion foundation in this version must remain stable enough to support them without schema migration.
- Blog-specific UX beyond product-level comments.

## Existing Surfaces

- Product manage route:
    - `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]/manage/page.tsx`
    - existing settings components under `.../manage/components`
- Course viewer shell:
    - `apps/web/app/(with-contexts)/course/[slug]/[id]/layout-with-sidebar.tsx`
    - lesson page at `apps/web/app/(with-contexts)/course/[slug]/[id]/[lesson]/page.tsx`
    - lesson renderer entry through `@components/public/lesson-viewer`
- Community report reference:
    - `apps/web/app/(with-contexts)/dashboard/(sidebar)/community/[id]/manage/reports/*`
    - `apps/web/models/CommunityReport.ts`
- Community threaded comment reference:
    - `apps/web/models/CommunityComment.ts`
- Notification reference:
    - `apps/web/graphql/notifications/*`
    - `@courselit/common-logic` notification message and href helpers

## User Stories

1. As a product admin, I can enable discussions from the product manage screen so learners can discuss eligible discussion targets.
2. As a course viewer participant, I can open the discussion panel while viewing a lesson and see comments for only that lesson.
3. As a course viewer participant, I can reply to a top-level comment or to an existing reply, and my reply appears in that comment's reply list.
4. As a course viewer participant, I can edit my own comment or reply inline so I can fix mistakes without deleting and reposting.
5. As a course viewer participant, I can delete my own comment or reply without deleting the rest of the thread.
6. As a course viewer participant, I can report a comment or reply for admin review.
7. As a course viewer participant, I can like or unlike a comment or reply.
8. As a product admin, I can review reported discussion content under `/dashboard/product/[id]/manage/...` and resolve or reject reports.
9. As a notified participant, I can click an email or in-app notification and land on the relevant lesson with the discussion content highlighted.
10. As a course viewer participant, I can open `/course/[slug]/[id]/discussions`, see lesson discussion counts for lessons available in my current viewer mode, and jump into the relevant lesson discussion.

## Product Requirements

### Course Admin Toggle

- Add a Discussions section to product manage settings.
- The toggle must be available only for course products.
- The setting must be persisted on the course/product record, `course.discussions` can be a boolean flag to represent if discussions are enabled for the course.
- Disabling discussions must hide discussion entry points in the course viewer and prevent new comment/reply/report mutations.
- Existing comments and reports must be retained when disabled.
- Re-enabling discussions must restore existing discussion history.
- Use strings from `apps/web/config/strings.ts`; do not inline user-facing copy in TSX files.

### Product Manager Participation

- Product managers must use the course viewer discussion panel for normal discussion interaction.
- Do not add a dashboard discussion browser or management area for reading, browsing, commenting, replying, liking, deleting, or reporting ordinary discussion content.
- The dashboard product manage area may include only the course-level discussions toggle and the reported-content queue at `/dashboard/product/[id]/manage/discussions/reports`.
- Course viewer `/course/[slug]/[id]/discussions` remains the discussion index for all course viewer participants, including product managers.
- Product managers must navigate from the course viewer discussion index into a lesson and use the lesson discussion panel for discussion actions.
- Product admins can participate from the course viewer when they either have learner access to the lesson or product management permissions for the product.
- Product management permissions grant non-enrolled course viewer participation for manageable lessons; preview mode derives from those permissions and must keep its session params intact across course viewer navigation.
- Product admin discussion actions should behave like normal course viewer participation: they can comment, reply, like, report, and delete their own content for manageable lessons.

### Lesson Discussion Panel

- Add a discussion icon button to the course viewer header.
- Hide the discussion icon button and panel for guests and logged-in non-enrolled users, even when the current lesson has `requiresEnrollment: false` and the lesson content itself is publicly viewable.
- On desktop, opening discussions shows a right sidebar for the current lesson.
- On mobile, opening discussions shows a full-screen panel or sheet.
- The panel header includes:
    - icon
    - `Discussions`
    - link to all discussions
    - close button
- The panel body lists top-level comments newest or oldest consistently; the implementation plan should choose the order and apply it everywhere.
- Replies render under the top-level comment in a flat list.
- Deleted comments/replies render as a deleted placeholder and keep the thread structure intact.
- Course viewer views must not return or render the original content of deleted comments/replies.
- Each visible comment and reply shows its like count and whether the current course viewer participant has liked it.
- Course viewer participants can like or unlike visible comments and replies.
- Deleted comments/replies cannot be liked or unliked.
- Clicking on the `Reply` button should scroll to and focus the `TextEditor`.
- The composer sits at the bottom of the panel and disables submit until form content is non-empty.
- Comment and reply authoring must use `TextEditor` so content is stored as Tiptap documents.
- The discussion composer must use `TextEditor` without showing the editor toolbar.
- Comment and reply display must use `TextRenderer`.
- Forms must use `react-hook-form`, `zod`, and refs for current form state in line with repo form conventions.
- The original author of a comment or reply can edit their own content inline.
- Editing replaces the `TextRenderer` with an inline `TextEditor` (no toolbar) with save and cancel affordances.
- Only the original author (`userId` match) may edit; product admins and moderators cannot edit other users' content.
- Deleted comments and replies cannot be edited.
- A visible "edited" indicator must be shown after a comment or reply has been updated. This is driven by a dedicated `isEdited: Boolean` field (default `false`) on the record, set to `true` by the edit mutation — not inferred from timestamp comparison.
- The edit mutation must revalidate content against the same Tiptap document shape, byte size, and plain-text length limits as creation.

### Threading Rules

- A top-level comment starts a discussion thread for a lesson.
- A reply always belongs to a top-level comment.
- When the user replies to an existing reply, the new reply is added to the same top-level comment's reply list.
- When the user replies to an existing reply, store that reply's ID in `parentReplyId` for context, but do not render replies as nested threads.
- If `parentReplyId` is provided, it must reference a reply with the same `domain`, `productId`, `entityType`, `entityId`, and `commentId`.
- URLs and notification metadata must distinguish top-level comments and replies so the target can be highlighted exactly.

### Pagination And Loading

- Lesson discussion comments must be paginated from the first release.
- Use cursor pagination for comments with a stable sort, for example `{ createdAt: -1, commentId: -1 }`.
- The lesson discussion panel must not load all comments for a lesson at once.
- Comment responses should include:
    - comment fields
    - `likesCount`
    - `hasLiked`
    - `replyCount`
    - a limited reply preview
- Reply previews should return only the first page of replies for each visible comment, using a small fixed limit.
- Replies must also be pageable by `commentId` for "view more replies" / incremental loading.
- Reply pagination must use a stable sort, for example `{ createdAt: 1, replyId: 1 }`.
- Course viewer discussion index, discussion panels, and report screens must use pagination for lesson summaries, comments, replies, and reports.
- Deep-link targets from notifications must be loadable even when the target comment/reply is outside the initially loaded page.
- Paginated API responses must use a consistent cursor envelope:

```ts
{
    items: T[];
    nextCursor?: string;
    hasMore: boolean;
}
```

- Comment cursors must encode the last item's `createdAt` and `commentId`.
- Reply cursors must encode the last item's `createdAt` and `replyId`.
- Discussion summary cursors must encode the last item's `lastActivityAt` and `entityId`.
- Report cursors must encode the last item's `createdAt` and `reportId`.
- Cursor values must be opaque to clients.

### All Discussions Page

- Add route: `/course/[slug]/[id]/discussions`.
- The route appears in the course viewer sidebar only when discussions are enabled.
- The route and sidebar entry must be hidden from guests and logged-in non-enrolled users. If an ineligible actor opens the route directly, redirect them to the course introduction page without listing discussion metadata.
- The page lists only lessons that are currently available in the actor's course viewer access mode.
- For enrolled non-preview learners, available lessons are determined by existing course enrollment, drip, visibility, and lesson access rules.
- For effective preview sessions, available lessons are the lessons visible in that preview response, including preview-visible lessons that the actor could not access as an enrolled learner.
- For guests and logged-in non-enrolled users, no lesson discussion summaries or counts are returned, including for public lessons with `requiresEnrollment: false`.
- For available lessons, show lessons with at least one visible or deleted discussion item, plus counts.
- Do not show available lessons with zero discussion activity.
- Do not show discussion activity for lessons outside the actor's current viewer mode. For non-preview learners, this includes lessons that have not dripped yet; for effective preview sessions, this includes lessons omitted from the preview response.
- Server logic must resolve the actor's available lesson IDs before querying discussion summaries/counts.
- Discussion summaries/counts must be queried only for that available lesson allowlist; do not query all lesson discussion counts and filter them client-side.
- Empty state: if no discussions exist, show a concise in-context empty state.
- Clicking a lesson row navigates to `/course/[slug]/[id]/[lessonId]?discussion=open#discussion-[contentId]` or the final agreed URL shape.
- The destination must open the discussion panel and scroll to the relevant content when a target exists.

### Sidebar Icons

- Add icons to course viewer navigation:
    - introduction/about
    - discussions
    - section headers
    - lessons
- Use existing icon libraries already used by the course viewer (`lucide-react` and `@courselit/icons`) rather than adding a dependency.
- Ensure active, locked, completed, and discussion states remain visually distinct in the learner course viewer.
- Do not add admin controls for active, locked, or completed states as part of this feature. Those states remain derived from the current route, existing course access/drip rules, and learner progress.
- The only new admin-facing sidebar-related control in this release is the course-level discussions toggle.

### Moderation

- Add only a reported-content route under the product manage route: `/dashboard/product/[id]/manage/discussions/reports`.
- `/dashboard/product/[id]/manage/discussions/reports` is the report queue.
- The report queue should show only reported content and report workflow controls.
- General browsing, lesson-level discussion review, commenting, replying, liking, deleting own content, and reporting content happen in the course viewer discussion panel.
- Soft delete and restore actions happen only in `/dashboard/product/[id]/manage/discussions/reports`.
- Reuse the community report screen as UX reference, adapted to product/course naming.
- Admins can filter reports by status.
- Course discussion reports must follow the same status cycle as community reports: `pending` -> `accepted` -> `rejected` -> `pending`.
- The UI must label the status as `accepted`; do not use `approved` for this feature.
- Moving a report to `accepted` soft-deletes/hides the reported comment or reply and retains a deleted placeholder.
- Moving an accepted report away from `accepted` restores the reported content only when there are no other accepted reports for the same `contentType` and `contentId`.
- Report queue views may show original deleted content, but must label it clearly as deleted.
- Report queue views must allow restoring deleted comments/replies through the same report status cycle.
- Admins can reject a report with an optional or required reason, matching the community report precedent.
- Reported content rows must show:
    - lesson title
    - top-level comment/reply content preview
    - reporter
    - author
    - reason
    - status
    - created date
    - action controls
- The moderation screen must enforce product management permissions and tenant isolation.

### Abuse And Rate Limits

- Add a reusable app-level rate-limit helper that can be applied to course discussions and later reused by other mutation-heavy features such as communities.
- Course discussions should be the first consumer of this helper.
- Back the helper with a generic `RateLimitEvent` persistence model.
- Suggested helper shape:
    - `assertRateLimit({ domain, userId, scope, action, subjectId, window, limit })`
    - `scope` examples: `"course_discussion"`, `"community"`
    - `action` examples: `"comment:create"`, `"reply:create"`, `"like:toggle"`, `"report:create"`
    - for discussions, `subjectId` should be `${productId}:${entityType}:${entityId}`
    - for other scopes, `subjectId` can be a community ID, post ID, or another bounded resource ID
- Enforce limits server-side in mutation logic for:
    - creating top-level comments
    - creating replies
    - liking/unliking comments or replies
    - reporting comments or replies
- Use Mongo-backed checks/counts against `RateLimitEvent` for this release; do not add new Redis/token-bucket infrastructure.
- Define named constants for limits instead of inline numbers.
- Suggested starting limits:
    - max 5 comments/replies per minute per user per discussion target
    - max 50 comments/replies per day per user per discussion target
    - max 60 like/unlike actions per minute per user per discussion target
    - max 10 reports per hour per user per discussion target
- Reject duplicate identical comment/reply content by the same user in the same discussion target within a short window.
- Return a clear rate-limit error when a limit is exceeded.
- Rate-limit checks must include `domain`, `userId`, `scope`, `action`, and a target-specific `subjectId`.
- Keep the helper generic, but keep Course Discussion limit constants feature-specific so future community adoption can choose its own thresholds.

## Data Design

Create original schemas and models. Do not reuse community collections.

All new discussion-owned schemas must use the `ProductDiscussion` prefix because the persistence model is product-scoped and target-based, even though this release only exposes lesson discussions for course products. Do not introduce `CourseDiscussion*` schema/model names. Generic cross-feature schemas, such as `RateLimitEvent`, may keep generic names.

### Entity Targets

This PRD implements discussions with a target-based shape so the same substrate can support lesson-level course discussions now and product-level blog comments in a future release.

Discussion targets use:

```ts
entityType: "lesson" | "product";
productId: string;
entityId: string; // lessonId for course lessons, productId for blog product comments
```

Supported targets:

- `entityType = "lesson"` supports course lesson discussions.
- `entityType = "product"` is reserved for future product-level discussions, including blog product comments, and should be supported by the schema/foundation from this version.
- For `entityType = "lesson"`, `productId` maps to the course product ID and `entityId` maps to `lessonId`.
- For `entityType = "product"`, `productId` maps to the blog product ID and `entityId` maps to the same blog product ID.
- This release should not ship blog comment UI or product-level discussion routes unless explicitly added to scope later.
- This release must create discussion records only with `entityType = "lesson"`.
- API/UI support for creating, listing, notifying, or deep-linking `entityType = "product"` records is out of scope until the future blog-comments release.
- Do not introduce schema or helper assumptions that would require migration when product-level blog comments are implemented.

All discussion-owned schemas in this PRD should store `productId`, `entityType`, and `entityId` now to avoid a future migration for blog comments.

### Product Discussion Setting

Add a discussion setting to the existing product model. This release exposes the setting only for products whose type is `course`:

```ts
discussions: boolean;
```

Default:

- `discussions: false` for existing and new course products.
- Discussions are opt-in per product and must remain off until a product admin enables them.

- No migration is required if the code treats missing `discussions` as `false`.

### RateLimitEvent

Generic app-level rate-limit event model. This is not course-discussion-specific and should be reusable by communities and other mutation-heavy features.

```ts
{
    domain: ObjectId;
    userId: string;
    scope: string;
    action: string;
    subjectId: string;
    fingerprint?: string;
    createdAt: Date;
}
```

Indexes:

- `{ domain: 1, userId: 1, scope: 1, action: 1, subjectId: 1, createdAt: -1 }`
- `{ domain: 1, userId: 1, scope: 1, subjectId: 1, fingerprint: 1, createdAt: -1 }`
- TTL index on `createdAt` to expire rate-limit events after 25 hours. This covers the longest current enforcement window of 24 hours while allowing for MongoDB TTL cleanup delay.

Usage:

- `assertRateLimit(...)` records a `RateLimitEvent` after an action passes its checks.
- Duplicate content checks can use `fingerprint`, for example a hash of normalized plain text scoped by `subjectId`.
- Course discussion rate-limit constants should use `scope: "course_discussion"` and `subjectId = ${productId}:${entityType}:${entityId}`.

### ProductDiscussionComment

One document per top-level comment.

```ts
{
    domain: ObjectId;
    productId: string;
    entityType: "lesson" | "product";
    entityId: string;
    commentId: string;
    userId: string;
    content: TextEditorContent;
    likesCount: number;
    deleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    deletedByRole?: "author" | "course_admin";
    deleteReason?: string;
    restoredAt?: Date;
    restoredBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

Indexes:

- unique `{ domain: 1, commentId: 1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1, createdAt: -1, commentId: -1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1, updatedAt: -1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1, userId: 1, deleted: 1 }`

### ProductDiscussionReply

One document per reply. Replies always belong to a top-level comment.

```ts
{
    domain: ObjectId;
    productId: string;
    entityType: "lesson" | "product";
    entityId: string;
    commentId: string;
    replyId: string;
    parentReplyId?: string;
    userId: string;
    content: TextEditorContent;
    likesCount: number;
    deleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    deletedByRole?: "author" | "course_admin";
    deleteReason?: string;
    restoredAt?: Date;
    restoredBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

Indexes:

- unique `{ domain: 1, replyId: 1 }`
- `{ domain: 1, commentId: 1, createdAt: 1, replyId: 1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1, createdAt: -1, replyId: -1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1, userId: 1, deleted: 1 }`

### ProductDiscussionLike

One document per user like on a comment or reply.

```ts
{
    domain: ObjectId;
    productId: string;
    entityType: "lesson" | "product";
    entityId: string;
    contentType: "comment" | "reply";
    contentId: string;
    commentId?: string;
    userId: string;
    createdAt: Date;
}
```

Indexes:

- unique `{ domain: 1, contentType: 1, contentId: 1, userId: 1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1, userId: 1 }`
- `{ domain: 1, contentType: 1, contentId: 1 }`

Notes:

- Store comment and reply content as Tiptap `TextEditorContent` documents, not plain strings.
- Store replies in their own collection while keeping the UI and API behavior as one-level replies under a top-level comment.
- Use `parentReplyId` only as context for replies to replies; it must not create nested rendering or recursive reply queries.
- Store likes in `ProductDiscussionLike`; do not store user ID arrays on comments or replies.
- For comment likes, `contentId` is the `commentId`.
- For reply likes, `contentId` is the `replyId` and `commentId` stores the parent top-level comment for context.
- Store denormalized `likesCount` on comments and replies for efficient reads.
- Like/unlike operations must update `ProductDiscussionLike` and the target comment/reply `likesCount` consistently and idempotently.
- `hasLiked` must be computed from `ProductDiscussionLike` for the current user.
- Reply queries must be scoped by `domain` and `commentId`, and should preserve stable reply ordering.
- Soft delete operations must set `deleted`, `deletedAt`, `deletedBy`, and `deletedByRole`.
- `deleteReason` is optional and can be used for admin moderation context.
- Restore operations must set `deleted: false`, `restoredAt`, and `restoredBy`.

### ProductDiscussionSummary

One document per discussion target summary. This avoids expensive aggregation for course viewer `/discussions` and lesson discussion panels.

```ts
{
    domain: ObjectId;
    productId: string;
    entityType: "lesson" | "product";
    entityId: string;
    commentsCount: number;
    repliesCount: number;
    totalCount: number;
    activityCountIncludingDeleted: number;
    lastActivityAt: Date;
    lastCommentId?: string;
    lastReplyId?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

Indexes:

- unique `{ domain: 1, productId: 1, entityType: 1, entityId: 1 }`
- `{ domain: 1, productId: 1, entityType: 1, lastActivityAt: -1, entityId: 1 }`

Summary maintenance:

- Create or update the summary when a top-level comment or reply is created.
- Summary records are created only after first activity, so `lastActivityAt` is required and always reflects the most recent created comment/reply, even if all activity later becomes soft-deleted.
- Increment `commentsCount` for a new top-level comment.
- Increment `repliesCount` for a new reply.
- Maintain `totalCount = commentsCount + repliesCount`.
- Increment `activityCountIncludingDeleted` for every new top-level comment or reply.
- Update `lastActivityAt`, `lastCommentId`, and `lastReplyId` on new activity.
- Soft-delete and restore operations must not update `lastActivityAt`, `lastCommentId`, or `lastReplyId`.
- Decrement `commentsCount` when a top-level comment is soft-deleted.
- Decrement `repliesCount` when a reply is soft-deleted.
- Increment the appropriate counter again when an admin restores a deleted comment or reply.
- Keep `totalCount = commentsCount + repliesCount` after create, soft-delete, and restore operations.
- Counts represent currently visible, non-deleted discussion activity. Deleted placeholders preserve conversation context but do not contribute to summary counts.
- `activityCountIncludingDeleted` is append-only for newly created comments/replies; soft-delete and restore operations must not decrement or increment it.
- Course viewer `/discussions` can use `activityCountIncludingDeleted > 0` to show available lessons that contain only deleted placeholders, while visible counts continue to come from `commentsCount`, `repliesCount`, and `totalCount`.
- Course viewer `/discussions` must filter summaries by the server-resolved available lesson ID allowlist for the actor's current viewer mode.
- Product managers can read summaries for manageable lessons through the course viewer discussion index.

### ProductDiscussionSubscriber

One document per user subscription to a lesson discussion, mirroring the existing `CommunityPostSubscriber` pattern.

```ts
{
    domain: ObjectId;
    subscriptionId: string;
    productId: string;
    entityType: "lesson" | "product";
    entityId: string;
    userId: string;
    subscription: boolean;
    createdAt: Date;
    updatedAt: Date;
}
```

Indexes:

- unique `{ domain: 1, productId: 1, entityType: 1, entityId: 1, userId: 1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1, subscription: 1, userId: 1 }`

Subscriber maintenance:

- Add or reactivate a subscription for a course viewer participant when they create a top-level comment or reply in a lesson discussion.
- Use active `ProductDiscussionSubscriber` records to find lesson discussion notification recipients instead of scanning comments and replies.
- Soft-deleting a user's comment/reply does not automatically unsubscribe them.
- If all of a user's comments/replies in a lesson discussion are deleted, set `subscription: false`.
- Restoring one of the user's comments/replies in a lesson discussion should reactivate their subscription.
- Product admins are notification recipients through product management permissions, not through this subscriber collection unless they also participate from the course viewer through learner access or product management permissions.

### ProductDiscussionReport

```ts
{
    domain: ObjectId;
    productId: string;
    entityType: "lesson" | "product";
    entityId: string;
    reportId: string;
    contentType: "comment" | "reply";
    contentId: string;
    commentId?: string;
    userId: string;
    reason: string;
    status: "pending" | "accepted" | "rejected";
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

Indexes:

- unique `{ domain: 1, contentType: 1, contentId: 1, userId: 1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1, status: 1, createdAt: -1, reportId: -1 }`
- `{ domain: 1, productId: 1, entityType: 1, entityId: 1 }`

Report target rules:

- For comment reports, `contentId` is the `commentId`.
- For reply reports, `contentId` is the `replyId` and `commentId` stores the parent top-level comment for context.
- Duplicate reports by the same user for the same `contentType` and `contentId` are rejected or idempotently returned.

## API And GraphQL Requirements

Prefer extending existing GraphQL boundaries if that keeps boundaries clear.

Required operations:

- get course discussion setting as part of course/product reads used by manage and viewer screens
- update course discussion setting
- list paginated discussion comments for a lesson, including `replyCount`, `likesCount`, `hasLiked`, and limited reply previews
- list paginated replies by `commentId`, including `likesCount` and `hasLiked`
- list paginated discussion summary/counts by lesson for `/discussions`
- create top-level comment
- create reply
- like or unlike top-level comment
- like or unlike reply
- edit own comment (original author only)
- edit own reply (original author only)
- delete own comment
- delete own reply
- report comment or reply
- list course discussion reports
- count course discussion reports by status
- update course discussion report status, applying soft-delete/restore side effects through the community-style status cycle
- maintain lesson discussion subscriber records

Validation:

- product must exist in the current domain
- product type must be `course` for `entityType = "lesson"`
- `entityType = "product"` is schema-supported but must be rejected by course discussion API/UI write and read operations in this release
- discussions must be enabled for course viewer write operations
- for `entityType = "lesson"`, `entityId` must be a lesson that belongs to the product
- course discussion read and write operations require an enrolled learner or product manager; guests and logged-in non-enrolled users must not receive discussion summaries, comments, replies, like state, or composer affordances, even for public lessons with `requiresEnrollment: false`
- actor must have access to the target entity before reading or writing discussion content:
    - for `entityType = "lesson"` in normal learner mode, enforce existing course enrollment, drip, visibility, and lesson access rules
    - for `entityType = "lesson"`, allow access when the actor has product management permissions for the product, even when the actor is not enrolled
    - preview mode must be permission-backed, not merely requested; the server must verify that the current actor can manage the course in context before granting preview access
- course viewer write mutations must pass course discussion rate-limit checks
- comment and reply content must validate as a non-empty Tiptap document
- comment and reply content must validate as a Tiptap document shape before persistence, including `type: "doc"`
- comment and reply content must enforce a maximum serialized JSON size before persistence, measured with `Buffer.byteLength(JSON.stringify(content), "utf8")`
- comment and reply content must enforce a maximum extracted plain-text length before persistence
- Use named constants for discussion content limits:
    - `MAX_DISCUSSION_CONTENT_BYTES = 32768`
    - `MAX_DISCUSSION_TEXT_LENGTH = 5000`
- `parentReplyId`, when provided, must belong to a reply in the same domain, course, `entityType`, `entityId`, and top-level comment
- lesson discussion summaries for `/discussions` must exclude lessons that are not available in the actor's current course viewer mode
- `/discussions` summary generation must resolve available lesson IDs first and use them as a server-side query filter before reading discussion counts
- product admins can read and participate in manageable discussions from the course viewer without learner enrollment
- product admins can create course viewer comments/replies when they either pass learner access checks or have product management permissions for the product
- product admin moderation deletes must happen through the report queue, soft-delete comments/replies, and preserve placeholders
- delete operations must record `deletedBy`, `deletedByRole`, and `deletedAt`
- product admin report status updates that restore content must make the content visible in eligible course viewer contexts again and record `restoredBy` and `restoredAt`
- summary counters must be updated when comments/replies are created, soft-deleted, or restored
- lesson discussion subscriber records must be updated when comments/replies are created, soft-deleted, or restored
- authors can edit their own non-deleted content; product admins and moderators cannot edit other users' content
- edit mutations must apply the same Tiptap document shape, byte size, and plain-text length validation as create mutations
- deleted comments and replies cannot be edited
- authors can delete their own content
- course viewer participants can like/unlike available, non-deleted comments and replies
- product admins can report any manageable discussion content from the course viewer discussion panel
- product admins can soft-delete or restore discussion content only through report/moderation flows
- duplicate reports by the same user for the same `contentType` and `contentId` are rejected or idempotently returned

Future product-level blog comment validation:

- for `entityType = "product"`, `entityId` must match `productId`
- for `entityType = "product"`, enforce existing product/blog visibility and access rules before reading or writing discussion content

## Notification Requirements

Add granular activity types for course discussion comments/replies and reactions.

- Add `COURSE_DISCUSSION_COMMENT_CREATED` for both top-level comments and replies.
- Store the specific comment event kind in metadata as `eventType: "comment_created" | "reply_created"`.
- Add `COURSE_DISCUSSION_REACTED` for newly created likes on comments or replies.
- A reaction activity must notify only the liked content's author, exclude self-likes, and must not be emitted for unlikes or idempotent repeated likes.
- Seed default notification preferences for both activity types using the existing notification preference system.
- Show `Course discussion comment created` and `Course discussion reacted` in the existing General notification preferences screen.
- Both preference rows must support the same App and Email channel toggles as the existing community activity rows.
- Product admins and learners should use these preference rows to control discussion notifications independently.
- Respect recipient notification preferences before creating in-app or email notifications.
- Build the recipient list as a unique set of `userId`s before sending notifications.
- Exclude the actor from recipients.
- Deduplicate recipients in application logic when a user appears through multiple paths, for example as both participant and product admin.
- DB-level notification idempotency/deduplication is out of scope for this release.
- Use the existing community-style notification implementation pattern:
    - call `recordActivity(...)` from `apps/web` after comment/reply creation
    - pass recipient IDs through `metadata.forUserIds`
    - let the existing `dispatch-notification` queue process notification preferences and app/email channels
- Do not introduce a new notification batching/fanout system for this release.

Recipients for a new top-level comment:

- active `ProductDiscussionSubscriber` users for the same discussion target
- all product admins for the product
- exclude the actor

Recipients for a reply:

- active `ProductDiscussionSubscriber` users for the same discussion target
- all product admins for the product
- exclude the actor

Recipient for a reaction:

- the liked comment/reply author only
- exclude the actor, so self-likes do not create activity

Product admin recipient resolution must use the same product-management permission source used to authorize dashboard product management access.

Notification payload metadata:

```ts
{
    productId: string;
    productSlug: string;
    entityType: "lesson" | "product";
    entityId: string;
    commentId: string;
    replyId?: string;
    eventType?: "comment_created" | "reply_created";
    contentType?: "comment" | "reply";
}
```

Notification href:

- For `entityType = "lesson"`, must navigate to the lesson.
- For `entityType = "product"`, href generation is reserved for the future product-level discussion surface.
- This release must not create `entityType = "product"` notification hrefs unless product-level comments are explicitly added to scope.
- Must open the discussion panel.
- Must include a stable target for scroll and highlight.
- For recipients who can manage the product, include `preview=true` so notification links remain valid for unpublished products or lessons. Determine management access from the recipient's current permissions and product ownership; never grant preview from URL state alone.
- Example shape:
    - `/course/[slug]/[id]/[lessonId]?discussion=open#discussion-comment-[commentId]`
    - `/course/[slug]/[id]/[lessonId]?discussion=open#discussion-reply-[replyId]`
    - manager target: `/course/[slug]/[id]/[lessonId]?discussion=open&preview=true#discussion-comment-[commentId]`

Email:

- Email notification links must use the same href target.
- Link generation should live in the shared notification helper used by in-app notification formatting.

Highlight:

- On page load, if a discussion hash exists, open the panel, scroll the target into view, and apply a temporary highlight.
- Reuse the community comment highlight approach where practical.
- Remove or fade the highlight after a short timeout.

## Permissions And Tenant Safety

- Every query/mutation must include `domain` in persistence filters.
- Do not allow cross-domain access by productId, entityType, entityId, commentId, replyId, or reportId.
- Preserve the domain-owner invariant; this feature must not update owner users or domain email.
- Product admin capabilities must follow existing product management permissions.
- For `entityType = "lesson"`, normal learner access must follow existing enrollment, visibility, drip, and lesson access rules.
- For `entityType = "lesson"`, product management permissions can grant non-enrolled product admins course viewer participation for manageable lessons.
- For `entityType = "product"`, course viewer read/write APIs must reject access in this release because product-level comments are future-only.
- Public lesson access is not discussion access. GraphQL discussion queries and mutations must verify enrollment or product management permissions before resolving discussion-owned data or user-specific fields such as `hasLiked`.
- Deleted content remains addressable for moderation and notification context, but user-facing content text is hidden.
- Deleted content remains stored for admin moderation/audit visibility unless a future hard-delete policy is introduced.
- Course viewer APIs must redact deleted comment/reply content and return only deleted placeholders.
- Admin dashboard APIs may return deleted comment/reply content, but the UI must display a clear deleted label.
- Hard-deleting a product must delete all records for that `productId` from `ProductDiscussionComment`, `ProductDiscussionReply`, `ProductDiscussionLike`, `ProductDiscussionReport`, `ProductDiscussionSummary`, and `ProductDiscussionSubscriber`.
- Hard-deleting a product must also delete its product discussion `Activity` and `Notification` records by `{ domain, "metadata.courseId": productId }`. This cleanup is intentionally based on product ownership metadata rather than a fixed activity-type list so legacy and future discussion activity types cannot leave dead notification links.
- `Activity` and `Notification` must each define an index on `{ domain: 1, "metadata.courseId": 1 }` for bounded product cleanup.
- Product deletion must not scan or explicitly delete generic `RateLimitEvent` records. These short-lived records expire through their 25-hour TTL index.
- Product discussion cleanup must run from every product hard-deletion path, including the interactive `deleteCourse` flow and `packages/scripts/src/cleanup-domain.ts`.
- Deleting a user must perform the following to ensure GDPR compliance while preserving thread layout and summary counts:
    - Hard-delete all `ProductDiscussionLike`, `ProductDiscussionSubscriber`, and `ProductDiscussionReport` documents authored/created by the deleted user.
    - Anonymize all `ProductDiscussionComment` and `ProductDiscussionReply` documents authored by the user by setting their `userId` to `"deleted"`, marking them `deleted: true`, and clearing their `content` field to `{ type: "doc", content: [] }`.

## UX Requirements

- Use shadcn UI conventions for dashboard/admin surfaces.
- Use `@courselit/page-primitives` for every public course viewer discussion UI surface outside `/dashboard` so controls inherit the active theme.
- Use existing course viewer visual language for learner and preview surfaces.
- Use `TextEditor` without its toolbar for comment/reply composition and `TextRenderer` for rendering stored comment/reply Tiptap documents.
- Enforce comment/reply content limits on the client for user feedback, but treat server-side validation as authoritative.
- Put all new strings in `apps/web/config/strings.ts`.
- Use the existing admin empty state component for dashboard empty states where applicable.
- Do not add a marketing/landing page.
- Ensure the discussion panel does not overlap core lesson controls on desktop.
- On mobile, the full-screen panel must trap focus appropriately and return focus to the trigger on close.
- Long comments must wrap without overflowing the panel.
- Loading, empty, error, disabled, deleted, and reported states must be explicit.

## Testing Strategy

Required tests:

- GraphQL logic tests under existing `logic.test.ts` files for new discussion behavior.
- Model/helper tests for threading, Tiptap document validation/formatting, and notification recipient selection.
- Course manage UI tests for toggle visibility and save behavior.
- Course viewer discussion index and panel tests for non-enrolled product admins with product management permissions.
- Course viewer tests for:
    - discussion sidebar visibility
    - mobile full-screen behavior where feasible
    - `/discussions` route listing and navigation URL
    - URL query/hash opening and highlight behavior
- Moderation tests for report listing, status updates, duplicate reports, and permission checks.
- Restore tests for report-gated admin restoration and course viewer visibility after restore.
- Edit tests for author-only access, content revalidation, `isEdited` flag persistence, and rejection of edits on deleted content.
- Rate-limit tests for comment, reply, like/unlike, report, and duplicate content windows.
- Notification tests for href generation and recipient selection.

Run:

- `pnpm test`
- `pnpm lint`
- `pnpm prettier`

If REST endpoints or public API OpenAPI fragments are touched:

- update `openapi.mjs`
- run the relevant OpenAPI generation/check command for `apps/web`

## Rollout Plan

### Phase 1: Data And Server Logic

- Add original discussion models:
    - `ProductDiscussionComment`
    - `ProductDiscussionReply`
    - `ProductDiscussionLike`
    - `ProductDiscussionReport`
    - `ProductDiscussionSummary`
    - `ProductDiscussionSubscriber`
- Add course discussion setting.
- Add reusable rate-limit helper backed by `RateLimitEvent`.
- Add discussion GraphQL operations and permission checks.
- Add notification activity type, default notification preferences, preference UI support, recipient selection, href metadata, and tests.

### Phase 2: Course Viewer UI

- Add course viewer sidebar icons.
- Add discussion trigger and responsive panel.
- Add lesson discussion list, composer, reply flow, like/unlike flow, delete flow, and report flow.
- Add URL open/scroll/highlight behavior.
- Add `/course/[slug]/[id]/discussions` route.

### Phase 3: Admin UI

- Add product manage discussions toggle.
- Add only the reported-content queue under product manage at `/dashboard/product/[id]/manage/discussions/reports`.
- Add report table, filters, status updates, report-gated soft delete, restore, and moderation actions.

### Phase 4: Verification And Polish

- Run full tests, lint, and formatter.
- Manually verify desktop and mobile normal learner, product manager course viewer interaction, and admin report queue flows.
- Verify notification emails and in-app notifications navigate to the target content.
- Verify disabled discussions preserve existing data but block new writes.

## Task Breakdown

### Task 1: Product Discussion Persistence Models

Description: Add the discussion-owned Mongo models and indexes, plus the generic `RateLimitEvent` model.

Acceptance criteria:

- `ProductDiscussionComment`, `ProductDiscussionReply`, `ProductDiscussionLike`, `ProductDiscussionReport`, `ProductDiscussionSummary`, `ProductDiscussionSubscriber`, and `RateLimitEvent` are defined with the fields and indexes in this PRD.
- Discussion models use `productId`, `entityType`, and `entityId`; no `CourseDiscussion*` models are introduced.
- `ProductDiscussionSummary.lastActivityAt` is required and summary counters include `activityCountIncludingDeleted`.
- A shared product discussion cleanup helper hard-deletes all discussion-owned records plus product-linked activity and notification records, and is used by both interactive product deletion and domain cleanup. Generic rate-limit events remain TTL-managed.

Verification:

- Model/index tests or schema assertions cover required indexes where the repo has precedent.
- Existing test suite still passes for model imports.

Dependencies: None.

Estimated scope: Medium.

### Task 2: Product Discussion Setting

Description: Add the `discussions` setting to product reads and updates for course products.

Acceptance criteria:

- Missing `discussions` is treated as `false`.
- The manage settings screen can save the toggle for course products only.
- Viewer reads hide discussion entry points when discussions are disabled.

Verification:

- GraphQL tests cover default false and update behavior.
- Course manage UI test covers toggle visibility and save behavior.

Dependencies: Task 1.

Estimated scope: Medium.

### Task 3: Shared Discussion Validation And Rate Limits

Description: Implement reusable server helpers for target validation, Tiptap content validation, duplicate-content checks, and rate limiting.

Acceptance criteria:

- `entityType = "lesson"` validates product ownership, lesson membership, enabled discussions, and the actor's current course viewer access mode.
- Normal learner mode enforces enrollment/drip/access rules.
- Product management permissions allow product admins to participate in manageable lesson discussions without learner enrollment.
- `entityType = "product"` is rejected by this release's discussion API/UI paths.
- Comment/reply content enforces `MAX_DISCUSSION_CONTENT_BYTES = 32768` and `MAX_DISCUSSION_TEXT_LENGTH = 5000`.
- Rate limits use `scope = "course_discussion"` and `subjectId = ${productId}:${entityType}:${entityId}`.

Verification:

- Logic tests cover access rejection, disabled discussions, invalid Tiptap documents, size limits, duplicate content, and rate-limit failures.

Dependencies: Tasks 1-2.

Estimated scope: Medium.

### Task 4: Comment And Reply APIs

Description: Add paginated read APIs and write/delete APIs for comments and replies.

Acceptance criteria:

- Comments use cursor pagination and include `likesCount`, `hasLiked`, `replyCount`, and limited reply previews.
- Replies are pageable by `commentId` with stable ordering.
- Creating comments/replies updates summaries and subscriber records.
- Author delete soft-deletes content, updates visible counters, preserves placeholders, and updates subscriber state when needed.

Verification:

- GraphQL logic tests cover pagination, deep-link target loading, create, reply-to-reply flattening with `parentReplyId`, delete, counter updates, course viewer redaction of deleted content, and preview access participation.

Dependencies: Task 3.

Estimated scope: Medium.

### Task 5: Likes And Reports APIs

Description: Add like/unlike and report APIs for comments and replies.

Acceptance criteria:

- Likes use `ProductDiscussionLike` with unique `{ domain, contentType, contentId, userId }`.
- Like/unlike updates target `likesCount` idempotently and rejects deleted/inaccessible content.
- Reports use `ProductDiscussionReport` with duplicate report protection.

Verification:

- GraphQL logic tests cover comment likes, reply likes, duplicate likes, unlike idempotency, report creation, duplicate reports, tenant isolation, and deleted-content rejection.

Dependencies: Task 4.

Estimated scope: Medium.

### Checkpoint: Server Foundation

- `pnpm test` passes for discussion-related logic.
- Cursor response shapes and indexes match this PRD.
- Tenant and access checks are covered before course viewer UI begins.

### Task 6: Course Viewer Discussion Panel

Description: Build the course viewer discussion trigger, desktop sidebar, mobile full-screen panel, composer, comment list, replies, likes, delete, and report flows.

Acceptance criteria:

- Public course viewer UI uses `@courselit/page-primitives` and existing viewer visual language.
- Composer uses toolbarless `TextEditor`; rendering uses `TextRenderer`.
- Deleted placeholders, loading, empty, disabled, error, and reported states are explicit.
- Desktop and mobile layouts do not overlap lesson controls.

Verification:

- Course viewer tests cover panel visibility, create/reply/like/delete/report interactions where feasible.
- Manual desktop and mobile checks pass.

Dependencies: Tasks 4-5.

Estimated scope: Medium.

### Task 7: Course Viewer All Discussions Page And Deep Links

Description: Add `/course/[slug]/[id]/discussions` and notification/hash-driven opening/highlighting behavior.

Acceptance criteria:

- The page lists only server-filtered lesson summaries available in the actor's current course viewer mode.
- In normal learner mode, this means accessible/dripped lessons.
- Guests and logged-in non-enrolled users see no discussion hub rows or counts, including for public lessons with `requiresEnrollment: false`.
- For product admins, this means lessons they can manage through product management permissions.
- Lessons with zero activity are hidden; lessons with only deleted placeholders can appear via `activityCountIncludingDeleted`.
- Clicking a row navigates to the relevant lesson and opens the discussion panel.
- Hash targets scroll to and temporarily highlight the exact comment or reply, including targets outside the first page.

Verification:

- Tests cover normal learner accessible lesson filtering, no future-lesson leakage outside preview, preview-visible lesson filtering, row navigation, panel opening, and highlight behavior.
- Tests cover that guests and logged-in non-enrolled users do not see the discussion sidebar entry, do not receive `/discussions` summaries, and do not receive lesson comments/replies for public lessons with `requiresEnrollment: false`.

Dependencies: Task 6.

Estimated scope: Medium.

### Task 8: Notifications And Preferences

Description: Add discussion notification activity, preference row, recipient resolution, and href generation.

Acceptance criteria:

- `COURSE_DISCUSSION_COMMENT_CREATED` and `COURSE_DISCUSSION_REACTED` are added with default preferences.
- General notification preferences show `Course discussion comment created` and `Course discussion reacted`, each with App and Email toggles.
- Recipients include active subscribers and product admins from the dashboard product-management permission source, excluding the actor and deduped in application logic.
- Lesson notification hrefs open the correct lesson discussion target and include stable highlight anchors.

Verification:

- Notification tests cover preference handling, recipient selection, admin/participant dedupe, actor exclusion, and href generation.

Dependencies: Tasks 4 and 7.

Estimated scope: Medium.

### Task 9: Reported Content Queue And Moderation

Description: Add `/dashboard/product/[id]/manage/discussions/reports` with community-style status flow and report-gated soft delete/restore.

Acceptance criteria:

- This is the only discussion-specific management route under product manage.
- The route shows only reported content and report workflow controls.
- There is no dashboard discussion browser for normal discussion reading, commenting, replying, liking, deleting, or reporting.
- Reports can be filtered by status.
- Status cycle is `pending -> accepted -> rejected -> pending`, with UI label `accepted`.
- Moving to `accepted` soft-deletes the target and updates visible counters/subscribers.
- Moving away from `accepted` restores only when no other accepted report exists for the same target.

Verification:

- Moderation tests cover status transitions, counter changes, restore behavior, duplicate accepted reports, permission checks, and course viewer visibility changes.

Dependencies: Tasks 4-5.

Estimated scope: Medium.

### Checkpoint: End-To-End Feature

- Course viewer participant can create, reply, like, report, delete, browse `/discussions`, and follow deep links.
- Guests and logged-in non-enrolled users cannot see or interact with course discussions, even when they can view a public lesson whose `requiresEnrollment` is `false`.
- Product admin with product management permissions can participate in manageable lesson discussions without learner enrollment.
- Product admin can enable discussions, browse discussions and report content from the course viewer, then moderate reports and restore content from the reported-content queue.
- Notification preferences and delivery are verified for app and email channels.

### Task 11: Final Verification And Release Prep

Description: Run full verification, tighten UI details, and prepare for release.

Acceptance criteria:

- Disabled discussions hide entry points and block new writes while preserving data.
- Product-level `entityType = "product"` records remain schema-supported but rejected by this release's APIs.
- No community persistence collections are used for product discussion data.
- All new strings are in `apps/web/config/strings.ts`.

Verification:

- Run `pnpm test`.
- Run `pnpm lint`.
- Run `pnpm prettier`.
- Manual smoke test desktop and mobile normal learner, preview, product manager course viewer interaction, and report queue flows.

Dependencies: Tasks 1-9.

Estimated scope: Small.

## Success Criteria

- Product admins can enable and disable discussions for a product.
- When enabled, every lesson available in the actor's current course viewer mode can host a lesson-specific discussion for `entityType = "lesson"`.
- Replies are always flattened under the top-level comment.
- Course viewer participants can like and unlike visible comments and replies, and like state/counts update consistently.
- `/course/[slug]/[id]/discussions` lists lesson discussion activity and deep-links correctly.
- `/course/[slug]/[id]/discussions` never reveals discussion activity outside the actor's current course viewer mode. Non-preview learners must not see lessons that have not dripped; effective preview sessions may show preview-visible lessons even without learner enrollment.
- `/course/[slug]/[id]/discussions` never reveals discussion activity to guests or logged-in non-enrolled users, including for public lessons with `requiresEnrollment: false`.
- New comments and replies notify discussion participants and product admins, excluding the actor.
- Email and in-app notification links open the exact lesson discussion target and highlight it temporarily.
- Course viewer participants can report content and delete their own content.
- Product admins can browse discussions and report content from the course viewer without learner enrollment.
- Product admins can soft-delete/restore comments and replies only from report/moderation views.
- No community persistence collection is used for course discussion data.
- Tenant, course, lesson, and permission checks are covered by tests.

## Open Questions

- None at this time.
