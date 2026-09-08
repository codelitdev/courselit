## Development Tips

> IMPORTANT: Before writing a feature from scratch, check if its implementation is already there in the production branch i.e. `main`. If it is there, copy over the logic and components from there instead of re-inventing the logic and design (unless it is totally off).

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
