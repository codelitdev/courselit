import {
  createOAuthProviderOptions,
  secureCookieOptions,
  secureEmailAndPasswordOptions,
  secureSessionOptions,
  sessionCookieName,
} from "@codelitdev/oauth-server-kit/better-auth";
import { cimd } from "@better-auth/cimd";
import { captcha, emailOTP } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";
import { oauthProvider } from "@better-auth/oauth-provider";
import type { BetterAuthOptions } from "better-auth";
import type { AppDb } from "../types.js";
import { escapeHtml, sendSystemMail } from "../system-mail.js";
import { CAPTCHA_AUTH_ENDPOINTS, captchaSettings } from "../captcha.js";
import { fetchClientMetadataResource } from "./cimd-fetch.js";
import { CLIENT_IP_HEADER } from "./api-key-throttle.js";

export const AUTH_COOKIE_PREFIX = "courselit";

/**
 * CourseLit's Better Auth `advanced` cookie settings, from the kit: `__Host-`
 * session cookies over https (plain names on http local dev), and Better
 * Auth reads the client address only from the header the Express edge sets.
 */
export function authCookieAdvancedOptions(publicApiUrl: string) {
  return secureCookieOptions({
    baseURL: publicApiUrl,
    cookiePrefix: AUTH_COOKIE_PREFIX,
    clientIpHeader: CLIENT_IP_HEADER,
  });
}

/** The session cookie name Better Auth uses for this public API URL. */
export function adminSessionCookieName(publicApiUrl: string): string {
  return sessionCookieName(authCookieAdvancedOptions(publicApiUrl));
}
export const DATA_READ_SCOPE = "data:read";
export const DATA_WRITE_SCOPE = "data:write";
// MCP clients request exactly these. `offline_access` gets them a refresh
// token instead of a new consent every time the access token expires.
export const MCP_SCOPES_SUPPORTED = [
  DATA_READ_SCOPE,
  DATA_WRITE_SCOPE,
  "offline_access",
] as const;

export function oauthProviderInput(urls: ReturnType<typeof authUrls>) {
  return createOAuthProviderOptions({
    loginPage: `${urls.publicApiUrl}/oauth/login`,
    consentPage: `${urls.publicApiUrl}/oauth/consent`,
    scopes: [
      "openid",
      "profile",
      "email",
      "offline_access",
      DATA_READ_SCOPE,
      DATA_WRITE_SCOPE,
    ],
    validAudiences: [urls.restResource, urls.mcpResource],
    allowDynamicClientRegistration: true,
    allowUnauthenticatedDynamicClientRegistration: true,
    clientRegistrationDefaultScopes: ["openid", "profile", "email"],
    clientRegistrationAllowedScopes: [
      "offline_access",
      DATA_READ_SCOPE,
      DATA_WRITE_SCOPE,
    ],
  });
}

export function buildBetterAuthOptions(input: {
  database?: any;
  publicApiUrl: string;
  webOrigin?: string;
  secret: string;
  db?: AppDb;
}) {
  const urls = authUrls(input.publicApiUrl, input.webOrigin);

  const isProduction = process.env.NODE_ENV === "production";
  const hasPlatformGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const turnstile = captchaSettings();
  return {
    secret: input.secret,
    baseURL: input.publicApiUrl,
    basePath: AUTH_BASE_PATH,
    advanced: authCookieAdvancedOptions(input.publicApiUrl),
    // Only CourseLit's own hosts. School websites never call Better Auth:
    // learners sign in to a school through school-scoped routes, so a host a
    // school controls never holds a CourseLit-wide session.
    trustedOrigins: async (request?: Request) => {
      const origins: string[] = [
        input.publicApiUrl,
        ...(input.webOrigin ? [input.webOrigin] : []),
        ...(isProduction
          ? []
          : [
              "http://localhost:*",
              "http://localhost",
              "https://localhost:*",
              "https://localhost",
              "http://127.0.0.1:*",
              "http://127.0.0.1",
              "https://127.0.0.1:*",
              "https://127.0.0.1",
            ]),
      ];
      const originHeader = request?.headers.get("origin");
      if (!isProduction && originHeader) {
        try {
          const parsedUrl = new URL(originHeader);
          if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
            origins.push(parsedUrl.origin);
          }
        } catch {}
      }
      return origins;
    },
    user: {
      modelName: "user",
      fields: {
        email: "email",
        name: "name",
        image: "image",
        emailVerified: "emailVerified",
        createdAt: "createdAt",
        updatedAt: "updatedAt",
      },
    },
    session: {
      modelName: "session",
      // No cookie cache: a revoked session stops working immediately.
      ...secureSessionOptions(),
    },
    account: {
      modelName: "account",
    },
    verification: {
      modelName: "verification",
    },
    rateLimit: {
      window: 60,
      max: 100,
    },
    // Nobody signs in with a password: staff use email codes or Google, and
    // learners use their school's own sign-in.
    emailAndPassword: secureEmailAndPasswordOptions(),
    ...(hasPlatformGoogle
      ? {
          socialProviders: {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID!,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
              // Always show the account picker, so a school website can't
              // sign a visitor in silently with whichever account is active.
              prompt: "select_account",
            },
          },
        }
      : {}),
    ...(input.database ? { database: input.database } : {}),
    plugins: [
      ...(turnstile
        ? [
            captcha({
              provider: "cloudflare-turnstile",
              secretKey: turnstile.secretKey,
              endpoints: CAPTCHA_AUTH_ENDPOINTS,
            }),
          ]
        : []),
      jwt(),
      emailOTP({
        overrideDefaultEmailVerification: true,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          await sendVerificationOTP({ email, otp, type });
        },
      }),
      oauthProvider({
        ...oauthProviderInput(urls),
        clientRegistrationDefaultResources: [urls.mcpResource],
      }),
      cimd({
        fetchClientMetadataResource,
        metadataProfile: "mcp-2026-07-28",
        metadataRevalidationInterval: "60m",
        metadataFetchPolicy: { minimumFetchInterval: 0 },
        originBoundFields: ["post_logout_redirect_uris", "client_uri"],
      }),
    ],
  } satisfies BetterAuthOptions;
}

export async function sendVerificationOTP(
  params: {
    email: string;
    otp: string;
    type: "sign-in" | "email-verification" | "forget-password" | "change-email";
  },
  options?: {
    env?: { NODE_ENV?: string };
    deliver?: typeof sendSystemMail;
  },
) {
  const subject =
    params.type === "sign-in"
      ? "Your CourseLit Sign-in Code"
      : params.type === "forget-password"
        ? "Reset Your CourseLit Password"
        : "Verify Your CourseLit Email";

  const description =
    params.type === "sign-in"
      ? "Enter the following code to complete your CourseLit sign-in:"
      : params.type === "forget-password"
        ? "Enter the following code to reset your password:"
        : "Enter the following code to verify your email address:";

  const html = `
    <!doctype html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1a1a1a;">
        <h2 style="margin-top: 0; color: #111;">CourseLit Security Code</h2>
        <p>${description}</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 16px 24px; background: #f3f4f6; border-radius: 8px; width: fit-content; margin: 24px 0;">
          ${escapeHtml(params.otp)}
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes. If you did not request this, you can ignore this email.</p>
      </body>
    </html>
  `;

  const text = `${description} ${params.otp} (expires in 5 minutes)`;

  const env = options?.env ?? process.env;
  if (env.NODE_ENV !== "production") {
    console.info(`[CourseLit OTP] ${params.type} for ${params.email}: ${params.otp}`);
  }

  await (options?.deliver ?? sendSystemMail)({
    to: params.email,
    subject,
    text,
    html,
  });
}

export const AUTH_BASE_PATH = "/api/auth";
export const adminAuthOptions = buildBetterAuthOptions;

export function authUrls(
  publicApiUrl: string,
  webOrigin?: string,
  basePath = AUTH_BASE_PATH,
) {
  const normalized = publicApiUrl.replace(/\/$/, "");
  return {
    publicApiUrl: normalized,
    webOrigin: (webOrigin ?? normalized).replace(/\/$/, ""),
    issuer: `${normalized}${basePath}`,
    restResource: `${normalized}/api`,
    mcpResource: `${normalized}/mcp`,
  };
}
