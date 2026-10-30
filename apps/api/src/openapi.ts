import { contract } from "@courselit/api-contract";
import { generateOpenApi } from "@ts-rest/open-api";
import { getOperationPolicy } from "./auth/operation-policy.js";

const operationIdByRoute = new Map<unknown, string>(
  Object.entries(contract).map(([operationId, route]) => [route, operationId]),
);

/**
 * Documents which credentials each operation accepts, straight from the
 * runtime operation policy. Browser sessions are not an API-client mechanism
 * and are not listed.
 */
function securityFor(route: unknown): Array<Record<string, string[]>> | undefined {
  const operationId = operationIdByRoute.get(route);
  const policy = operationId ? getOperationPolicy(operationId) : null;
  if (!policy) return undefined;
  if (policy.audience !== "school" && policy.audience !== "account") return [];
  const allowed: readonly string[] = policy.allowedCredentials;
  const security: Array<Record<string, string[]>> = [];
  if (allowed.includes("api_key")) security.push({ apiKey: [] });
  if (allowed.includes("oauth")) security.push({ oauth: [] });
  return security;
}

const openApiTags = [
  { name: "System", description: "API health and readiness checks." },
  {
    name: "School & Team",
    description:
      "School selection, school settings, team membership, invitations, and API keys.",
  },
  {
    name: "School Website",
    description: "School website pages, blogs, branding, themes, and code injection.",
  },
  {
    name: "Products & Courses",
    description:
      "Product configuration, course content, plans, previews, and product analytics.",
  },
  {
    name: "Communities",
    description:
      "Community setup, spaces, membership, discussions, moderation, and plans.",
  },
  {
    name: "Learners",
    description:
      "Learner authentication, memberships, learning activity, community access, and checkout.",
  },
  {
    name: "Storefront & Payments",
    description:
      "Sales pages, storefront checkout, payment settings, and payment provider webhooks.",
  },
  {
    name: "Public Website",
    description:
      "School-scoped public routes (`/v1/public/{schoolId}/...`): site content, catalog, lead magnets, and newsletter subscription, plus website host resolution.",
  },
  {
    name: "Media",
    description: "School media uploads, library management, and media references.",
  },
  {
    name: "Contacts & Marketing",
    description: "School contacts, contact segments, and segment membership.",
  },
  {
    name: "Platform Billing",
    description: "CourseLit school subscription catalog and entitlement information.",
  },
  {
    name: "Certificates",
    description: "Certificate templates and public certificate verification.",
  },
  {
    name: "Notifications",
    description: "School administrator notification reads and status updates.",
  },
] as const;

type OpenApiTag = (typeof openApiTags)[number]["name"];

function isPathOrChild(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function tagForPath(path: string | undefined): OpenApiTag {
  if (!path) throw new Error("OpenAPI route is missing its path");

  if (path === "/health" || path === "/ready") return "System";
  if (isPathOrChild(path, "/v1/learner") || path === "/v1/memberships") {
    return "Learners";
  }
  if (isPathOrChild(path, "/v1/notifications")) return "Notifications";
  if (/^\/v1\/public\/[^/]+\/checkout-sessions(?:\/|$)/.test(path)) {
    return "Storefront & Payments";
  }
  if (isPathOrChild(path, "/v1/public")) return "Public Website";
  if (
    isPathOrChild(path, "/v1/school/website") ||
    path === "/v1/school/code-injection"
  ) {
    return "School Website";
  }
  if (
    isPathOrChild(path, "/v1/storefront") ||
    isPathOrChild(path, "/v1/sales-pages") ||
    path === "/v1/school/payment-settings"
  ) {
    return "Storefront & Payments";
  }
  if (isPathOrChild(path, "/v1/billing")) return "Platform Billing";
  if (
    isPathOrChild(path, "/v1/certificates") ||
    isPathOrChild(path, "/v1/certificate-templates")
  ) {
    return "Certificates";
  }
  if (
    isPathOrChild(path, "/v1/communities") ||
    path.startsWith("/v1/community-") ||
    isPathOrChild(path, "/v1/spaces")
  ) {
    return "Communities";
  }
  if (
    isPathOrChild(path, "/v1/products") ||
    isPathOrChild(path, "/v1/sections") ||
    isPathOrChild(path, "/v1/lessons") ||
    isPathOrChild(path, "/v1/plans") ||
    isPathOrChild(path, "/v1/preview")
  ) {
    return "Products & Courses";
  }
  if (isPathOrChild(path, "/v1/media")) return "Media";
  if (
    isPathOrChild(path, "/v1/contacts") ||
    isPathOrChild(path, "/v1/contact-segments")
  ) {
    return "Contacts & Marketing";
  }
  if (
    isPathOrChild(path, "/api/school") ||
    isPathOrChild(path, "/v1/api-keys") ||
    isPathOrChild(path, "/v1/invitations") ||
    isPathOrChild(path, "/v1/team-invitations") ||
    isPathOrChild(path, "/v1/school") ||
    isPathOrChild(path, "/v1/schools")
  ) {
    return "School & Team";
  }

  throw new Error(`OpenAPI route has no feature tag: ${path}`);
}

function configurableServer(publicApiUrl: string) {
  const configuredUrl = new URL(publicApiUrl);
  const protocol = configuredUrl.protocol === "http:" ? "http" : "https";
  const basePath = configuredUrl.pathname.replace(/\/+$/, "");

  return {
    url: `{protocol}://{host}${basePath}`,
    description: "API Server",
    variables: {
      protocol: {
        default: protocol,
        enum: ["https", "http"],
      },
      host: {
        default: configuredUrl.host,
      },
    },
  };
}

export function createOpenApiDocument(publicApiUrl: string) {
  return generateOpenApi(
    contract,
    {
      info: {
        title: "CourseLit API",
        version: "1.0.0",
      },
      servers: [configurableServer(publicApiUrl)],
      tags: openApiTags.map((tag) => ({ ...tag })),
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            in: "header",
            name: "x-api-key",
            description:
              "School API key (`cl_live_...`). Created in Settings > API keys. Pinned to one school; X-School-ID is ignored.",
          },
          oauth: {
            type: "http",
            scheme: "bearer",
            description: "OAuth 2.1 access token. Send X-School-ID to select a school.",
          },
        },
      },
    },
    {
      operationMapper: (operation, route) => {
        const security = securityFor(route);
        return {
          ...operation,
          tags: [tagForPath((route as { path?: string }).path)],
          ...(security ? { security } : {}),
        };
      },
    },
  );
}
