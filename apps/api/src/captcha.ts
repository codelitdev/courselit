import { createPlatformError, type PlatformError } from "@codelitdev/platform";

/** Header that carries the browser's Turnstile token, the same one Better
 * Auth's captcha plugin reads for the auth endpoints. */
export const CAPTCHA_HEADER = "x-captcha-response";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Better Auth endpoints that send email or create accounts. Verifying a code
 * (`/sign-in/email-otp`) is left out: the widget token is single use, and the
 * code itself limits attempts. */
export const CAPTCHA_AUTH_ENDPOINTS = [
  "/email-otp/send-verification-otp",
  "/email-otp/request-password-reset",
  "/forget-password/email-otp",
  "/send-verification-email",
  "/request-password-reset",
  "/sign-up/email",
  "/sign-in/email",
];

export type CaptchaSettings = { siteKey: string; secretKey: string };

/** Captcha is on only when both Turnstile keys are set, so local development
 * and tests run without it. */
export function captchaSettings(
  env: Record<string, string | undefined> = process.env,
): CaptchaSettings | null {
  const siteKey = env.TURNSTILE_SITE_KEY?.trim();
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim();
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

/** What the browser needs to render the widget. Never includes the secret. */
export function publicCaptchaConfig(env?: Record<string, string | undefined>) {
  const settings = captchaSettings(env);
  return settings
    ? { provider: "turnstile" as const, siteKey: settings.siteKey }
    : { provider: null, siteKey: null };
}

/** Verifies the request's Turnstile token for the public REST forms. Passes
 * when captcha is not configured. */
export async function verifyCaptcha(
  headers: Record<string, string | string[] | undefined>,
  options: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const settings = captchaSettings(options.env);
  if (!settings) return { ok: true };
  const raw = headers[CAPTCHA_HEADER];
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!token || token.length > 2048) {
    return {
      ok: false,
      error: createPlatformError("forbidden", {
        safeDetails: { reason: "captcha_required" },
      }),
    };
  }
  let outcome: { success?: boolean };
  try {
    const response = await (options.fetchImpl ?? fetch)(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: settings.secretKey, response: token }),
      signal: AbortSignal.timeout(10_000),
    });
    outcome = (await response.json()) as { success?: boolean };
  } catch {
    return { ok: false, error: createPlatformError("internal_error") };
  }
  return outcome.success === true
    ? { ok: true }
    : {
        ok: false,
        error: createPlatformError("forbidden", {
          safeDetails: { reason: "captcha_failed" },
        }),
      };
}
