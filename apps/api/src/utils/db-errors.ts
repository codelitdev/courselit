/**
 * Whether an error (or any error in its `cause` chain) is a Postgres unique
 * violation. With `constraints`, a violation that names a different constraint
 * does not count. Pre-checks give a friendly response; the unique constraints
 * stay authoritative when two requests claim the same value concurrently.
 */
export function isUniqueViolation(
  error: unknown,
  constraints?: readonly string[],
): boolean {
  let cause: unknown = error;
  while (cause && typeof cause === "object") {
    if ("code" in cause && cause.code === "23505") {
      const constraint =
        "constraint" in cause && typeof cause.constraint === "string"
          ? cause.constraint
          : null;
      return !constraints || !constraint || constraints.includes(constraint);
    }
    cause = "cause" in cause ? cause.cause : null;
  }
  return false;
}
