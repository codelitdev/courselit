## Development Tips

- Use `pnpm` as package manager.
- The project is structured as a monorepo, i.e., a pnpm workspace. The apps are in the `apps` folder and reusable packages are in the `packages` folder.
- Command for running script in a workspace: `pnpm --filter <workspace> <command>`.
- Command for running tests: `pnpm test`.
- The project uses shadcn for building UI, so stick to its conventions and design.
- In `apps/web` workspace, create a string first in `apps/web/config/strings.ts` and then import it in the `.tsx` files, instead of using inline strings.
- Prefer constants in `packages/common-models` over string literals.
- For admin/dashboard empty states in `apps/web`, prefer reusing `apps/web/components/admin/empty-state.tsx` instead of creating one-off placeholder UIs.
- When working with forms, always use refs to keep the current state of the form's data and use it to enable/disable the form submit button.
- Check the name field inside each package's package.json to confirm the right name—skip the top-level one.
- While working with forms, always use zod and react-hook-form to validate the form. Take reference implementation from `apps/web/components/admin/settings/sso/new.tsx`.
- `packages/scripts` is meant to contain maintenance scripts which can be re-used over and over, not one-off migrations. One-off migrations should be in `apps/web/.migrations`.
- `packages/utils` should contain utilities used in more than one package.
- `apps/web` and `apps/queue` can share business logic and db models. Common business logic should be moved to `packages/common-logic`. Common DB related functionality should be moved to `packages/orm-models`.
- For migrations (located in `apps/web/.migrations`), follow the "Gold Standard" pattern:
    - Use **Cursors** (`.cursor()`) to stream data from MongoDB, ensuring the script remains memory-efficient regardless of dataset size.
    - Use **Batching** with `bulkWrite` (e.g., batches of 500) to maximize performance and minimize network roundtrips.
    - Ensure **Idempotency** (safe to re-run) by using upserts or `$setOnInsert` where applicable.
- When making changes to the structure of the Course, consider how it affects its representation on its public page (`apps/web/app/(with-contexts)/(with-layout)/p/[id]/page.tsx`) and the course viewer (`apps/web/app/(with-contexts)/course/[slug]/[id]/page.tsx`).
- `apps/web` is a multi-tenant app.
- Preserve the domain-owner invariant: `domain.email` identifies the school owner and public API keys resolve that owner as the API actor. Do not use raw `UserModel.update*`, `UserModel.delete*`, `DomainModel.update*`, migrations, or scripts in a way that changes/deletes the owner user, changes the owner user's permissions, or drifts `domain.email` away from the owner user without adding explicit guards and tests.
- Refrain from adding new GraphQL query/mutation unless required. If an existing query/mutation can be modified to implement the feature without making the query's/mutation's boundaries blurry, extend those.
- Always keep openapi.mjs files in sync with the actual implementation of the API endpoints.
- While adding a new collection, always confirm how the deletion/cleanup will work for it.
- Never define inlined types. Always use `packages/common-models` to define shared types.

### Workspace map (core modules):

- `apps/web` (`@courselit/web`): primary product app (Next.js app router), GraphQL API (`apps/web/graphql`), REST endpoints (`apps/web/app/api`), admin/public UI, auth, and payment entrypoints.
- `apps/queue` (`@courselit/queue`): async/background job processing.
- `apps/docs` (`@courselit/docs`): product documentation site.
- `packages/common-models` (`@courselit/common-models`): shared domain types/constants used across apps/packages.
- `packages/orm-models` (`@courselit/orm-models`): shared DB schemas/models for Mongo-backed entities.
- `packages/common-logic` (`@courselit/common-logic`): shared business logic that should not stay app-specific.
- `packages/components-library` (`@courselit/components-library`): reusable UI components/hooks (e.g. forms, media selector, upload hooks).
- `packages/page-blocks` (`@courselit/page-blocks`): page builder blocks/widgets and related rendering logic.
- `packages/page-primitives` (`@courselit/page-primitives`): foundational themed UI primitives.
- `packages/page-models` (`@courselit/page-models`): theme/page model definitions consumed by rendering/editor flows.
- `packages/text-editor` (`@courselit/text-editor`): rich text editor used in admin/content editing.
- `packages/email-editor` (`@courselit/email-editor`): email template/editor model and rendering structures.
- `packages/utils` (`@courselit/utils`): shared utility helpers.
- `packages/icons` (`@courselit/icons`): shared icon exports.
- `packages/scripts` (`@courselit/scripts`): reusable maintenance scripts (not one-off migrations).
- `packages/tailwind-config`, `packages/tsconfig`: shared config workspaces.

## Documentation tips

- We manage the product's documentation in `apps/docs`.
- When working on a new feature or changing an existing feature significantly, see if documentation should be updated.
- No need to update documentation while doing bug fixes and refactors.
- If a browser tool is available, see if you can automatically take relevant screenshots and include them in the documentation.

## Testing instructions

- Always add or update tests when introducing changes to `apps/web/graphql` folder, even if nobody asked.
- Run `pnpm test` to run the tests.
- Fix any test or type errors until the whole suite is green.
- Refrain from creating new files when adding tests in `apps/web/graphql` subdirectories. Re-use `logic.test.ts` files for adding new test suites, i.e., describe blocks.

## PR instructions

- Always run `pnpm lint` and `pnpm prettier` before committing.
