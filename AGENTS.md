## Development Tips

> IMPORTANT: Before writing a feature from scratch, check if its implementation is already there in the production branch i.e. `main`. If it is there, copy over the logic and components from there instead of re-inventing the logic and design (unless it is totally off).
- FrontLit, SendLit, MediaLit branding should not show up in anything user facing like API endpoints, routes, UI etc. These systems are parts of the infrastructure.
- REST and MCP have parity. Every contract operation that OAuth or API-key credentials can call over REST is reachable over MCP as a tool of its own, named `snake_case(operationId)` (`listSections` is `list_sections`), generated from the contract with no extra code. There are no generic `api.*` tools: clients such as ChatGPT want a named, typed tool per capability. Each generated tool needs a description in `apps/api/src/mcp-tools/operation-descriptions.ts` (a test enforces it). Deletions, and high-impact actions that are not deletions (publishing, emailing contacts, changing payment or access settings), are `destructive` tools that need `confirm: true`; add an operation to `MCP_HIGH_IMPACT_OPERATIONS` in `packages/api-contract/src/mcp-parity.ts` when it qualifies. Keeping an operation off MCP needs an exemption with a reason in `mcp-parity.ts` and an entry in `REACHABLE_BUT_EXEMPT` in `apps/api/src/mcp-api.test.ts`. Add a hand-written or workflow MCP tool only for a real agent task, and route it through `guardMcpTool` with the operations it performs.

> This rewrite has no production deployment yet. We are building the very first version of the platform so don't waste time in maintaining backwards compatibililty. When you need to change something, go ahead and write its version 1 implementation. For database, instead of writing table altering migrations, rewrite the original migration to include the alteration, then reset the database and re-apply migrations.

- In the Storefront site, all components should be composed of `@frontlit/page-builder`'s page primitives, so that the entire storefront portal can be rightly themed.
- Learner access is modeled by `learner_memberships`, one school-scoped relationship to a product or community. Do not introduce `enrollments` or `enrollment_access_grants`; lesson progress, evaluations, SCORM runtime state, downloads, checkout, payments, invoices, subscriptions, and included-product access must reference the learner membership model.
- In the Storefront site, do not introduce raw HTML, local UI primitives, or hard-coded visual classes for user-facing controls when a page-builder primitive exists. This includes typography, buttons, inputs, labels, cards, badges, media, borders, radii, and shadows. If a required primitive is missing, add a centralized theme-aware wrapper and keep the exception limited to the missing behavior; never let hard-coded styles override the active page-builder theme.
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
- If we are removing a functionality, remember to clean up obsolete tests.

## Commit messages
- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `<type>(<optional scope>): <description>`, e.g. `feat(storefront): show partly refunded purchases` or `fix(api): count refunds in revenue`.
- Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style`, `revert`. Use the app or package as the scope (`api`, `admin`, `storefront`, `api-contract`, ...). Mark breaking changes with `!` after the type or scope, or a `BREAKING CHANGE:` footer.
- The description is lowercase and has no trailing period; keep the header within 100 characters.
- A `commit-msg` hook (husky, installed by `bun install`) and the pull request CI run commitlint with `commitlint.config.js`.

## Releases
- The whole product has one version, kept in the root `package.json` and mirrored in `apps/api`, `apps/admin` and `apps/storefront` (the API reports it at `/health`; the admin's hidden `/about` page shows it). Internal packages stay at `0.0.0`.
- release-please (`.github/workflows/release.yml`) keeps a release PR open on the branch it runs on (`platform-based-rewrite` now, `main` once merged, with no changes needed) that bumps the version from Conventional Commits and updates `CHANGELOG.md`. Merging it tags `vX.Y.Z` and publishes `codelit/courselit-api`, `-admin` and `-storefront` images with that version.
- The rewrite continues main's version history (last `v0.74.5`) as pre-releases: `1.0.0-alpha.N` while features land, then beta, then rc, then `1.0.0`. Move to the next stage by changing `prerelease-type` in `release-please-config.json`. Pre-releases never tag `latest`.
- Don't edit versions by hand.

## PR instructions
