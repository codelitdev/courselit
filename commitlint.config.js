/**
 * Commit messages follow Conventional Commits:
 * https://www.conventionalcommits.org/en/v1.0.0/
 *
 *   <type>(<optional scope>): <description>
 *
 * Types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style,
 * test. Scopes are free-form; use the app or package touched, e.g.
 * `feat(storefront): ...` or `fix(api): ...`.
 */
export default {
  extends: ["@commitlint/config-conventional"],
};
