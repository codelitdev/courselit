import { oauthProvider } from "@better-auth/oauth-provider";
import { sso } from "@better-auth/sso";
import { createOAuthProviderOptions } from "@codelitdev/oauth-server-kit/better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { jwt } from "better-auth/plugins/jwt";
import { escapeHtml, sendSystemMail } from "../system-mail.js";

export const AUTH_BASE_PATH = "/api/auth";
export const LEARNER_AUTH_BASE_PATH = "/api/learner-auth";
export const ADMIN_AUTH_COOKIE_PREFIX = "courselit-admin";
export const ADMIN_SESSION_COOKIE_NAME = `${ADMIN_AUTH_COOKIE_PREFIX}.session_token`;
export const AUTH_SECRET_MIN_LENGTH = 32;

export type AdminAuthUrls = {
  publicApiUrl: string;
  webOrigin: string;
};

export function authUrls(
  publicApiUrl: string,
  webOrigin?: string,
  basePath = AUTH_BASE_PATH,
): AdminAuthUrls & {
  issuer: string;
  restResource: string;
  mcpResource: string;
} {
  const normalized = publicApiUrl.replace(/\/$/, "");
  return {
    publicApiUrl: normalized,
    webOrigin: (webOrigin ?? normalized).replace(/\/$/, ""),
    issuer: `${normalized}${basePath}`,
    restResource: `${normalized}/api`,
    mcpResource: `${normalized}/mcp`,
  };
}

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

/** Shared Better Auth options used by the live factory and the schema generator. */
export function adminAuthOptions(input: {
  publicApiUrl: string;
  secret: string;
  webOrigin?: string;
  database?: unknown;
}) {
  const urls = authUrls(input.publicApiUrl, input.webOrigin);
  return {
    appName: "CourseLit",
    baseURL: urls.publicApiUrl,
    basePath: AUTH_BASE_PATH,
    secret: input.secret,
    trustedOrigins: async (request?: Request) => {
      const origins: string[] = [
        urls.webOrigin,
        urls.publicApiUrl,
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://openidconnect.googleapis.com",
        "https://www.googleapis.com",
      ];
      if (request) {
        const origin = request.headers.get("origin");
        if (origin && !origins.includes(origin)) {
          origins.push(origin);
        }
        const ssoTrusted = request.headers.get("ssotrusteddomain");
        if (ssoTrusted && !origins.includes(ssoTrusted)) {
          origins.push(ssoTrusted);
        }
      }
      return origins;
    },
    emailAndPassword: { enabled: true },
    account: {
      storeStateStrategy: "cookie" as const,
      accountLinking: {
        enabled: true,
        trustedProviders: ["sso", "google", "email-otp"],
      },
    },
    advanced: {
      cookiePrefix: ADMIN_AUTH_COOKIE_PREFIX,
    },
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          socialProviders: {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
      sso({
        saml: {
          enableInResponseToValidation: true,
          requestTTL: 10 * 60 * 1000,
          clockSkew: 5 * 60 * 1000,
          requireTimestamps: true,
        },
        fields: {
          domain: "domain_string",
        },
      }),
    ],
  };
}

/** Better Auth options for the school-local learner realm. */
export function learnerAuthOptions(input: {
  publicApiUrl: string;
  secret: string;
  webOrigin?: string;
  database?: unknown;
}) {
  const urls = authUrls(input.publicApiUrl, input.webOrigin, LEARNER_AUTH_BASE_PATH);
  return {
    appName: "CourseLit Learners",
    baseURL: urls.publicApiUrl,
    basePath: LEARNER_AUTH_BASE_PATH,
    secret: input.secret,
    trustedOrigins: async (request?: Request) => {
      const origins: string[] = [
        urls.webOrigin,
        urls.publicApiUrl,
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://openidconnect.googleapis.com",
        "https://www.googleapis.com",
      ];
      if (request) {
        const origin = request.headers.get("origin");
        if (origin && !origins.includes(origin)) origins.push(origin);
        const ssoTrusted = request.headers.get("ssotrusteddomain");
        if (ssoTrusted && !origins.includes(ssoTrusted)) origins.push(ssoTrusted);
      }
      return origins;
    },
    emailAndPassword: { enabled: false },
    user: { modelName: "learnerUser" },
    session: { modelName: "learnerSession" },
    account: { modelName: "learnerAccount" },
    verification: { modelName: "learnerVerification" },
    advanced: {
      cookiePrefix: "courselit-learner",
    },
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          socialProviders: {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          },
        }
      : {}),
    ...(input.database ? { database: input.database } : {}),
    plugins: [
      emailOTP({
        overrideDefaultEmailVerification: true,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          await sendVerificationOTP({ email, otp, type });
        },
      }),
      sso({
        modelName: "learnerSsoProvider",
        fields: { domain: "domain_string" },
      }),
    ],
  };
}

/** Sends authentication OTPs through the deployment's system-mail provider. */
export async function sendVerificationOTP(
  input: {
    email: string;
    otp: string;
    type?: string;
  },
  options: { env?: Record<string, string | undefined> } = {},
) {
  const otp = escapeHtml(input.otp);
  await sendSystemMail(
    {
      to: input.email,
      subject: "Your CourseLit verification code",
      text: `Enter this code to sign in to CourseLit: ${input.otp}`,
      html: `<p>Enter this code to sign in to CourseLit:</p><h2>${otp}</h2>`,
    },
    { env: options.env },
  );
}
