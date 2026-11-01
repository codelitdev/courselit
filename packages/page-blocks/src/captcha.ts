/**
 * Cloudflare Turnstile for public forms. Nothing loads until a form is
 * submitted, so pages pay no cost for the captcha until someone uses it. The
 * widget runs invisibly and only shows itself when Cloudflare needs the
 * visitor to interact.
 */

/** The request header the API reads the token from. */
export const CAPTCHA_HEADER = "x-captcha-response";

type CaptchaConfig = { provider: "turnstile" | null; siteKey: string | null };

type Turnstile = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      appearance?: "always" | "execute" | "interaction-only";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

/** Shown when the visitor can't be verified; safe to display as is. */
export const CAPTCHA_ERROR_MESSAGE =
  "We couldn't confirm you're not a robot. Please try again.";

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TOKEN_TIMEOUT_MS = 120_000;

let configPromise: Promise<CaptchaConfig> | null = null;
let scriptPromise: Promise<Turnstile> | null = null;

function loadConfig(): Promise<CaptchaConfig> {
  configPromise ??= fetch("/api/v1/public/captcha", { credentials: "omit" })
    .then((response) =>
      response.ok
        ? (response.json() as Promise<CaptchaConfig>)
        : { provider: null, siteKey: null },
    )
    .catch(() => {
      // Let a later submit retry instead of caching the failure.
      configPromise = null;
      return { provider: null, siteKey: null };
    });
  return configPromise;
}

function loadScript(): Promise<Turnstile> {
  const existing = (window as { turnstile?: Turnstile }).turnstile;
  if (existing) return Promise.resolve(existing);
  scriptPromise ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      const turnstile = (window as { turnstile?: Turnstile }).turnstile;
      if (turnstile) resolve(turnstile);
      else reject(new Error(CAPTCHA_ERROR_MESSAGE));
    };
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new Error(CAPTCHA_ERROR_MESSAGE));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Returns a single-use token to send in the `x-captcha-response` header, or
 * `null` when captcha is turned off. Throws an error carrying
 * `CAPTCHA_ERROR_MESSAGE` when the visitor could not be verified.
 */
export async function getCaptchaToken(action?: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const config = await loadConfig();
  if (config.provider !== "turnstile" || !config.siteKey) return null;
  const turnstile = await loadScript();

  // Stays empty unless Cloudflare asks the visitor to tick the checkbox.
  const container = document.createElement("div");
  container.setAttribute("data-courselit-captcha", "");
  Object.assign(container.style, {
    position: "fixed",
    left: "50%",
    bottom: "24px",
    transform: "translateX(-50%)",
    zIndex: "2147483647",
  });
  document.body.appendChild(container);

  let widgetId: string | null = null;
  try {
    return await new Promise<string>((resolve, reject) => {
      const fail = () => reject(new Error(CAPTCHA_ERROR_MESSAGE));
      const timer = window.setTimeout(fail, TOKEN_TIMEOUT_MS);
      widgetId = turnstile.render(container, {
        sitekey: config.siteKey!,
        ...(action ? { action } : {}),
        appearance: "interaction-only",
        callback: (token) => {
          window.clearTimeout(timer);
          resolve(token);
        },
        "error-callback": fail,
        "expired-callback": fail,
        "timeout-callback": fail,
      });
    });
  } finally {
    if (widgetId) turnstile.remove(widgetId);
    container.remove();
  }
}

/** Headers to add to a request, empty when captcha is off. */
export async function captchaHeaders(action?: string): Promise<Record<string, string>> {
  const token = await getCaptchaToken(action);
  return token ? { [CAPTCHA_HEADER]: token } : {};
}
