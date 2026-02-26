## Development Tips

- Use `pnpm` as package manager.
- The project is structured as a monorepo i.e. a pnpm workspace. The apps are in `apps` folder and re-usable packages are in `packages`.
- Command for running script in a workspace: `pnpm --filter <workspace> <command>`.
- Command for running tests: `pnpm test`.
- The project uses shadcn for building UI so stick to its conventions and design.
- In `apps/web` workspace, create a string first in `apps/web/config/strings.ts` and then import it in the `.tsx` files, instead of using inline strings.
- When working with forms, always use refs to keep the current state of the form's data and use it to enable/disable the form submit button.
- Check the name field inside each package's package.json to confirm the right name—skip the top-level one.
- While working with forms, always use zod and react-hook-form to validate the form. Take reference implementation from `apps/web/components/admin/settings/sso/new.tsx`.
- `packages/scripts` is meant to contain maintenance scripts which can be re-used over and over, not one-off migrations. One-off migrations should be in `apps/web/.migrations`.
- `packages/utils` should be the place for containing utilities which are used in more than one package.
- `apps/web` and `apps/queue` can share business logic and db models. Common business logic should be moved to `packages/common-logic`. Common DB related functionality should be moved to `packages/orm-models`.
- For migrations (located in `apps/web/.migrations`), follow the "Gold Standard" pattern:
    - Use **Cursors** (`.cursor()`) to stream data from MongoDB, ensuring the script remains memory-efficient regardless of dataset size.
    - Use **Batching** with `bulkWrite` (e.g., batches of 500) to maximize performance and minimize network roundtrips.
    - Ensure **Idempotency** (safe to re-run) by using upserts or `$setOnInsert` where applicable.

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

- We manage product's documentation in `apps/docs`.
- When working on a new feature or changing an existing feature significantly, see if documenation should be updated.
- No need to update documentation while doing bug fixes and refactors.
- If browser tool is available, see if you can automatically take revelant screenshots and include it in the documentation.

## Testing instructions

- Always add or update test when introducing changes to `apps/web/graphql` folder, even if nobody asked.
- Run `pnpm test` to run the tests.
- Fix any test or type errors until the whole suite is green.

## PR instructions

- Always run `pnpm lint` and `pnpm prettier` before committing.
