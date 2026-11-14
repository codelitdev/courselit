// Which sign-in options a school offers, decided from the public
// login-methods response. Kept free of React so it can be tested.

export type LoginMethod = "email" | "google" | "sso";

export type LoginOptions = {
  loginMethods: LoginMethod[];
  showEmail: boolean;
  showGoogle: boolean;
  showSso: boolean;
  ssoLabel: string;
};

export const DEFAULT_LOGIN_OPTIONS: LoginOptions = resolveLoginOptions(null);

const KNOWN: LoginMethod[] = ["email", "google", "sso"];

/** Label of the SSO button: "Sign in with <name>", or "Sign in with SSO". */
export function ssoButtonLabel(displayName?: string | null): string {
  const name = displayName?.trim();
  return `Sign in with ${name ? name : "SSO"}`;
}

/** Turn the login-methods response into what the sign-in forms show. A
 * missing or malformed response falls back to email only. */
export function resolveLoginOptions(
  data: { loginMethods?: unknown; ssoDisplayName?: unknown } | null | undefined,
): LoginOptions {
  const listed = Array.isArray(data?.loginMethods) ? data.loginMethods : null;
  const loginMethods = listed
    ? KNOWN.filter((method) => listed.includes(method))
    : (["email"] as LoginMethod[]);
  return {
    loginMethods,
    showEmail: loginMethods.includes("email"),
    showGoogle: loginMethods.includes("google"),
    showSso: loginMethods.includes("sso"),
    ssoLabel: ssoButtonLabel(
      typeof data?.ssoDisplayName === "string" ? data.ssoDisplayName : null,
    ),
  };
}

/** The message for the `?error=` value a failed provider start redirects with. */
export function loginErrorFromQuery(value: string | null): string | null {
  if (value === "google") return "Google sign-in didn't finish. Please try again.";
  if (value === "sso") return "Single sign-on didn't finish. Please try again.";
  return null;
}

export const SSO_REQUIRED_MESSAGE =
  "Your school requires single sign-on for this email address. Use the button below to continue.";

/** Raised when the email-code endpoint refuses because of the school's sign-in rules. */
export class SignInRefusedError extends Error {
  constructor(
    readonly reason: "sso_required" | "sign_in_method_disabled",
    message: string,
  ) {
    super(message);
    this.name = "SignInRefusedError";
  }
}

export function isSsoRequired(error: unknown): boolean {
  return error instanceof SignInRefusedError && error.reason === "sso_required";
}
