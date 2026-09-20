## Development Tips

> IMPORTANT: Before writing a feature from scratch, check if its implementation is already there in the production branch i.e. `main`. If it is there, copy over the logic and components from there instead of re-inventing the logic and design (unless it is totally off).
- FrontLit, SendLit, MediaLit branding should not show up in anything user facing like API endpoints, routes, UI etc. These systems are parts of the infrastructure.

> This rewrite has no production deployment yet. We are building the very first version of the platform so don't waste time in maintaining backwards compatibililty. When you need to change something, go ahead and write its version 1 implementation. For database, instead of writing table altering migrations, rewrite the original migration to include the alteration, then reset the database and re-apply migrations.

- In Learners site, all components should be composed of `@frontlit/page-builder`'s page primitives, so that the entire learners portal can be rightly themed.
- Learner access is modeled by `learner_memberships`, one school-scoped relationship to a product or community. Do not introduce `enrollments` or `enrollment_access_grants`; lesson progress, evaluations, SCORM runtime state, downloads, checkout, payments, invoices, subscriptions, and included-product access must reference the learner membership model.
- In Learners site, do not introduce raw HTML, local UI primitives, or hard-coded visual classes for user-facing controls when a page-builder primitive exists. This includes typography, buttons, inputs, labels, cards, badges, media, borders, radii, and shadows. If a required primitive is missing, add a centralized theme-aware wrapper and keep the exception limited to the missing behavior; never let hard-coded styles override the active page-builder theme.
- Page editing must always use the dedicated full-screen editor at `/pages/<page_id>/edit`. Any page-list or resource action that opens the editor must navigate to that canonical route, include its `redirectTo` destination, and preserve applicable `resourceType` and `resourceId` query parameters.
- Unsplash images should never become part of the media library. Media library should only record actual uploads.

## Documentation tips

- We manage the product's documentation in `apps/docs`.
- When working on a new feature or changing an existing feature significantly, see if documentation should be updated.
- No need to update documentation while doing bug fixes and refactors.
- If a browser tool is available, see if you can automatically take relevant screenshots and include them in the documentation.
- All workspace packages under `packages/` should use Tailwind 4 for the styling.

## Billing segregation
- `@codelitdev/billing` remains only for CourseLit platform plans and school subscriptions.
- The school payment provider contract live under learner commerce and use school-owned gateway credentials only.
- Learner checkout payments, invoices, entitlements, refunds, and provider webhooks should not call or depend on the platform billing bundle.

## Testing instructions

## PR instructions
