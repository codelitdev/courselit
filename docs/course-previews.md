# Course Previews PRD

## Document Control

- Status: Draft
- Last updated: June 7, 2026
- Owner: Web/Product team
- Target workspace: `apps/web` (`@courselit/web`)

## Assumptions

1. This PRD covers the current Next.js course viewer under `apps/web/app/(with-contexts)/course/[slug]/[id]`, including lesson pages and discussion entry points rendered in that viewer.
2. "Course manager" means a user who either has `course:manage_any` permission, or has `course:manage` permission and `course.creatorId === user.userId`.
3. Course previews are an explicit viewer mode selected by `preview=true`. Manager permissions are a capability; `preview=true` is the user's intent to use that capability in the viewer.
4. Course preview mode must not create a purchase, enrollment, membership, progress record, certificate eligibility, or drip state for the course manager.
5. Course managers should see every lesson in the course viewer as unlocked only when they are eligible to manage the course and the viewer is opened in course preview mode, including unpublished lessons, lessons that normally require enrollment, and sections that are blocked by relative or exact-date drip rules.
6. The viewer must pass preview intent to the backend. Backend course and lesson reads must resolve content based on effective preview mode, not on client-only presentation checks.
7. Eligible course managers can preview unpublished courses and unpublished lessons from the course viewer through the preview flow. Public purchase and learner-facing checkout surfaces must continue to use public product visibility and must not expose unpublished products to learners or guests.
8. Learners and anonymous users keep the existing enrollment, payment, lesson-level access, and drip behavior.
9. If an enrolled course manager opens the course viewer without preview mode, they should get the normal learner experience for that enrollment, including real progress indicators and completion controls.
10. No database schema change is expected.
11. Existing GraphQL query/mutation boundaries should be extended only where needed; do not add new GraphQL operations if existing course/lesson queries can carry the behavior cleanly.

## Objective

Allow course managers to explicitly preview the learner-facing course viewer for courses they can manage without enrolling themselves. This lets school owners and course managers review the course through a course preview session, navigate through all course structure, and inspect unpublished, dripped, or enrollment-gated content without needing to alter customer records.

Success means:

1. A user with `course:manage_any` can access any course's viewer and lessons without enrollment in preview mode, including unpublished courses and lessons.
2. A user with `course:manage` can access a course's viewer and lessons without enrollment in preview mode only when they are the course creator, including unpublished courses and lessons.
3. The same `course:manage` user cannot bypass enrollment for courses created by another user, even if `preview=true` is present.
4. Previewed course content appears unlocked in the sidebar and lesson page only in preview mode, including enrollment-required lessons and dripped sections.
5. The course preview path does not mutate enrollment, purchases, progress, completed lessons, accessible groups, drip timestamps, certificates, payment data, or notifications.
6. Existing learner and anonymous behavior remains unchanged.
7. An enrolled course manager who opens the course without `preview=true` gets the learner progress experience, including sidebar completion check marks and completion controls.
8. A non-enrolled course manager in preview mode should not be able to mark a lesson complete or record progress because they are not enrolled.

## Product Requirements

### Course Manager Eligibility

- A course manager is eligible when:
    - the signed-in user has `course:manage_any`; or
    - the signed-in user has `course:manage` and the course's `creatorId` equals the signed-in user's `userId`.
- Eligibility must be evaluated server-side for every course/lesson read path that can reveal gated content.
- Eligibility alone must not force preview-mode presentation. The viewer must distinguish manager capability from active preview mode.
- Implementation should reuse the same access rule already encoded by `getCourseOrThrow` in `apps/web/graphql/courses/logic.ts`: `course:manage_any` grants access to any course in the tenant, while `course:manage` grants access only when the user owns the course.
- Client-side checks may be used for presentation, but must not be the only enforcement.
- Course manager eligibility must respect tenant/domain boundaries exactly as existing course reads do.

### Course Preview Mode

- Course preview behavior is active only when both conditions are true:
    - the signed-in user is eligible to manage the course; and
    - the course viewer request includes `preview=true`.
- The viewer must pass the requested preview mode to backend course and lesson reads by extending existing `getCourse` and `getLessonDetails` GraphQL queries with a `preview: Boolean` argument.
- The backend must derive effective preview mode as:
    - `requestedPreview === true`; and
    - the signed-in user can manage the course in the current tenant.
- Backend responses must resolve course structure and lesson content using effective preview mode:
    - when effective preview mode is true, include course-preview-visible content such as unpublished lessons and drip/enrollment-gated lessons;
    - when effective preview mode is false, use normal learner/public visibility and access rules, even if the signed-in user has course-management permissions.
- The returned course field should be named `isPreview` and should be true only when effective preview mode is true. It should not merely indicate that the signed-in user has course-management capability.
- `isPreview` replaces the branch-only `isManager` course viewer field. Because `isManager` has not shipped, no backwards-compatible dual-field migration is required.
- If a future API needs to expose raw management capability separately, it should use a distinct field name such as `canManageCourse`; this PRD does not require exposing that capability to the viewer.
- The dashboard preview menu item must open the viewer with `preview=true`.
- If a return target is used for the exit course action, it should be carried separately from preview mode, for example `returnTo=/dashboard/product/[id]`.
- Course viewer links should be built through a centralized URL helper instead of ad hoc string concatenation.
- The centralized course-viewer URL helper must preserve registered viewer session query params across course intro, sidebar lesson links, lesson previous/next links, lesson-title back links, and discussion links.
- Viewer session query params must be defined in one place with per-param validation/serialization rules so future viewer state can be added without updating every course link manually.
- The initial registered viewer session params are:
    - `preview=true` when course preview mode was requested; and
    - a validated `returnTo` target when present.
- The helper must not blindly propagate every incoming query param. Unknown params must be dropped unless they are explicitly registered as viewer session params.
- `returnTo` must be treated as untrusted input. It must only be propagated or used for exit navigation after validation as an internal relative dashboard path, for example `/dashboard/...`; absolute URLs, protocol-relative URLs, backslash-containing paths, and control characters must be rejected.
- A non-manager visiting a course URL with `preview=true` must not receive any elevated access. `preview=true` is ignored unless server-side course management eligibility succeeds.
- An enrolled manager visiting the course without `preview=true` should be treated as an enrolled learner for viewer presentation, including sidebar progress icons and completion controls.
- An enrolled manager visiting the course with `preview=true` should be treated as a course preview user for viewer presentation, including unlocked content and no learner-progress semantics unless a separate product decision says otherwise.
- When effective course preview mode is true, the course viewer header must show a compact persistent `Preview` badge on both desktop and mobile.
- The `Preview` badge should sit with the viewer chrome controls, near the theme switcher and exit course button, rather than inside lesson content or the course sidebar.
- The badge may include a tooltip explaining that preview mode unlocks course content, but the badge itself should remain visually lightweight.

### Course Viewer Access

- Eligible course managers can open `/course/[slug]/[id]?preview=true` without being enrolled.
- Eligible course managers can open `/course/[slug]/[id]/[lesson]?preview=true` for any lesson in a course they can manage without being enrolled, including unpublished lessons.
- Course managers should see preview menu item on the `/dashboard/product/[id]` screen's drop down menu, right below the `View page` menu item. Clicking on this should take them to the course viewer with `preview=true`.
- Course managers should not see the "not enrolled" error for lessons they are allowed to manage in preview mode.
- For eligible course managers in preview mode, all viewer sections and lessons should be treated as accessible for display purposes:
    - no lock icon for enrollment-required lessons
    - no drip badge/locked label for dripped sections
    - lesson links and lesson prev/next navigation remain available for all lessons visible in course preview
- Completed/check icons must continue to represent real learner progress only. A non-enrolled course manager should not appear to have completed lessons.
- Enrolled managers outside preview mode should continue to see completed/check icons based on their own learner progress.
- This branch may contain additional course navigation restructuring work. That work should be considered when implementing and testing preview URL propagation, but it is outside the scope of this PRD unless directly required to preserve course preview state.

### Lesson Content Access

- `getLessonDetails` or its underlying helper must allow eligible course managers in preview mode to fetch protected lesson content.
- `getLessonDetails` must receive requested preview mode from the viewer and must not infer preview mode from management capability alone.
- Protected content includes lessons with `requiresEnrollment: true` and lessons inside groups blocked by drip for learners.
- Protected content includes unpublished lessons when the viewer is an eligible course manager in preview mode.
- Course preview access must not depend on a purchase row, `accessibleGroups`, `lastDripAt`, or course enrollment.
- Existing learner access logic remains the source of truth for users who are not course managers.
- Existing learner access logic remains the source of truth for managers who are not in preview mode.

### Drip Behavior

- Course preview access bypasses both relative drip and exact-date drip restrictions in the viewer.
- Course preview access must not change drip scheduling state.
- Course preview access must not trigger drip emails.
- Course preview access must not write `accessibleGroups` or alter `lastDripAt` on any user purchase.
- Learners continue to see drip badges and locked sections exactly as before.
- Enrolled managers outside preview mode continue to see learner drip behavior exactly as their enrollment permits.

### Discussions In Viewer

- Course discussion participation is not part of this PRD.
- Product direction: non-enrolled course managers may participate in course discussions while in preview mode.
- Implementation of manager discussion access must be handled in a separate PRD/change and should not be included in this course preview implementation.

### Non-Mutating Preview

- Viewing in course preview mode must not:
    - create or update a purchase
    - enroll the course manager
    - mark any lesson complete automatically
    - make certificate progress
    - mark downloads as learner activity
    - record generic page views or viewer activity events
    - record analytics, audit events, or activity feed entries
    - send enrollment, drip, progress, or completion notifications
    - affect course reports or customer progress metrics
- No course preview interaction should be recorded. This includes course intro views, lesson views, previous/next navigation, downloads, discussion panel opens, SCORM launches, completion attempts, quiz evaluations and any other viewer interaction performed in preview mode.
- Completion actions such as "mark lesson complete" should be hidden or disabled for non-enrolled course managers in preview mode unless a separate product decision explicitly allows manager progress records.
- Enrolled managers outside preview mode can use normal learner completion actions and should see their real progress.

### Security And Privacy

- Unauthorized users must not be able to reveal gated lesson content by guessing course or lesson IDs.
- A user with only `course:manage` must not access courses they do not own.
- A user with no course management permission must not bypass enrollment or drip.
- A user with no course management permission must not gain access by adding `preview=true`.
- Anonymous users must not gain any new access.
- Course preview access must not weaken existing product visibility or tenant isolation checks.

## Code Style

Keep authorization readable and reusable. Prefer a low-level predicate/helper over scattering inline permission checks across UI and GraphQL resolvers.

```ts
function canManageCourseContent(user: User, course: Course): boolean {
    if (checkPermission(user.permissions, [permissions.manageAnyCourse])) {
        return true;
    }

    return (
        checkPermission(user.permissions, [permissions.manageCourse]) &&
        course.creatorId === user.userId
    );
}

function canReadLessonContent({
    user,
    course,
    lesson,
    requestedPreview,
}: {
    user?: User;
    course: Course;
    lesson: Lesson;
    requestedPreview: boolean;
}): boolean {
    const isCoursePreview =
        requestedPreview && user && canManageCourseContent(user, course);

    if (isCoursePreview) {
        return true;
    }

    return canLearnerReadLessonContent({ user, course, lesson });
}
```

Conventions:

- Keep backend permission decisions in GraphQL/business logic; use UI checks only to render the resulting state.
- Reuse `getCourseOrThrow` where the caller is already in an authenticated course-management flow. For learner-facing course/lesson reads, extract or wrap the same predicate in a read-specific helper so course preview access can be checked with explicit preview intent and without accidentally applying dashboard-only assumptions to anonymous or learner reads.
- Preserve existing helper contracts unless changing them is necessary and covered by tests.
- Keep names generic, such as `canManageCourseContent` or `canAccessCoursePreview`, instead of names tied to a single UI route.
- Use frontend strings from `apps/web/ui-config/strings.ts` for any visible TSX copy.
- Use backend strings from `apps/web/config/strings.ts` for response/error text.

## Testing Strategy

GraphQL/business logic tests must cover:

- `course:manage_any` user can fetch enrollment-required lesson content without enrollment when `preview=true`.
- `course:manage` course creator can fetch enrollment-required lesson content without enrollment when `preview=true`.
- `course:manage_any` or owner-scoped `course:manage` user without `preview=true` receives normal learner/public course and lesson visibility.
- `course:manage` non-creator cannot fetch gated lesson content without enrollment, even when `preview=true`.
- user without management permission cannot fetch gated lesson content without enrollment, even when `preview=true`.
- backend returns `isPreview: true` on course responses only when effective preview mode is true.
- backend returns `isPreview: false` for enrolled managers who do not request preview mode.
- eligible course preview user can access lessons inside dripped groups without `accessibleGroups`.
- course preview access does not create or update purchases/progress.
- course preview access does not record analytics, audit events, activity feed entries, page views, downloads, SCORM launches, discussion opens, or other viewer interactions.
- enrolled course manager without `preview=true` gets normal learner progress behavior.
- existing enrolled learner behavior still works.
- existing anonymous/non-enrolled failure behavior still works.

Course viewer tests must cover:

- eligible course preview user sees gated lessons as unlocked in the sidebar.
- eligible course preview user does not see drip badges on dripped sections.
- eligible course preview user can render lesson content instead of the enrollment error.
- eligible course preview user sees a persistent `Preview` badge in the course viewer header on desktop and mobile.
- users who are not course managers still see locks, drip labels, and enrollment errors where applicable.
- non-manager users with `preview=true` do not receive elevated access or preview presentation.
- enrolled course manager without `preview=true` sees real sidebar progress check marks and completion controls.
- non-enrolled course preview user does not see learner-only completion controls, or those controls are disabled.
- discussion participation behavior is unchanged by this PRD.

Manual verification should include:

- Sign in as a `course:manage_any` user who is not enrolled and open a paid/dripped course through the dashboard preview menu.
- Sign in as the course creator with `course:manage` and no enrollment and open the same viewer through the dashboard preview menu.
- Sign in as the course creator with `course:manage` and no enrollment and open an unpublished course and unpublished lesson through the preview flow.
- Sign in as an enrolled course creator with `course:manage`, open the course without `preview=true`, and confirm normal learner progress check marks and completion controls are visible.
- Sign in as the same enrolled course creator, open the course with `preview=true`, and confirm course preview behavior is active.
- Add `preview=true` as a normal learner or guest and confirm no elevated access is granted.
- Open checkout for the same unpublished course as a guest and as a manager and confirm checkout returns a 404/not found state.
- Sign in as a different `course:manage` user and confirm the bypass fails.
- Sign in as a normal learner and confirm existing gated/drip behavior.
- Confirm this PR does not change discussion participation behavior.

## Boundaries

- Always:
  Preserve learner and anonymous access behavior, centralize server-side authorization, add/update tests for `apps/web/graphql` changes, keep course preview non-mutating, preserve tenant isolation, and run focused tests before broad verification.
- Ask first:
  Adding new GraphQL queries/mutations, changing learner or checkout product visibility semantics, enabling manager progress/completion records, changing discussion participation semantics, adding dependencies, or changing database schema.
- Never:
  Enroll course managers automatically, create purchases for preview access, use client-only authorization for protected lesson content, expose lessons across tenant boundaries, treat `course:manage` as global access, remove existing learner drip/enrollment checks, or weaken the domain-owner invariant.

## Out Of Scope

- Course navigation restructuring that is not required for course preview state propagation.
- Discussion participation changes for course managers.
- Download endpoint preview bypass.
- SCORM runtime endpoint preview bypass.
- Backwards-compatible support for the branch-only `isManager` field; the course viewer should use `isPreview`.

## Success Criteria

1. Eligible course managers can browse the course viewer and lesson pages without enrollment in course preview mode.
2. All course content visible in course preview appears unlocked to eligible course managers, including unpublished lessons, enrollment-required lessons, and dripped sections.
3. Eligible course managers can fetch protected lesson content without purchase/progress/drip state only through course preview mode.
4. Ineligible users cannot bypass enrollment or drip, even with `preview=true`.
5. Existing learner behavior, progress behavior, checkout prompts, and drip labels are unchanged.
6. Course preview access does not mutate user purchases, accessible groups, completed lessons, certificates, or notifications.
7. GraphQL and viewer tests cover both `course:manage_any` and owner-scoped `course:manage`.
8. `pnpm test`, `pnpm lint`, and `pnpm prettier` pass before merge.
