## Development Tips

- Use `pnpm` as package manager.
- The project is structured as a monorepo i.e. a pnpm workspace. The apps are in `apps` folder and re-usable packages are in `packages`.
- Command for running script in a workspace: `pnpm --filter <workspace> <command>`.
- Command for running tests: `pnpm test`.
- The project uses shadcn for building UI so stick to its conventions and design.
- In `apps/web` workspace, create a string first in `apps/web/config/strings.ts` and then import it in the `.tsx` files, instead of using inline strings.
- When working with forms, always use refs to keep the current state of the form's data and use it to enable/disable the form submit button.
- Check the name field inside each package's package.json to confirm the right name—skip the top-level one.
- After finishing your change, always run `pnpm lint` and `pnpm prettier` to check if there are any code quality issues. If yes, fix those before assuming your work is complete.

## Testing instructions

- Always add or update test when introducing changes to `apps/web/graphql` folder, even if nobody asked.
- Run `pnpm test` to run the tests.
- Fix any test or type errors until the whole suite is green.

## PR instructions

- Always run `pnpm lint` and `pnpm prettier` before committing.
