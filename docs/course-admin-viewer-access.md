# Course Admin Viewer Access PRD

## Document Control

- Status: Draft
- Last updated: June 6, 2026
- Owner: Web/Product team
- Target workspace: `apps/web` (`@courselit/web`)

## Assumptions

1. This PRD covers the current Next.js course viewer under `apps/web/app/(with-contexts)/course/[slug]/[id]`, including lesson pages and discussion entry points rendered in that viewer.
2. "Course admins" means users who either have `course:manage_any` permission, or have `course:manage` permission and `course.creatorId === user.userId`.
3. Course admin viewer access is a review/preview capability. It must not create a purchase, enrollment, membership, progress record, certificate eligibility, or drip state for the admin.
4. Admins should see every lesson in the course viewer as unlocked when previewing a course they can manage, including unpublished lessons, lessons that normally require enrollment, and sections that are blocked by relative or exact-date drip rules.
5. Eligible admins can preview unpublished courses and unpublished lessons from the course viewer. Public purchase and learner-facing checkout surfaces must continue to use public product visibility and must not expose unpublished products to learners or guests.
6. Learners and anonymous users keep the existing enrollment, payment, lesson-level access, and drip behavior.
7. No database schema change is expected.
8. Existing GraphQL query/mutation boundaries should be extended only where needed; do not add new GraphQL operations if existing course/lesson queries can carry the behavior cleanly.

## Objective

Allow course admins to open the learner-facing course viewer for courses they can manage without enrolling themselves. This lets school owners and course managers review the real learner experience, navigate through all released course structure, and inspect dripped or enrollment-gated content without needing to alter customer records.

Success means:

1. A user with `course:manage_any` can access any course's viewer and lessons without enrollment, including unpublished courses and lessons.
2. A user with `course:manage` can access a course's viewer and lessons without enrollment only when they are the course creator, including unpublished courses and lessons.
3. The same `course:manage` user cannot bypass enrollment for courses created by another user.
4. Admin-visible course content appears unlocked in the sidebar and lesson page, including enrollment-required lessons and dripped sections.
5. The admin preview path does not mutate enrollment, purchases, progress, completed lessons, accessible groups, drip timestamps, certificates, payment data, or notifications.
6. Existing learner and anonymous behavior remains unchanged.
7. The admin should not be able to mark a lesson complete or record progress etc. as they are not enrolled.

## Product Requirements

### Course Admin Eligibility

- A course admin is eligible when:
    - the signed-in user has `course:manage_any`; or
    - the signed-in user has `course:manage` and the course's `creatorId` equals the signed-in user's `userId`.
- Eligibility must be evaluated server-side for every course/lesson read path that can reveal gated content.
- Implementation should reuse the same access rule already encoded by `getCourseOrThrow` in `apps/web/graphql/courses/logic.ts`: `course:manage_any` grants access to any course in the tenant, while `course:manage` grants access only when the user owns the course.
- Client-side checks may be used for presentation, but must not be the only enforcement.
- Admin eligibility must respect tenant/domain boundaries exactly as existing course reads do.

### Course Viewer Access

- Eligible admins can open `/course/[slug]/[id]` without being enrolled.
- Eligible admins can open `/course/[slug]/[id]/[lesson]` for any lesson in a course they can manage without being enrolled, including unpublished lessons.
- Admins should see preview menu item on the `/dashboard/product/[id]` screen's drop down menu, right below the `View page` menu item. Clicking on this should take them to the course viewer.
- Admins should not see the "not enrolled" error for lessons they are allowed to manage.
- For eligible admins, all viewer sections and lessons should be treated as accessible for display purposes:
    - no lock icon for enrollment-required lessons
    - no drip badge/locked label for dripped sections
    - lesson links and lesson prev/next navigation remain available for all lessons visible in admin preview
- Completed/check icons must continue to represent real learner progress only. A non-enrolled admin should not appear to have completed lessons.

### Lesson Content Access

- `getLessonDetails` or its underlying helper must allow eligible admins to fetch protected lesson content.
- Protected content includes lessons with `requiresEnrollment: true` and lessons inside groups blocked by drip for learners.
- Protected content includes unpublished lessons when the viewer is an eligible course admin.
- Admin access must not depend on a purchase row, `accessibleGroups`, `lastDripAt`, or course enrollment.
- Existing learner access logic remains the source of truth for non-admin users.

### Drip Behavior

- Admin access bypasses both relative drip and exact-date drip restrictions in the viewer.
- Admin access must not change drip scheduling state.
- Admin access must not trigger drip emails.
- Admin access must not write `accessibleGroups` or alter `lastDripAt` on any user purchase.
- Learners continue to see drip badges and locked sections exactly as before.

### Discussions In Viewer

- If course discussions are enabled, eligible admins can open the course viewer discussion index and lesson discussion panel without enrollment when they manage the course.
- Admins should see discussion summaries for all lessons visible in admin preview, including lessons hidden from learners by publication status, enrollment, or drip rules.
- Admins can read and participate in discussions through the course viewer only if existing discussion product requirements allow admin participation without learner enrollment. If the current discussion implementation intentionally restricts public viewer participation to learners, implementation planning must call this out before changing participation semantics.

### Non-Mutating Preview

- Viewing as an admin must not:
    - create or update a purchase
    - enroll the admin
    - mark any lesson complete automatically
    - make certificate progress
    - mark downloads as learner activity unless an existing download endpoint already records file access independently
    - send enrollment, drip, progress, or completion notifications
    - affect course reports or customer progress metrics
- Completion actions such as "mark lesson complete" should be hidden or disabled for non-enrolled admins unless a separate product decision explicitly allows admin progress records.

### Security And Privacy

- Unauthorized users must not be able to reveal gated lesson content by guessing course or lesson IDs.
- A user with only `course:manage` must not access courses they do not own.
- A user with no course management permission must not bypass enrollment or drip.
- Anonymous users must not gain any new access.
- Admin preview access must not weaken existing product visibility or tenant isolation checks.

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
}: {
    user?: User;
    course: Course;
    lesson: Lesson;
}): boolean {
    if (user && canManageCourseContent(user, course)) {
        return true;
    }

    return canLearnerReadLessonContent({ user, course, lesson });
}
```

Conventions:

- Keep backend permission decisions in GraphQL/business logic; use UI checks only to render the resulting state.
- Reuse `getCourseOrThrow` where the caller is already in an authenticated course-management flow. For learner-facing course/lesson reads, extract or wrap the same predicate in a read-specific helper so admin viewer access can be checked without accidentally applying dashboard-only assumptions to anonymous or learner reads.
- Preserve existing helper contracts unless changing them is necessary and covered by tests.
- Keep names generic, such as `canManageCourseContent` or `canAccessCourseViewerAsManager`, instead of names tied to a single UI route.
- Use frontend strings from `apps/web/ui-config/strings.ts` for any visible TSX copy.
- Use backend strings from `apps/web/config/strings.ts` for response/error text.

## Testing Strategy

GraphQL/business logic tests must cover:

- `course:manage_any` user can fetch enrollment-required lesson content without enrollment.
- `course:manage` course creator can fetch enrollment-required lesson content without enrollment.
- `course:manage` non-creator cannot fetch gated lesson content without enrollment.
- user without management permission cannot fetch gated lesson content without enrollment.
- eligible admin can access lessons inside dripped groups without `accessibleGroups`.
- admin access does not create or update purchases/progress.
- existing enrolled learner behavior still works.
- existing anonymous/non-enrolled failure behavior still works.

Course viewer tests must cover:

- eligible admin sees gated lessons as unlocked in the sidebar.
- eligible admin does not see drip badges on dripped sections.
- eligible admin can render lesson content instead of the enrollment error.
- non-admin users still see locks, drip labels, and enrollment errors where applicable.
- non-enrolled admin does not see learner-only completion controls, or those controls are disabled.
- discussion index/panel behavior matches the final product decision for admin participation.

Manual verification should include:

- Sign in as a `course:manage_any` user who is not enrolled and open a paid/dripped course.
- Sign in as the course creator with `course:manage` and no enrollment and open the same viewer.
- Sign in as the course creator with `course:manage` and no enrollment and open an unpublished course and unpublished lesson through the preview flow.
- Open checkout for the same unpublished course as a guest and as a manager and confirm checkout returns a 404/not found state.
- Sign in as a different `course:manage` user and confirm the bypass fails.
- Sign in as a normal learner and confirm existing gated/drip behavior.

## Boundaries

- Always:
  Preserve learner and anonymous access behavior, centralize server-side authorization, add/update tests for `apps/web/graphql` changes, keep admin preview non-mutating, preserve tenant isolation, and run focused tests before broad verification.
- Ask first:
  Adding new GraphQL queries/mutations, changing learner or checkout product visibility semantics, enabling admin progress/completion records, changing discussion participation semantics, adding dependencies, or changing database schema.
- Never:
  Enroll admins automatically, create purchases for preview access, use client-only authorization for protected lesson content, expose lessons across tenant boundaries, treat `course:manage` as global access, remove existing learner drip/enrollment checks, or weaken the domain-owner invariant.

## Success Criteria

1. Eligible course admins can browse the course viewer and lesson pages without enrollment.
2. All course content visible in admin preview appears unlocked to eligible admins, including unpublished lessons, enrollment-required lessons, and dripped sections.
3. Eligible admins can fetch protected lesson content without purchase/progress/drip state.
4. Ineligible users cannot bypass enrollment or drip.
5. Existing learner behavior, progress behavior, checkout prompts, and drip labels are unchanged.
6. Admin preview access does not mutate user purchases, accessible groups, completed lessons, certificates, or notifications.
7. GraphQL and viewer tests cover both `course:manage_any` and owner-scoped `course:manage`.
8. `pnpm test`, `pnpm lint`, and `pnpm prettier` pass before merge.

## Open Questions

1. Should non-enrolled admins be allowed to participate in course discussions from the course viewer, or only read them for review?
2. Should the UI show a subtle "previewing as admin" indicator, or should the viewer remain visually identical to learner mode except for unlocked content?
3. Should downloads or SCORM runtime endpoints receive the same admin bypass in this PR, or should this PR cover only the React lesson viewer and GraphQL lesson content reads?
