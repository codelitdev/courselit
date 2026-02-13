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
