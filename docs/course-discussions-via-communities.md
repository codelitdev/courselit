# PRD: Course Discussions via Hidden Communities

## Objective

CourseLit should support first-class course discussions by linking a course to a hidden community and rendering that community's lesson-specific conversations inside the course experience.

The goal is to reuse the existing communities system for membership, comments, replies, likes, reports, moderation, and notifications, while making discussions feel native to a course rather than like a separate community app.

Primary users:

- Course creators and school admins who want discussion spaces attached to course content.
- Enrolled learners who want to ask and answer questions in lesson context.
- Moderators who need existing community moderation tools for course discussions.

Success means:

- A course admin can enable discussions from course management.
- A hidden linked community is created or restored for the course.
- Each lesson can have at most one linked discussion post, created lazily when discussion activity first happens for that lesson.
- Learners can comment in the lesson viewer and browse a course-wide discussion stream.
- Course admins can access moderation through the attached hidden community card in the course manage area.
- The linked community is not discoverable from normal community listings, public community discovery, or unrelated dashboard community navigation.
- When a course is hard-deleted, its linked discussion community and discussion content are hard-deleted according to the course deletion flow.

## Product Scope

### In Scope

- Add a `discussions` toggle to course products.
- Create, restore, and hide a course-linked community behind the scenes.
- Lazily create a linked `CommunityPost` the first time someone starts discussion activity on a lesson.
- Keep lesson discussion posts synced when lessons are created, renamed, or deleted.
- Reuse existing community comments, replies, likes, reports, and moderation screens.
- Add a lesson discussion panel in the course viewer.
- Add a course-wide discussion stream.
- Add notification links that point users back to the actual course lesson or discussion stream.
- Hide course-linked communities from normal community listing and discovery paths.

### Out of Scope for V1

- Real-time subscriptions or websockets.
- A new discussion/comment data model.
- Lesson group-level discussions.
- Standalone manual creation of course discussion communities.
- Enabling this for blogs/download products unless they already use the course lesson viewer.
- Per-lesson discussion toggle controls.
- Course restore or course duplication behavior. CourseLit does not currently support these flows; if they are added later, this PRD must be revisited before discussions are copied or restored.

## Key Product Decisions

- A course can have discussions enabled or disabled with `Course.discussions`.
- A course can have only one linked discussion community, stored as `Course.discussionCommunityId`.
- `Community.courseId` is the discriminator for course-linked discussion communities. If `courseId` is set, the community is not a standalone community and must follow the course-discussion lifecycle and access rules.
- Toggling discussions off hides and disables the linked community, but does not delete posts, comments, reports, or memberships.
- Toggling discussions back on restores the same linked community and existing discussion data.
- When discussions are enabled for an existing course, lesson posts are not backfilled. A lesson-linked post is created only when discussion activity first occurs for that lesson.
- Eligible course learners can read course discussions through course-aware lesson/discussion surfaces without linked-community membership. Linked-community `COMMENT` membership is created only on the learner's first course discussion comment/reply write.
- Learners must not access the linked community feed or standalone community post pages directly.
- Course admins access moderation from an attached hidden community card inside the course manage page.

## Admin Moderation Experience

Course-linked communities should not appear in the normal Communities dashboard list. Instead, the course manage page should show an attached community card when discussions are enabled.

Card behavior:

- The card displays the linked community's name, status, member count, and discussion activity summary if available.
- Clicking the card opens the existing community management experience for the linked community.
- From there, admins use the normal community tools for posts, comments, reports, and member review. Settings that can break the course link must be hidden or read-only.
- The card is the intended navigation path for course admins.

Important security distinction:

- The linked community is hidden from discovery and normal navigation.
- It is not required to be impossible to open by direct URL.
- Direct URLs must still enforce authorization.
- Authorized course admins/moderators can open direct management URLs.
- Students or unauthorized users who guess a URL must be denied, redirected, or shown not found.

Course-linked community controls:

- The normal community moderation experience can be reused for posts, comments, reports, and member review.
- Product/access/lifecycle settings that conflict with course ownership must be locked in the UI and guarded server-side.
- The delete community action must be disabled for any community with `courseId` set.
- The disabled delete action should explain: "This community is attached to a course and can't be deleted here. It will be deleted automatically when the course is deleted."
- Community enable/disable controls must route admins back to the course discussions toggle or be hidden.
- Payment plan, pricing, checkout, included products, public join, auto-accept, joining reason, and public page/discovery settings must be hidden or read-only.
- Lesson-linked post title/content/category/deletion must be system-controlled. Moderators may moderate comments and reports, but must not be able to break the one-post-per-lesson mapping.
- Lesson-linked posts must not be pinnable in v1. Any existing `togglePinned` behavior must reject posts with `lessonId` set.
- Any existing `updateCommunityPost` behavior must reject title, content, category, pinned, visibility, or author changes for posts with `lessonId` set. Lesson title sync is the only supported way to update a lesson-linked post title.
- Any existing `deleteCommunityPost` behavior must reject manual deletion for posts with `lessonId` set. Lesson deletion or course deletion is the only supported deletion path.
- If manual member role edits are allowed, the PRD implementation must define whether course membership sync overwrites them or stores an explicit manual override. The default is no manual role edits for auto-synced student memberships in v1.

Moderator authorization:

- Course-linked communities must use an effective moderator check, not only stored community membership.
- A user is an effective moderator when they can currently manage the parent course through the same authorization contract used by course logic: resolve the parent course by `domain` and `courseId`, then apply the course ownership check (`checkOwnershipWithoutModel` / course ownership helper) together with the existing course management permission rules used by `getCourseOrThrow`.
- Users who can manage the parent course must not be copied into permanent `MODERATE` community memberships only for that reason. Their access must be evaluated dynamically on every request so gaining or losing course-management rights takes effect immediately.
- Existing community routes and mutations must call a centralized community access helper for every protected action. The helper resolves standalone vs course-linked behavior and must be the only place that decides whether a user can read, comment, moderate, update, or delete community resources.
- Materialized `MODERATE` memberships may be used only for explicit course-discussion moderators if needed by existing UI, but they are not the source of truth for course owners or users with current parent-course management rights.
- The attached community card should be visible only to users who pass the same effective moderator check.

## Learner Experience

### Lesson Viewer

When discussions are enabled and the learner can access the current course lesson:

- Desktop shows a right-side discussion panel beside the lesson content.
- Mobile shows a shadcn/Radix drawer or sheet opened from a discussion button.
- The panel shows the linked lesson post title and comment thread.
- If no linked post exists yet, the panel shows an empty discussion state and the first comment creates the lesson-linked post.
- Learners can add comments, replies, likes, and reports using existing community behavior.
- The panel includes a link to the course-wide discussion stream.

The lesson discussion panel must only load after the course viewer has established that the learner can access the lesson. The server-side course discussion query must also enforce this; hiding generic community links is not a security boundary.

The panel must not reduce lesson content below a usable reading/video width. If space is constrained, the panel should collapse behind a button rather than squeezing the lesson.

### Course Discussion Stream

When discussions are enabled:

- The course page exposes a "Discussions" entry for eligible viewers.
- The discussion stream aggregates lesson-linked posts that already exist for the course.
- Lessons with no discussion activity and no linked post do not appear in the stream.
- Posts are shown in reverse chronological post creation order for v1.
- Each post links back to its lesson.
- For learners, the course-wide stream must include only lessons they can currently access. Admins/effective moderators may see all lesson-linked posts.

## Data Model

Extend shared domain models in `@courselit/common-models`:

```ts
export interface Course {
    discussions?: boolean;
    discussionCommunityId?: string | null;
}

export interface Community {
    courseId?: string | null;
}

export interface CommunityPost {
    lessonId?: string | null;
}
```

Update active Mongoose schemas:

- Course and Community schemas live in `@courselit/orm-models` and are re-exported from `apps/web/models`.
- CommunityPost currently has an app-local schema at `apps/web/models/CommunityPost.ts`; update the active schema and avoid drift with any shared ORM copy.

Schema fields:

```ts
// Course
discussions: { type: Boolean, default: false },
discussionCommunityId: { type: String, default: null },

// Community
courseId: { type: String, default: null },

// CommunityPost
lessonId: { type: String, default: null },

```

Indexes:

- Add a partial unique index on communities for `{ domain: 1, courseId: 1 }` where `courseId` exists.
- Add a partial unique index on posts for `{ domain: 1, communityId: 1, lessonId: 1 }` where `lessonId` exists.
- Do not add a broad unique membership index for all memberships; existing payment/membership history semantics may allow multiple historical memberships outside this feature.
- Add a read index on communities for `{ domain: 1, courseId: 1, deleted: 1, enabled: 1 }` for course-linked community resolution and orphan checks.
- Add a read index on posts for `{ domain: 1, communityId: 1, lessonId: 1, deleted: 1 }` for lesson discussion panel lookup.
- Add a read index on posts for `{ domain: 1, communityId: 1, deleted: 1, createdAt: -1 }` for admin/effective-moderator course discussion stream pagination.
- Add a read index on posts for `{ domain: 1, communityId: 1, deleted: 1, lessonId: 1, createdAt: -1 }` for learner course discussion stream filtering by accessible lesson IDs and stream count.
- Keep existing community slug/name constraints in mind when auto-generating the linked community.

`Community.courseId` semantics:

- Missing or null `courseId` means standalone community.
- Non-null `courseId` means course-linked discussion community.
- Course-linked communities must always resolve product identity through `Course.discussionCommunityId` and `Community.courseId`, not through slug/name.
- If CourseLit later needs more system-owned community types, introduce an explicit `kind`; do not infer additional types from unrelated fields.

No existing course data backfill migration is required in v1 because all new fields are optional and default to disabled/null. The rollout still needs schema/index deployment. Enabling discussions on an existing course must not backfill lesson posts.

## Backend Requirements

### Course Toggle

Extend the existing course update flow rather than adding a separate mutation.

Discussion enable/disable must run inside a MongoDB transaction. The transaction is the consistency boundary for:

- Updating the course `discussions` and `discussionCommunityId` fields.
- Creating or restoring the linked community.
- Resolving and attaching the school's existing internal free payment plan.

The transaction must not bulk-create lesson posts or active student community memberships. Lesson posts are lazy/on-demand.

If any operation inside the transaction fails, the entire toggle must roll back and the mutation must return an error. The course must not be left with `discussions: true` unless the linked community is committed and references the school's existing internal plan successfully.

When `discussions` changes from false to true:

- Authenticate and authorize through the existing course management checks.
- If `discussionCommunityId` points to an existing linked community, restore it with `enabled: true` and `deleted: false`.
- If no linked community exists, create one with:
    - `domain: ctx.subdomain._id`
    - `courseId: course.courseId`
    - `enabled: true`
    - `deleted: false`
    - `autoAcceptMembers: true`
    - default category `General`
    - stable name, slug, and page ID derived from the course.
    - `defaultPaymentPlan` set to the school's existing internal free payment plan.
- Store the linked community ID on the course.
- Do not create lesson discussion posts during enable. Lesson posts are created lazily when the first discussion activity occurs for that lesson.
- Ensure effective moderators can access the linked community management UI through dynamic parent-course authorization.
- Do not bulk-create active student `COMMENT` community memberships during enable. Learner discussion access is checked from current course and lesson access.

When `discussions` changes from true to false:

- Set `Course.discussions = false`.
- Keep `Course.discussionCommunityId`.
- Set the linked community to discussion-disabled/hidden from learners without setting `deleted: true`.
- Keep `deleted: false` so the attached admin card, direct authorized admin routes, reports, and notification resolution continue to work.
- Do not delete posts, comments, reports, or memberships.
- Learner-facing discussion UI must disappear or become read-only/unavailable.
- Admins can still reach the attached community from course management as an archive/review path if product wants archive access.

When the parent course is deleted:

- If the course is hard-deleted, hard-delete the linked community and its discussion content as part of the same course deletion flow.
- Hard delete must remove the linked community, lesson posts, comments, replies, reactions, reports, notifications, memberships, and post subscriptions. It must not delete the school-wide internal payment plan because that plan is shared by the school and not owned by the linked discussion community.
- If CourseLit later adds a soft-delete/archive course lifecycle, the linked discussion community should follow that same soft-delete/archive lifecycle. V1 only needs the hard-delete behavior because course restore is not supported.
- The cascade must be idempotent and domain-scoped.
- Do not allow manual deletion from the linked community's own management screen; deletion is owned by the parent course lifecycle.
- Course restore and course duplication do not need v1 behavior because CourseLit does not currently support those flows.

Orphan handling:

- A community with non-null `courseId` but no parent course in the same `domain` is an orphan.
- Orphaned course-linked communities must be hidden from all learner and non-internal paths.
- Direct admin access to an orphan should return a safe not-found or pending-deletion state unless an internal repair tool is being used.
- Add an admin-safe repair check that finds orphaned course-linked communities and hard-deletes them according to the same hard course deletion policy.

### Internal Payment Plan and Identity

Course-linked communities must reuse the school's existing internal free payment plan for compatibility with existing community/payment plan fields. A school/domain can have only one internal payment plan, so course discussion communities must not create per-community internal plans.

Rules:

- The school-wide internal payment plan must not be exposed in pricing, checkout, or public join UI.
- The school-wide internal payment plan must have no included products.
- Learners should not join course-linked communities via `joinCommunity`; course-scoped discussion APIs verify course access directly.
- The school-wide internal plan must not trigger included-product processing.

Slug and page identity:

- Generate a stable slug and page ID with a reserved prefix, for example `community-course-discussion-${course.courseId}`.
- If a generated slug conflicts with a standalone community, append a short unique suffix.
- If a linked community already exists for `courseId`, restore it instead of creating a new one.
- Runtime course discussion resolution must use `discussionCommunityId` and `courseId`, not slug.

### Lesson Sync

When a lesson is created in a course with discussions enabled:

- Create the lesson as usual.
- Do not create a linked `CommunityPost` immediately.
- The linked `CommunityPost` is created lazily when discussion activity first occurs for that lesson.

When a lesson title changes:

- If a linked post already exists, update the linked post title.
- If no linked post exists yet, no post should be created only for a title change.

When a lesson is deleted:

- If a linked post already exists, soft-delete it.
- Preserve comments and reports for record keeping, but hide them from learner UI.

When discussions are enabled for an existing course:

- Do not backfill missing lesson posts.
- Existing lessons remain without linked posts until the first discussion activity on each lesson.
- Lazy post creation must use idempotent upsert behavior keyed by `domain`, `communityId`, and `lessonId`.

When the first discussion activity happens for a lesson:

- Resolve and authorize the parent course and lesson through course-scoped APIs.
- Upsert the linked `CommunityPost` by `domain`, `communityId`, and `lessonId`.
- Use empty post content or a minimal system body; the lesson itself is the discussion context.
- Mark or treat the post as system-managed, not as a normal learner-created post.
- Create the first comment only after the linked post exists.
- The operation must be idempotent and concurrency-safe so simultaneous first comments create only one post.

First-comment concurrency contract:

- `createCourseDiscussionComment` and `createCourseDiscussionReply` must run discussion content writes in a small MongoDB transaction. For comments, the transaction also covers lazy lesson-post creation. Production environments must support this transaction; fail closed if a transaction cannot be started.
- Authorization can be computed before the transaction, but the transaction must re-read the course, linked community, and lesson by `domain` before writing.
- Upsert the lesson-linked post by `domain`, `communityId`, and `lessonId`.
- Use `$setOnInsert` for generated post fields such as `postId`, `userId`, `category`, `content`, `pinned: false`, and `createdAt`.
- Store `course.creatorId` as the post `userId` for lesson-linked posts. The learner who writes the first comment must not become the post owner.
- Hide author display for lesson-linked system posts in learner UI and admin moderation surfaces unless a future design explicitly needs to show the stored owner.
- Use `$set` only for fields that are safe to refresh, such as `title` from the current lesson and `deleted: false`.
- If the post upsert loses a race and receives a duplicate-key error, catch it, re-read the existing post by the unique key in the same retry path, and continue.
- Retry transient transaction errors using the same retry policy used elsewhere in the app.
- The concurrency guarantee is exactly one linked post per `domain + communityId + lessonId`.
- The first comment itself follows normal comment semantics. Do not promise exactly-once comment creation unless the API later accepts a client idempotency key.

### Course Access Sync

Course discussion learner access should be derived from current course and lesson access, not linked community memberships.

- Active course students are eligible to comment through course-scoped discussion APIs.
- Students should not get `POST` in v1 because lesson posts are system-managed.
- Course membership activation should not bulk-create discussion community memberships during discussion enable.
- Opening the lesson discussion panel or course discussion stream must not create a linked community membership.
- Creating a course discussion comment or reply must not create or restore a linked community membership.
- Course membership expiry, deletion, or unenrollment should revoke discussion access through the existing course access checks.
- Included-product membership flows should make the learner eligible through the course membership they create, without creating linked community memberships.
- Do not use `recordProgress` as the enrollment sync point.
- Course-linked discussion access must never unlock additional products.

Moderator access rules:

- Parent course owners/creators who pass the course ownership helper are moderators through dynamic authorization.
- Users with existing course management permissions are moderators only if they pass the same parent-course authorization path used by course management logic.
- Optional explicitly assigned discussion moderators may be represented with `MODERATE` community memberships.
- Losing course ownership/management rights under the course ownership helper or losing explicit `MODERATE` membership must remove moderation access on the next request without requiring a background sync.

Preferred integration points:

- Course-scoped discussion write APIs for comments and replies.
- Course deletion cleanup.
- Any existing membership expiry, deletion, unenrollment, or invitation revocation path that removes active course access.

### Community Listing and Discovery

Course-linked communities must be hidden from:

- General community listing queries.
- Community counts.
- Public community discovery pages.
- Learner "my communities" lists unless the product explicitly wants to show course discussions there.
- Global community feeds, standalone community feeds, and standalone community post pages for learners.

Use a filter equivalent to:

```ts
$or: [{ courseId: { $exists: false } }, { courseId: null }];
```

This handles old records with no field and standalone records with `courseId: null`.

Direct `getCommunity` and community admin routes may still resolve linked communities if the viewer is authorized.

Generic community post/feed APIs must reject course-linked communities for learners through the centralized community access helper. Effective moderators may use existing community moderation routes, but learner reads and interactions must go through course-scoped discussion APIs that enforce course and lesson access.

### Community Access Helper

Implement one centralized helper, for example `assertCommunityAccess`, and use it from every community query/mutation and course-discussion wrapper that touches community resources.

Required inputs:

- `ctx`
- `community` or `communityId`
- `action`: `readFeed`, `readPost`, `comment`, `deleteComment`, `react`, `report`, `moderate`, `updateSettings`, `deleteCommunity`, `manageMembers`, `managePosts`
- optional resource context such as `post`, `lessonId`, `courseId`, or `contentId`

Required behavior:

- Always scope lookups by `domain`.
- For standalone communities, preserve existing community membership and role semantics.
- For course-linked communities, detect the type via non-null `community.courseId`.
- For course-linked communities and learner actions, reject generic community feed/post access and require course-scoped APIs.
- For course-linked learner comment and reply actions, reject generic community mutations and require course-scoped discussion write APIs.
- For course-linked learner reply/react/report actions, require active linked-community membership and current access to the target lesson.
- For course-linked moderation actions, resolve the parent course and apply the same course authorization contract used by course management logic.
- For course-linked settings/update/delete actions, reject changes that would break the product-owned lifecycle, access model, payment model, or lesson-post mapping.
- For lesson-linked posts, generic post management mutations must reject `togglePinned`, `updateCommunityPost`, and `deleteCommunityPost` attempts that would mutate the system-managed lesson post contract.
- Return consistent `item_not_found` vs `action_not_allowed` behavior so hidden course-linked communities are not accidentally discoverable by unauthorized users.

No community route may perform ad hoc `community.courseId` authorization branching outside this helper except to gather inputs required by the helper.

### Community Mutation Access Map

Every existing community mutation that touches course-linked community resources must call `assertCommunityAccess` with a consistent action and resource context before mutating data.

Required mapping:

| Existing mutation             | Helper action     | Course-linked behavior                                                                                                                                                                                                                |
| ----------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createCommunityPost`         | `managePosts`     | Reject for course-linked communities in v1 except internal system helpers. Lesson posts are created only by course-scoped lazy post creation.                                                                                         |
| `updateCommunityPost`         | `managePosts`     | Reject for `lessonId` posts. Lesson title sync is the only supported title update path.                                                                                                                                               |
| `deleteCommunityPost`         | `managePosts`     | Reject for `lessonId` posts. Lesson deletion and course deletion are the only supported deletion paths.                                                                                                                               |
| `togglePinned`                | `managePosts`     | Reject for `lessonId` posts. Course discussion stream does not support pinned lesson posts in v1.                                                                                                                                     |
| `togglePostLike`              | `react`           | For learners, require an existing course-linked membership and access to the post's `lessonId`. Reject if the post is not lesson-linked.                                                                                              |
| `postComment`                 | `comment`         | Reject learner comment/reply writes for course-linked communities. Learners must use course-scoped discussion write mutations. Effective moderators may use existing moderation routes only after course-linked authorization passes. |
| `toggleCommentLike`           | `react`           | Resolve the parent post and require lesson access for learners. Learner notification rules apply only when the liked comment belongs to the recipient.                                                                                |
| `toggleCommentReplyLike`      | `react`           | Resolve the parent post/comment and require lesson access for learners. Learner notification rules apply only when the liked reply belongs to the recipient.                                                                          |
| `deleteComment`               | `deleteComment`   | Resolve the parent post and require lesson access for learner-owned deletes or effective moderator access for moderation deletes. Preserve existing delete semantics after authorization.                                             |
| `reportCommunityContent`      | `report`          | Resolve reported post/comment/reply back to the parent post and require lesson access for learners.                                                                                                                                   |
| `updateCommunityReportStatus` | `moderate`        | Require effective moderator access through the parent course or explicit `MODERATE` membership.                                                                                                                                       |
| `updateMemberStatus`          | `manageMembers`   | Course-linked student memberships are derived from course access. Reject manual status changes for auto-synced learner memberships unless a future manual override model is specified.                                                |
| `updateMemberRole`            | `manageMembers`   | Reject manual role changes for auto-synced learner memberships in v1. Explicit discussion moderator assignment may be supported only if the product defines that flow.                                                                |
| `deleteCommunity`             | `deleteCommunity` | Reject for course-linked communities. Parent course hard deletion owns linked discussion deletion.                                                                                                                                    |
| `joinCommunity`               | `comment`         | Reject for course-linked communities. Course-scoped discussion write APIs lazily create memberships after course and lesson access are verified.                                                                                      |
| `leaveCommunity`              | `manageMembers`   | Reject or no-op for auto-synced course-linked learner memberships; course unenrollment/expiry owns access removal.                                                                                                                    |

Implementation notes:

- Mutations must resolve the community by `domain` before calling the helper.
- Mutations that receive only `communityId` and `postId` must load the post and pass it to the helper so `lessonId` can be enforced.
- Mutations that receive `commentId`, `replyId`, or report content IDs must resolve the parent post and pass the post plus content context to the helper.
- For course-linked learner read actions, current course and lesson access is required and membership creation must not occur.
- For course-linked learner comment/reply writes, generic community mutations must reject the request and direct implementation to course-scoped write mutations.
- For other course-linked learner write actions such as reactions and reports, current course and lesson access must pass before existing membership is reused.
- Effective moderators may use existing moderation routes, but the helper must still protect system-managed lesson post invariants.

### Course Discussion Queries

Add course-scoped GraphQL queries only where existing community queries would expose implementation details or allow the wrong access pattern.

Recommended queries:

```graphql
getCourseDiscussionPost(courseId: String!, lessonId: String!): CommunityPost
getCourseDiscussionStream(courseId: String!, page: Int, limit: Int): [CommunityPost]
getCourseDiscussionStreamCount(courseId: String!): Int
```

Recommended mutations:

```graphql
createCourseDiscussionComment(courseId: String!, lessonId: String!, content: String!): CommunityComment
createCourseDiscussionReply(courseId: String!, lessonId: String!, commentId: String!, content: String!, parentReplyId: String): CommunityComment
```

Behavior:

- Resolve the course by `domain` and `courseId`.
- Require `Course.discussions === true`.
- Resolve the linked community by `discussionCommunityId`.
- For learners, verify current course access before returning discussion reads. Read-only queries must not create linked-community membership.
- For learners, require access to the requested lesson before returning its discussion post or comments.
- `getCourseDiscussionPost` may return null when no discussion activity has created a linked post yet.
- For learner stream reads, derive the accessible lesson IDs once through the same course-viewer access rules, then query posts with `lessonId: { $in: accessibleLessonIds }`.
- Apply the same accessible-lesson-ID predicate to `getCourseDiscussionStreamCount`.
- No special `$in` fallback is required in v1 because CourseLit courses are not expected to contain thousands of lessons. Revisit this only if course size assumptions change.
- Return only non-deleted lesson-linked posts.
- For the stream, mirror the existing community post list contract for v1: offset pagination with `page` and `limit`, default `page = 1`, default `limit = 10`, sorted by post `createdAt DESC`.
- Return the total stream count through `getCourseDiscussionStreamCount`.
- Do not sort the course discussion stream by latest comment/reply activity in v1.
- Do not prepend pinned posts in the course discussion stream unless a future product decision allows pinned course discussion posts.

Existing learner comment/reply mutations must not be reused for course-linked communities. Learner comments and replies must go through course-scoped write mutations so lazy post creation and lesson access checks stay in one boundary.

Existing learner like/report mutations can be reused only if they call the centralized community access helper and enforce course/lesson access for course-linked communities.

`createCourseDiscussionComment` behavior:

- Resolve the course and lesson by `domain`.
- Require `Course.discussions === true`.
- Require current lesson access for learners.
- Upsert the lesson-linked post by `domain`, `communityId`, and `lessonId` if it does not already exist.
- Create the comment against the linked post only after authorization passes.
- Return the created comment using the existing community comment shape.

`createCourseDiscussionReply` behavior:

- Resolve the course, lesson, linked community, linked post, and parent comment by `domain`.
- Require `Course.discussions === true`.
- Require current lesson access for learners.
- Create the reply against the existing linked post/comment only after authorization passes.
- Return the updated comment using the existing community comment shape.

## Notifications

Notifications should reuse the existing notification pipeline and centralized formatter.

Requirements:

- Add course-discussion-aware notification actions only if existing community actions cannot produce the correct message and href.
- Prefer storing metadata with `courseId`, `lessonId`, `communityId`, `postId`, `commentId`, and `replyId`.
- Update notification formatting in `packages/common-logic/src/utils/get-notification-message-and-href.ts`.
- Learners must not receive broad community-feed notifications for new lesson posts or new top-level comments in course-linked communities.
- Learner notifications for course-linked communities are limited to activity on content they authored, such as:
    - a reply to their original comment or reply.
    - a like/reaction on their original comment or reply.
- Before emitting a learner notification, verify that the recipient is the author of the target comment/reply and currently has access to the parent course and lesson.
- Before resolving a learner notification message or href, re-check current course and lesson access. If access has been lost, return an empty message/href or a generic unavailable state using the existing notification behavior.
- Notification messages must not reveal hidden lesson titles, post titles, comment text, or reply text to learners who cannot currently access the lesson.
- Email and in-app notifications should deep-link to the actual lesson discussion when possible:

```txt
/course/[slug]/[courseId]/[lessonId]#[commentId-or-replyId]
```

Fallback:

- If the learner can still access the course but the lesson no longer exists, link to the course discussion stream without exposing the deleted lesson title.
- If the course/community/post cannot be resolved, return an empty message/href using the existing notification behavior.
- If the learner cannot currently access the course or lesson, return an empty message/href using the existing notification behavior.

## Security Requirements

Course discussions touch user-generated content, authorization, and multi-tenant data. These requirements are mandatory:

- Scope every course, community, post, comment, and report query by `domain`.
- Never trust `courseId`, `communityId`, `lessonId`, or `postId` from the client.
- Enforce community authorization through the centralized community access helper; do not duplicate standalone vs course-linked checks route by route.
- Do not expose linked communities in listing surfaces just because a user has membership.
- Do not allow learners to access course-linked community feeds or standalone community post pages.
- Enforce course and lesson access in course-scoped discussion read/comment APIs for learners.
- Enforce moderator permissions on direct community management routes.
- Evaluate course-linked community moderator access dynamically from the current user permissions and parent course ownership/management rights.
- Enforce course and lesson access for discussion participation.
- Do not grant student `POST` role for system-managed lesson posts in v1.
- Prevent stale access when a course membership expires or is removed.
- Block manual deletion of course-linked communities in the UI and in backend mutations.
- Block or guard configuration changes that can break course-discussion invariants, including payment plans, included products, public join settings, community delete/disable, and lesson-linked post lifecycle edits.
- Block generic post-management mutations from pinning, editing, moving, re-categorizing, changing authorship, or deleting lesson-linked posts.
- Prevent race conditions with idempotent post upserts and partial unique indexes.
- Require MongoDB transactions for course-scoped first comment/reply write paths that create lesson posts or discussion content.
- Do not include lesson content in auto-created discussion post content.
- Do not store the first commenting learner as the owner of the lesson-linked system post.
- Do not modify owner users, owner permissions, or `domain.email`; preserve the domain-owner invariant.
- Keep notification links tenant-safe and generated server-side.
- Do not emit or resolve learner notifications for course-linked communities unless the notification is tied to activity on the learner's own comment/reply and current lesson access passes.

Learner access model:

- Learners can access course discussion content only through course-scoped APIs that first validate course and lesson access.
- Learners can read and participate in course discussions without linked-community membership when course and lesson access pass.
- Effective moderators can access linked discussions through moderation routes.

## Design Requirements

Use existing CourseLit/shadcn conventions and app strings.

Admin UI:

- Add a discussions section in the course manage page.
- Use a switch for enable/disable.
- Show the attached hidden community card when enabled.
- Card click opens the existing community management UI.
- On the linked community manage screen, disable destructive lifecycle controls such as delete and show copy explaining that the community is attached to a course and will be deleted with the course.
- Hide or lock access/product configuration controls for course-linked communities.
- Show clear disabled/loading/error states during toggle operations.

Learner UI:

- Use a desktop sidebar only when enough width is available.
- Use a mobile drawer/sheet for small screens.
- Preserve the course navigation and completion controls.
- Do not overlap lesson media, quiz controls, SCORM iframe, or completion buttons.
- Reuse existing community comment components where practical.
- Use skeletons for loading comment threads.
- Use clear empty states when no comments exist.

Accessibility:

- All discussion buttons and drawer controls must be keyboard accessible.
- Drawer/sheet focus must be trapped while open and restored on close.
- Icon buttons need accessible labels.
- Comments and reply forms must have clear labels and error messages.

String management:

- In `apps/web`, add display strings to `apps/web/config/strings.ts` before importing them into `.tsx` files.

## Project Structure

Expected implementation areas:

- Shared model types: `packages/common-models/src`
- Shared Mongoose schemas: `packages/orm-models/src/models`
- App-local active models where present: `apps/web/models`
- Centralized community access helper: `apps/web/graphql/communities` or a shared helper module used by community and course discussion GraphQL logic
- GraphQL course logic and types: `apps/web/graphql/courses`
- GraphQL lesson sync: `apps/web/graphql/lessons`
- Existing community logic and filters: `apps/web/graphql/communities`
- Notification formatter: `packages/common-logic/src/utils/get-notification-message-and-href.ts`
- Course manage UI: `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]`
- Lesson viewer UI: `apps/web/components/public/lesson-viewer`
- Course public/viewer routes: `apps/web/app/(with-contexts)/course/[slug]/[id]`

Tests for GraphQL changes should reuse existing `logic.test.ts` files in the relevant GraphQL subdirectories.

## Code Style

Follow the existing repo patterns:

- Use `pnpm`.
- Use existing GraphQL modules instead of adding blurry new boundaries.
- Use zod and react-hook-form for new forms when a form is needed.
- Use refs to track current form data for submit enable/disable behavior.
- Use shadcn/Radix primitives for switches, cards, drawers/sheets, and dialogs.
- Keep app strings in `apps/web/config/strings.ts`.
- Keep implementation idempotent and scoped by `domain`.

Example helper style:

```ts
await CommunityPostModel.updateOne(
    {
        domain,
        communityId,
        lessonId,
    },
    {
        $setOnInsert: {
            userId: creatorId,
            category: "General",
            content: "",
            pinned: false,
        },
        $set: {
            title: lessonTitle,
            deleted: false,
        },
    },
    { upsert: true },
);
```

## Commands

Run from the repository root unless noted.

```bash
pnpm --filter @courselit/web dev
pnpm test
pnpm --filter @courselit/web build
pnpm lint
pnpm prettier
```

If REST endpoints or OpenAPI-covered responses change:

```bash
pnpm --filter @courselit/web openapi:generate
```

## Testing Strategy

GraphQL and backend tests:

- Enabling discussions creates a linked community and stores `discussionCommunityId`.
- Enabling discussions for an existing course does not backfill lesson posts.
- Enabling discussions is atomic: injected failures during community creation or internal plan resolution roll back the entire toggle.
- Re-enabling discussions restores the same linked community and posts.
- Disabling discussions hides the community without deleting posts/comments.
- Disabling discussions is atomic: the course and linked community state cannot diverge after a failed toggle.
- Disabling discussions does not set the linked community to `deleted: true`.
- Concurrent enable calls create only one linked community and do not create lesson posts.
- Concurrent enable calls do not bulk-create student discussion memberships.
- Concurrent first-comment calls for the same lesson create only one linked lesson post.
- Production first-comment and first-reply write paths fail closed if a MongoDB transaction cannot be started.
- `createCourseDiscussionComment` handles duplicate-key races by re-reading the existing linked post and continuing safely.
- `createCourseDiscussionComment` does not promise exactly-once comment creation without a future client idempotency key.
- Linked community creation reuses the school's existing internal free payment plan and does not create a per-community internal plan.
- Lesson create/update/delete syncs linked posts.
- Lesson create does not create a linked post until discussion activity starts.
- Lesson-linked posts store `course.creatorId` as `userId`, not the first commenter.
- Learner and admin UI hide author display for lesson-linked system posts.
- Hard course deletion hard-deletes the linked community and its discussion content.
- Orphan repair finds course-linked communities whose parent course no longer exists and hard-deletes them using the hard course deletion cleanup semantics.
- General community list/count/feed queries exclude course-linked communities.
- Learners cannot fetch course-linked communities through generic community feed/post routes even if they have linked-community membership.
- Learner course discussion stream excludes lessons the learner cannot currently access.
- Learner course discussion stream derives accessible lesson IDs once and queries posts with `lessonId: { $in: accessibleLessonIds }`.
- Direct community fetch/admin paths still work for authorized moderators.
- Learner participation is authorized from current course/lesson access; admin moderation access is dynamically authorized from current course permissions or explicit `MODERATE` membership.
- Gaining or losing current parent-course management rights immediately grants or removes moderation access to linked course discussion communities.
- Removed/expired course members lose linked community access.
- A learner with course access through included products is eligible for course discussions if that course has discussions enabled.
- Course discussion queries are tenant-scoped and reject cross-domain access.
- Every existing community query/mutation that touches posts, comments, reports, memberships, settings, or deletion uses the centralized access helper.
- Tests cover that bypassing course-scoped discussion APIs through generic community APIs is rejected for learners.
- Tests cover the community mutation access map for `postComment`, `toggleCommentLike`, `toggleCommentReplyLike`, `deleteComment`, `reportCommunityContent`, and `updateCommunityReportStatus`.
- Tests cover that generic `postComment` rejects learner comment/reply writes for course-linked communities.
- Tests cover that `createCourseDiscussionComment` and `createCourseDiscussionReply` are the only learner comment/reply write paths for course-linked communities.
- Tests cover that comment/reply/like/report mutations resolve the parent post and enforce `lessonId` access for course-linked learner actions.
- `togglePinned` rejects lesson-linked posts.
- `updateCommunityPost` rejects title, content, category, pinned, visibility, and author changes for lesson-linked posts.
- `deleteCommunityPost` rejects manual deletion of lesson-linked posts.
- Course discussion stream returns posts sorted by `createdAt DESC` with page/limit pagination and a separate count query.
- Course discussion stream excludes lessons that do not yet have a linked discussion post.
- `createCourseDiscussionComment` lazily creates the linked lesson post before creating the first comment.
- `createCourseDiscussionReply` creates a reply on an existing lesson-linked post without creating linked community membership.
- Read-only course-scoped discussion APIs do not create linked community membership.
- Course-scoped discussion write APIs do not create or restore linked community membership.
- Eligible course learners can read and write lesson discussions without linked-community membership.
- Notification formatter creates lesson deep links and safe fallbacks.
- Learners do not receive course-linked community notifications for new top-level comments or generic feed activity.
- Learners receive course-linked community notifications only for replies/likes on their own comments/replies.
- Notification emission and formatting do not reveal hidden lesson titles or discussion content after lesson access is lost.

Frontend tests:

- Course manage page shows toggle and attached community card when enabled.
- Attached community card opens the linked community management route.
- General community dashboard does not show the linked community.
- Linked community management screen disables delete and locks course-owned access/product settings.
- Lesson viewer renders discussion panel on desktop and drawer on mobile.
- Discussion UI handles loading, empty, error, and unauthorized states.
- Keyboard navigation works for toggle, card link, drawer open/close, comment form, and report controls.

Manual visual checks:

- 320px mobile.
- 768px tablet.
- 1024px desktop.
- 1440px desktop.
- Long lesson titles and long comment content do not overflow.
- Video, PDF, quiz, SCORM, and text lessons remain usable with discussions enabled.

## Boundaries

Always:

- Scope all data access by `domain`.
- Route all community access decisions through the centralized access helper.
- Reuse existing community primitives wherever possible.
- Keep toggle and lazy post creation idempotent.
- Run discussion enable/disable state changes inside a MongoDB transaction.
- Add/update tests for GraphQL changes.
- Keep linked communities hidden from normal discovery.
- Treat non-null `Community.courseId` as the course-discussion discriminator.
- Keep course-linked community lifecycle controlled by the parent course.
- Use the school-wide internal free payment plan with no included products for linked discussion communities.
- Preserve existing moderation/reporting behavior.

Ask first:

- Adding real-time infrastructure.
- Adding a new discussion data model.
- Changing core community permission semantics.
- Showing course discussions in global feeds or learner community lists.
- Making lesson-level access stricter than course access.
- Permanently deleting discussion data.

Never:

- Delete discussion comments on toggle off.
- Set the linked community to `deleted: true` when discussions are merely toggled off.
- Allow manual deletion of a course-linked community from the community manage screen.
- Allow generic community post mutations to pin, edit, move, re-categorize, change authorship, or manually delete lesson-linked posts.
- Grant students moderation privileges through course membership sync.
- Grant students arbitrary post creation in course-linked communities in v1.
- Allow the school-wide internal payment plan used by course discussions to unlock included products.
- Trust client-supplied role state.
- Expose course-linked communities in public community discovery.
- Modify owner users, owner permissions, or `domain.email`.

## Implementation Plan

### Dependency Order

Build the feature in this order:

1. Data model and indexes.
2. Centralized community access helper.
3. Course-linked community lifecycle helpers.
4. Course-scoped discussion read/write APIs.
5. Existing community mutation guards.
6. Course deletion and orphan repair.
7. Notifications.
8. Admin UI.
9. Learner UI.
10. Final hardening.

This order keeps security and invariants in place before UI exposes the feature.

### Integration Strategy

- Extend existing GraphQL modules instead of adding a separate discussion subsystem.
- Keep the enable/disable path small and transactional.
- Land backend foundations before frontend so UI can consume stable contracts.
- Add GraphQL tests alongside each backend task in the existing `logic.test.ts` files or existing community test files.
- Keep frontend slices shippable behind the `Course.discussions` field.

### Checkpoints

Checkpoint A, after Tasks 1-4:

- Model fields and indexes exist.
- Linked community lifecycle works.
- No learner-facing UI exists yet.
- Run `pnpm test`.

Checkpoint B, after Tasks 5-8:

- Learner reads/writes are course-scoped.
- Generic community bypass paths are blocked.
- Notification access behavior is defined and tested.
- Run `pnpm test`.

Checkpoint C, after Tasks 9-12:

- Admin and learner UI flows are wired.
- Responsive/manual checks are complete.
- Run `pnpm test`, `pnpm lint`, `pnpm prettier`, and `pnpm --filter @courselit/web build`.

## Task Breakdown

### Task 1: Add Model Fields and Indexes

Description: Add the persistent fields and indexes required to identify course-linked communities and lesson-linked posts.

Acceptance criteria:

- `Course` supports `discussions` and `discussionCommunityId`.
- `Community` supports `courseId`.
- `CommunityPost` supports `lessonId`.
- Partial unique/read indexes from the Data Model section are present.

Verification:

- Run model/type tests if present.
- Run `pnpm test`.

Dependencies: None.

Files likely touched:

- `packages/common-models/src/course.ts`
- `packages/common-models/src/community.ts`
- `packages/common-models/src/community-post.ts`
- `packages/orm-models/src/models/course.ts`
- `packages/orm-models/src/models/community.ts`
- `apps/web/models/CommunityPost.ts`

Estimated scope: Medium.

### Task 2: Add Course GraphQL Fields and Toggle Input

Description: Extend the existing course GraphQL shape and update input so admins can enable or disable discussions through the existing course update flow.

Acceptance criteria:

- Course GraphQL type exposes `discussions` and `discussionCommunityId`.
- Existing update course mutation accepts `discussions`.
- Authorization uses existing course management checks.
- Toggle does not create lesson posts or learner memberships.

Verification:

- Add/update course GraphQL tests in the existing test file.
- Run `pnpm test`.

Dependencies: Task 1.

Files likely touched:

- `apps/web/graphql/courses`
- `apps/web/graphql/courses/logic.test.ts`

Estimated scope: Medium.

### Task 3: Implement Linked Community Lifecycle Helper

Description: Create an idempotent helper that creates, restores, hides, and resolves the linked course discussion community and attaches the school's existing internal free payment plan.

Acceptance criteria:

- Enabling discussions creates or restores exactly one linked community.
- The school's existing internal free payment plan is reused; no per-community internal plan is created.
- The enable transaction includes only course fields, linked community, and internal plan resolution.
- Disabling discussions hides learner access without setting `deleted: true`.

Verification:

- Tests cover enable, disable, re-enable, concurrent enable, and internal plan behavior.
- Run `pnpm test`.

Dependencies: Tasks 1-2.

Files likely touched:

- `apps/web/graphql/courses/logic.ts`
- `apps/web/graphql/courses/logic.test.ts`
- `apps/web/graphql/paymentplans` or existing payment plan helper modules

Estimated scope: Medium.

### Task 4: Add Centralized Community Access Helper

Description: Implement `assertCommunityAccess` and route community authorization decisions through it for standalone and course-linked communities.

Acceptance criteria:

- Helper supports the action set defined in the PRD.
- Standalone community behavior remains unchanged.
- Course-linked learner feed/post access is rejected outside course-scoped APIs.
- Effective moderator checks resolve the parent course and use the existing course ownership/management contract.

Verification:

- Tests cover standalone preservation, learner denial, effective moderator allow, and unauthorized direct URL denial.
- Run `pnpm test`.

Dependencies: Task 1.

Files likely touched:

- `apps/web/graphql/communities`
- `apps/web/graphql/communities/logic.test.ts`
- `apps/web/graphql/courses/logic.ts` if course ownership helpers need exporting

Estimated scope: Medium.

### Task 5: Filter Course-Linked Communities from Lists and Feeds

Description: Hide course-linked communities from general community discovery, lists, counts, feeds, and learner community surfaces.

Acceptance criteria:

- General community list/count queries exclude non-null `courseId`.
- Learner feed/post routes reject course-linked communities through `assertCommunityAccess`.
- Direct admin fetch still works for effective moderators.

Verification:

- Tests cover list/count/feed exclusion and direct authorized admin access.
- Run `pnpm test`.

Dependencies: Task 4.

Files likely touched:

- `apps/web/graphql/communities/query.ts`
- `apps/web/graphql/communities/logic.ts`
- `apps/web/graphql/communities/logic.test.ts`

Estimated scope: Medium.

### Task 6: Add Course Discussion Read APIs

Description: Add course-scoped read queries for lesson discussion post lookup and course discussion stream.

Acceptance criteria:

- `getCourseDiscussionPost` returns null if no lesson-linked post exists yet.
- `getCourseDiscussionStream` returns existing lesson-linked posts sorted by `createdAt DESC`.
- Learner stream filters by accessible lesson IDs.
- Read queries do not create linked community membership.

Verification:

- Tests cover access, empty state, stream ordering, stream count, and no membership creation on read.
- Run `pnpm test`.

Dependencies: Tasks 3-5.

Files likely touched:

- `apps/web/graphql/courses`
- `apps/web/graphql/courses/logic.test.ts`

Estimated scope: Medium.

### Task 7: Add Course-Scoped Comment and Reply Writes

Description: Add `createCourseDiscussionComment` and `createCourseDiscussionReply` as the only learner comment/reply write paths for course-linked communities.

Acceptance criteria:

- First comment lazily creates the lesson-linked post with `course.creatorId` as `userId`.
- First comment and first reply do not create or restore linked community membership.
- First reply does not create a post unless the post already exists.
- Transactions are required and fail closed if unavailable.
- Duplicate-key races re-read existing posts and continue safely.

Verification:

- Tests cover first comment, first reply, duplicate-key races, concurrent first comments, no exactly-once comment guarantee, and access denial.
- Run `pnpm test`.

Dependencies: Tasks 3-6.

Files likely touched:

- `apps/web/graphql/courses`
- `apps/web/graphql/communities/helpers.ts`
- `apps/web/graphql/courses/logic.test.ts`

Estimated scope: Large.

### Task 8: Guard Existing Community Mutations

Description: Apply the Community Mutation Access Map to existing community mutations.

Acceptance criteria:

- Generic `postComment` rejects learner comment/reply writes for course-linked communities.
- Like/report/delete/comment moderation paths resolve the parent post and enforce lesson access or moderator access.
- `togglePinned`, `updateCommunityPost`, and `deleteCommunityPost` reject lesson-linked posts.
- Member list/status/role routes reject course-linked communities in v1.

Verification:

- Tests cover each mutation listed in the access map.
- Run `pnpm test`.

Dependencies: Tasks 4 and 7.

Files likely touched:

- `apps/web/graphql/communities/mutation.ts`
- `apps/web/graphql/communities/logic.ts`
- Existing community GraphQL test files

Estimated scope: Large.

### Task 9: Add Lesson Sync and Course Deletion Cleanup

Description: Sync existing lesson mutations with lazy discussion posts and hard-delete linked discussion data when a course is hard-deleted.

Acceptance criteria:

- Lesson create does not create a post.
- Lesson title update updates the linked post only if it exists.
- Lesson delete soft-deletes the linked post only if it exists.
- Hard course deletion hard-deletes linked discussion community data.
- Orphan repair hard-deletes orphaned linked communities.

Verification:

- Tests cover lesson create/update/delete, course hard delete, and orphan repair.
- Run `pnpm test`.

Dependencies: Tasks 3 and 7.

Files likely touched:

- `apps/web/graphql/lessons`
- `apps/web/graphql/courses`
- `apps/web/graphql/courses/logic.test.ts`
- `apps/web/graphql/lessons/logic.test.ts`

Estimated scope: Medium.

### Task 10: Harden Course Access Boundaries

Description: Ensure course discussion access follows current course membership without materializing linked community memberships.

Acceptance criteria:

- Course-scoped read/write APIs verify current course and lesson access.
- Expired/deleted/unenrolled course members lose linked discussion access.
- Included-product course access makes learners eligible without eagerly creating community memberships.
- Course discussion comment/reply writes do not create or restore linked community memberships.

Verification:

- Tests cover no membership creation, expiry/removal, and included-product eligibility.
- Run `pnpm test`.

Dependencies: Tasks 3 and 7.

Files likely touched:

- `apps/web/graphql/courses`
- `packages/common-logic` if shared with queue or other membership flows
- Existing membership/course test files

Estimated scope: Medium.

### Task 11: Add Notification Behavior

Description: Update notification creation/formatting so course discussion notifications are narrow and lesson-access aware.

Acceptance criteria:

- Learners do not receive broad notifications for new lesson posts or top-level comments.
- Learners receive notifications only for replies/likes on their own comments/replies.
- Emission and resolution re-check current course/lesson access.
- Hidden lesson titles/content do not leak in notifications.

Verification:

- Tests cover notification emission, formatter links, lost access fallback, deleted lesson fallback, and hidden title behavior.
- Run `pnpm test`.

Dependencies: Tasks 6-8.

Files likely touched:

- `packages/common-logic/src/utils/get-notification-message-and-href.ts`
- `apps/web/graphql/notifications`
- `apps/web/graphql/communities/logic.ts`
- Notification test files

Estimated scope: Medium.

### Task 12: Add Admin Manage UI

Description: Add the course discussions toggle and attached hidden community card to course management.

Acceptance criteria:

- Admins can toggle discussions from course management.
- Enabled courses show the linked community card.
- Card opens existing community management for authorized admins.
- Linked community settings that break product ownership are hidden/read-only.
- Delete is disabled with the specified copy.

Verification:

- Frontend tests or manual checks cover toggle, card, disabled delete, and locked settings.
- Run `pnpm --filter @courselit/web build`.

Dependencies: Tasks 2-5.

Files likely touched:

- `apps/web/app/(with-contexts)/dashboard/(sidebar)/product/[id]`
- `apps/web/app/(with-contexts)/dashboard/(sidebar)/communities`
- `apps/web/config/strings.ts`

Estimated scope: Large.

### Task 13: Add Learner Lesson Discussion UI

Description: Add the lesson discussion panel and mobile drawer inside the course viewer.

Acceptance criteria:

- Eligible learners can read discussions before membership exists.
- Empty state appears when no lesson-linked post exists.
- First comment uses `createCourseDiscussionComment`.
- Replies use `createCourseDiscussionReply`.
- Desktop and mobile layouts remain usable.

Verification:

- Manual checks at 320px, 768px, 1024px, and 1440px.
- Check text/video/PDF/quiz/SCORM lesson types.
- Run `pnpm --filter @courselit/web build`.

Dependencies: Tasks 6-8.

Files likely touched:

- `apps/web/components/public/lesson-viewer`
- `apps/web/app/(with-contexts)/course/[slug]/[id]`
- `apps/web/config/strings.ts`

Estimated scope: Large.

### Task 14: Add Course Discussion Stream UI

Description: Add the course-wide discussion stream page that uses course-scoped stream APIs.

Acceptance criteria:

- Stream shows existing lesson-linked posts only.
- Learners see only accessible lessons.
- Stream is sorted by `createdAt DESC`.
- Empty, loading, and unauthorized states are handled.

Verification:

- Frontend tests or manual checks cover stream, empty state, access filtering, and navigation to lessons.
- Run `pnpm --filter @courselit/web build`.

Dependencies: Task 6.

Files likely touched:

- `apps/web/app/(with-contexts)/course/[slug]/[id]/discussions`
- `apps/web/config/strings.ts`

Estimated scope: Medium.

### Task 15: Final Hardening and Release Verification

Description: Run full verification, fix integration issues, and prepare the feature for review.

Acceptance criteria:

- All GraphQL tests pass.
- Full test suite passes.
- Lint, prettier, and web build pass.
- Manual responsive checks are complete.
- PR description links to this PRD and calls out migration/index requirements.

Verification:

- Run `pnpm test`.
- Run `pnpm lint`.
- Run `pnpm prettier`.
- Run `pnpm --filter @courselit/web build`.

Dependencies: Tasks 1-14.

Files likely touched:

- Any files touched by prior tasks for final fixes.

Estimated scope: Medium.

## Acceptance Criteria

- Admin enables discussions and sees an attached community card on the course manage page.
- Clicking the attached card opens existing community management for the linked hidden community.
- The linked community is absent from normal Communities dashboard listing.
- Existing lessons do not receive linked discussion posts during enable.
- New lessons do not receive linked discussion posts automatically.
- A lesson receives one linked discussion post only when discussion activity first occurs for that lesson.
- Eligible course learners can read lesson discussions before they have linked-community membership.
- Learners can comment on lesson discussions when they have active course and lesson access; their linked-community `COMMENT` membership is created/restored lazily only on the first comment/reply write.
- Learners can comment only on lesson discussions for lessons they can currently access.
- Learners cannot access the linked community's standalone feed or standalone post pages.
- Learners cannot access moderation routes.
- Admins can moderate linked discussions through existing community moderation screens.
- Admins cannot manually delete the linked community from community management.
- Admins cannot pin, edit, re-categorize, or manually delete lesson-linked system posts through generic community post controls.
- Course-linked community payment/access settings cannot be changed into standalone community behavior.
- The school-wide internal payment plan used by course discussions does not unlock additional products.
- Learner notifications for course-linked communities are sent only for replies/likes on the learner's own comments/replies and route back to the lesson only while the learner still has lesson access.
- Toggling off hides learner discussion UI but preserves existing discussion data.
- Toggling back on restores the same community and prior discussion history.
