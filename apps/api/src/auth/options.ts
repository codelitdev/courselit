import { createOAuthProviderOptions } from "@codelitdev/oauth-server-kit/better-auth";
import { emailOTP } from "better-auth/plugins";
import { jwt } from "better-auth/plugins/jwt";
import { oauthProvider } from "@better-auth/oauth-provider";
import type { BetterAuthOptions } from "better-auth";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";
import { escapeHtml, sendSystemMail } from "../system-mail.js";

export function oauthProviderInput(urls: ReturnType<typeof authUrls>) {
  return createOAuthProviderOptions({
    loginPage: `${urls.publicApiUrl}/oauth/login`,
    consentPage: `${urls.publicApiUrl}/oauth/consent`,
    scopes: ["openid", "profile", "email", "offline_access", "data:read"],
    validAudiences: [urls.restResource, urls.mcpResource],
    clientRegistrationDefaultScopes: ["openid", "profile", "email"],
    clientRegistrationAllowedScopes: ["offline_access", "data:read"],
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
  const platformDomain = (
    process.env.PLATFORM_SITE_DOMAIN ?? "courselit.app"
  )
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/:\d+$/, "")
    .replace(/^\./, "");

  return {
    secret: input.secret,
    baseURL: input.publicApiUrl,
    basePath: AUTH_BASE_PATH,
    trustedOrigins: async (request?: Request) => {
      const origins: string[] = [
        input.publicApiUrl,
        ...(input.webOrigin ? [input.webOrigin] : []),
        ...(platformDomain
          ? [
              `https://*.${platformDomain}`,
              `http://*.${platformDomain}`,
              `https://${platformDomain}`,
              `http://${platformDomain}`,
            ]
          : []),
        ...(isProduction
          ? []
          : [
              "http://*.localhost:*",
              "http://*.localhost",
              "https://*.localhost:*",
              "https://*.localhost",
              "http://localhost:*",
              "http://localhost",
              "https://localhost:*",
              "https://localhost",
              "http://127.0.0.1:*",
              "http://127.0.0.1",
              "https://127.0.0.1:*",
              "https://127.0.0.1",
              "http://localhost:3000",
              "http://localhost:3001",
              "http://127.0.0.1:3000",
              "http://127.0.0.1:3001",
              "http://localhost:5173",
              "http://localhost:5174",
            ]),
      ];

      if (request) {
        const originHeader =
          request.headers.get("origin") ??
          request.headers.get("referer") ??
          request.headers.get("x-forwarded-host");
        if (originHeader) {
          try {
            const parsedUrl =
              originHeader.startsWith("http://") ||
              originHeader.startsWith("https://")
                ? new URL(originHeader)
                : new URL(`http://${originHeader}`);
            const hostname = parsedUrl.hostname.toLowerCase();
            if (
              !isProduction &&
              (hostname === "localhost" ||
                hostname.endsWith(".localhost") ||
                hostname === "127.0.0.1")
            ) {
              origins.push(parsedUrl.origin);
            }
            if (input.db && hostname) {
              const host = await input.db
                .select({ id: schema.schoolHosts.id })
                .from(schema.schoolHosts)
                .where(
                  and(
                    eq(schema.schoolHosts.hostname, hostname),
                    eq(schema.schoolHosts.verificationStatus, "verified"),
                  ),
                )
                .limit(1);
              if (host[0]) {
                origins.push(`https://${hostname}`);
                origins.push(`http://${hostname}`);
                origins.push(parsedUrl.origin);
              }
            }
          } catch {}
        }
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
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
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
    emailAndPassword: {
      enabled: true,
    },
    ...(hasPlatformGoogle
      ? {
          socialProviders: {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID!,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            },
          },
        }
      : {}),
    ...(input.database ? { database: input.database } : {}),
    plugins: [
      jwt(),
      emailOTP({
        overrideDefaultEmailVerification: true,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          await sendVerificationOTP({ email, otp, type });
        },
      }),
      oauthProvider(oauthProviderInput(urls)),
    ],
  };
}

export async function sendVerificationOTP(
  params: {
    email: string;
    otp: string;
    type: "sign-in" | "email-verification" | "forget-password" | "change-email";
  },
  options?: { env?: { NODE_ENV?: string } },
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
  if (env.NODE_ENV !== "production" || !process.env.RESEND_API_KEY) {
    console.info(`[CourseLit OTP] ${params.type} for ${params.email}: ${params.otp}`);
  }

  await sendSystemMail({
    to: params.email,
    subject,
    text,
    html,
  });
}

export const AUTH_BASE_PATH = "/api/auth";
export const LEARNER_AUTH_BASE_PATH = "/api/auth";
export const ADMIN_SESSION_COOKIE_NAME = "better-auth.session_token";
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
