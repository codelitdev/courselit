import { billingWebhookPath, handleBillingWebhook } from "@codelitdev/platform/billing";
import { createOAuthPagesRouter } from "@codelitdev/oauth-server-kit/express";
import { createMcpOAuthDiscoveryRoutes } from "@codelitdev/oauth-server-kit/mcp";
import {
  createPlatformError,
  readOrCreateRequestId,
  toPublicHttpError,
} from "@codelitdev/platform";
import { contract } from "@courselit/api-contract";
import { createExpressEndpoints, initServer } from "@ts-rest/express";
import { toNodeHandler } from "better-auth/node";
import express, { type Express, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import {
  createClientIpMiddleware,
  parseTrustProxy,
} from "@codelitdev/oauth-server-kit/express";
import { CLIENT_IP_HEADER } from "./auth/api-key-throttle.js";
import { captchaSettings } from "./captcha.js";
import swaggerUi from "swagger-ui-express";
import {
  AUTH_BASE_PATH,
  MCP_SCOPES_SUPPORTED,
} from "./auth/options.js";
import type { DispatchDeps } from "./deps.js";
import { dispatch } from "./dispatch.js";
import { serveLearnerDownload } from "./downloads.js";
import { registerLearnerGoogleRoutes } from "./learner-google-routes.js";
import { registerLearnerSsoRoutes } from "./learner-sso-routes.js";
import { assertLearnerSchool, authenticateLearner, isSecureCookieUrl } from "./learners.js";
import { createOpenApiDocument } from "./openapi.js";
import { authenticateHttpRequest } from "./auth/authenticate.js";
import {
  authorizeOperationCredential,
  type CredentialKind,
  operationPermissionsAllow,
} from "./auth/operation-policy.js";
import { resolveSchoolContext } from "./school-context.js";
import { subscribeToNotifications } from "./notification-stream.js";

export function createExpressApp(deps: DispatchDeps): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));
  // Resolves the client address from the trusted proxy chain (`req.ip`) and
  // overwrites any client-sent CLIENT_IP_HEADER; rate limiting, API-key
  // throttling and Better Auth all read that header.
  app.use(createClientIpMiddleware({ header: CLIENT_IP_HEADER }));
  const buckets = new Map<string, { window: number; count: number }>();
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    const requestId = readOrCreateRequestId(
      typeof req.headers["x-request-id"] === "string"
        ? req.headers["x-request-id"]
        : undefined,
      deps.clock,
    );
    // Keep the generated correlation ID on the request as well as the
    // response so ts-rest and the fallback dispatcher audit the same value.
    req.headers["x-request-id"] = requestId;
    res.setHeader("X-Request-ID", requestId);
    const now = Date.now();
    const clientIp = String(req.headers[CLIENT_IP_HEADER] ?? "unknown");
    const key = clientIp;
    const isLoopback =
      clientIp === "127.0.0.1" ||
      clientIp === "::1" ||
      clientIp === "::ffff:127.0.0.1" ||
      clientIp === "localhost" ||
      clientIp === "unknown";
    const configuredLimit = process.env.RATE_LIMIT_PER_MINUTE
      ? Number.parseInt(process.env.RATE_LIMIT_PER_MINUTE, 10)
      : undefined;
    const maxRequests =
      configuredLimit ??
      (process.env.NODE_ENV === "production" ? (isLoopback ? 10_000 : 1_200) : 10_000);

    const window = Math.floor(now / 60_000);
    if (buckets.size > 10_000) buckets.clear();
    const current = buckets.get(key);
    if (!current || current.window !== window) {
      buckets.set(key, { window, count: 1 });
    } else if (current.count >= maxRequests) {
      res.setHeader("Retry-After", "60");
      res.status(429).json({
        code: "rate_limited",
        message: "The request was rate limited.",
      });
      return;
    } else {
      current.count += 1;
    }
    next();
  });
  const authNodeHandler = toNodeHandler(deps.auth.auth);
  app.use(
    createMcpOAuthDiscoveryRoutes({
      auth: deps.auth.auth,
      oauthResourceClient: deps.auth.oauthResourceClient,
      resourceUrl: deps.auth.mcpResource,
      scopesSupported: [...MCP_SCOPES_SUPPORTED],
      allowedOrigins: "*",
    }),
  );
  app.post(
    `${AUTH_BASE_PATH}/oauth2/register`,
    rateLimit({
      windowMs: 60_000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "too_many_requests",
        error_description: "Too many client registration requests.",
      },
    }),
  );
  app.all(`${AUTH_BASE_PATH}/*`, authNodeHandler);
  registerLearnerGoogleRoutes(app, deps);
  registerLearnerSsoRoutes(app, deps);
  const captcha = captchaSettings();
  app.use(
    createOAuthPagesRouter({
      appName: "CourseLit",
      authBasePath: AUTH_BASE_PATH,
      allowedRedirectOrigins: [new URL(deps.auth.webOrigin).origin],
      defaultRedirectUrl: `${deps.auth.webOrigin}/`,
      logoUrl: new URL("/icon.svg", deps.auth.webOrigin).toString(),
      faviconUrl: new URL("/icon.svg", deps.auth.webOrigin).toString(),
      primaryColor: "oklch(0.6 0.14 30)",
      loginMethods: [{ type: "email-otp" }],
      ...(captcha
        ? { captcha: { provider: "cloudflare-turnstile", siteKey: captcha.siteKey } }
        : {}),
    }),
  );
  // Swagger typings can resolve a separate Express type version, so
  // normalize its handlers at this boundary.
  app.use(
    "/docs",
    ...(swaggerUi.serve as unknown as RequestHandler[]),
    swaggerUi.setup(createOpenApiDocument(deps.auth.publicApiUrl), {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: "none",
        defaultModelsExpandDepth: -1,
      },
    }) as unknown as RequestHandler,
  );
  app.post(
    [
      "/v1/storefront/webhooks/stripe",
      "/v1/storefront/webhooks/lemonsqueezy",
      "/v1/storefront/webhooks/razorpay",
    ],
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res, next) => {
      try {
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
        const response = await dispatch(deps, {
          method: req.method,
          path: req.originalUrl ?? req.url ?? req.path,
          headers: req.headers as Record<string, string | string[] | undefined>,
          rawBody,
        });
        for (const [name, value] of Object.entries(response.headers ?? {})) {
          res.setHeader(name, value);
        }
        if (response.body === null || response.body === undefined) {
          res.status(response.status).end();
          return;
        }
        res.status(response.status).json(response.body);
      } catch (error) {
        next(error);
      }
    },
  );
  // Platform billing webhooks (school plans). The raw body is kept for signature
  // verification; the event is stored, then projected in the background.
  const webhookWindowMs = 60_000;
  const webhookLimit = Number(process.env.BILLING_WEBHOOK_RATE_LIMIT_PER_MINUTE ?? 300);
  let webhookWindow = { start: 0, requests: 0, rejected: 0, alerted: false };
  app.post(
    billingWebhookPath(":provider"),
    (req, res, next) => {
      const now = Date.now();
      if (now - webhookWindow.start >= webhookWindowMs) {
        webhookWindow = { start: now, requests: 0, rejected: 0, alerted: false };
      }
      webhookWindow.requests += 1;
      if (webhookWindow.requests > webhookLimit) {
        res.status(429).json({ error: "rate_limited" });
        return;
      }
      next();
    },
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res, next) => {
      try {
        if (deps.billingMode !== "cloud" || req.params.provider !== "dodo") {
          res.status(404).json({ error: "not_found" });
          return;
        }
        let failure: unknown;
        const response = await handleBillingWebhook({
          billing: deps.billing.billing,
          provider: "dodo",
          rawBody: Buffer.isBuffer(req.body) && req.body.length > 0 ? req.body : undefined,
          headers: req.headers,
          workerId: `courselit-billing-webhook-${process.pid}`,
          onError: (error) => {
            failure = error;
            // After the response, this is the background inbox drain: the worker retries it.
            if (res.headersSent) {
              deps.observability?.logger.warn(
                { error: error instanceof Error ? error.message : String(error) },
                "billing webhook inbox drain failed",
              );
            }
          },
        });
        if (response.status === 400) {
          // A rejected signature or body. A burst of these means someone is probing
          // the endpoint, or the signing secret is wrong.
          webhookWindow.rejected += 1;
          if (webhookWindow.rejected >= 10 && !webhookWindow.alerted) {
            webhookWindow.alerted = true;
            deps.observability?.logger.error(
              { rejected: webhookWindow.rejected },
              "billing webhook signature failures are spiking",
            );
          }
        } else if (response.status === 503 && failure !== undefined) {
          deps.observability?.logger.error(
            { error: failure instanceof Error ? failure.message : String(failure) },
            "billing webhook could not be stored",
          );
          deps.observability?.captureException({ error: failure, source: "billing.webhook" });
        }
        res.status(response.status).json(response.body);
      } catch (error) {
        next(error);
      }
    },
  );
  // Service banner, so the bare host answers without credentials.
  app.get("/", (_req, res) => {
    res.json({
      service: "CourseLit API",
      status: "ok",
      health: "/health",
      openapi: "/openapi.json",
      mcp: "/mcp",
    });
  });

  app.use(express.json({ limit: "32kb" }));

  // Binary download delivery is intentionally kept outside the generated
  // ts-rest router. The link-creation operation remains contract-first, while
  // this route can set attachment headers and stream the archive.
  app.get("/v1/learner/downloads/:token", async (req, res, next) => {
    try {
      const learnerAuth = await authenticateLearner(
        deps.db,
        req.headers as Record<string, string | string[] | undefined>,
        deps.clock,
        isSecureCookieUrl(deps.auth.publicApiUrl),
      );
      if (learnerAuth.kind !== "authenticated") {
        const mapped = toPublicHttpError(
          learnerAuth.kind === "rejected"
            ? learnerAuth.error
            : createPlatformError("unauthenticated"),
        );
        res.status(mapped.status).json(mapped.body);
        return;
      }
      const schoolCheck = assertLearnerSchool(
        learnerAuth.value,
        typeof req.headers["x-school-id"] === "string"
          ? req.headers["x-school-id"]
          : null,
      );
      if (!schoolCheck.ok) {
        const mapped = toPublicHttpError(schoolCheck.error);
        res.status(mapped.status).json(mapped.body);
        return;
      }
      const result = await serveLearnerDownload(
        deps.db,
        deps.mediaLit,
        {
          schoolId: learnerAuth.value.school.id,
          learnerId: learnerAuth.value.learner.id,
          token: req.params.token,
          requestId: String(req.headers["x-request-id"] ?? "download"),
        },
        deps.clock,
      );
      if (!result.ok) {
        const mapped = toPublicHttpError(result.error);
        res.status(mapped.status).json(mapped.body);
        return;
      }
      if (result.value.kind === "empty") {
        res.status(200).json({ message: result.value.message });
        return;
      }
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.value.fileName.replace(/"/g, "")}"`,
      );
      res.status(200).send(Buffer.from(result.value.bytes));
    } catch (error) {
      next(error);
    }
  });

  app.get("/v1/learner/notifications/stream", async (req, res, next) => {
    try {
      const learnerAuth = await authenticateLearner(
        deps.db,
        req.headers as Record<string, string | string[] | undefined>,
        deps.clock,
        isSecureCookieUrl(deps.auth.publicApiUrl),
      );
      if (learnerAuth.kind !== "authenticated") {
        res.status(401).end();
        return;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(": connected\n\n");

      const unsubscribe = subscribeToNotifications(
        {
          audience: "learner",
          schoolId: learnerAuth.value.school.id,
          recipientId: learnerAuth.value.schoolAccount.id,
        },
        (event) => {
          res.write(
            `event: notification\ndata: ${JSON.stringify(event.notification)}\n\n`,
          );
        },
      );
      req.on("close", () => {
        unsubscribe();
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/v1/notifications/stream", async (req, res, next) => {
    try {
      const adminAuth = await authenticateHttpRequest(
        req.headers as Record<string, string | string[] | undefined>,
        deps,
      );
      if (adminAuth.kind !== "authenticated") {
        res.status(401).end();
        return;
      }
      // The stream pushes what `listAdminNotifications` returns, so it gets
      // that operation's checks: the credential kind it allows (a browser
      // session, never an API key), an active staff membership in the school,
      // and the permissions it requires.
      const operationId = "listAdminNotifications";
      if (
        authorizeOperationCredential(
          operationId,
          adminAuth.credential.kind as CredentialKind,
        )
      ) {
        res.status(403).end();
        return;
      }
      const schoolPublicId =
        typeof req.query.schoolId === "string" ? req.query.schoolId : "";
      const school = await resolveSchoolContext({
        db: deps.db,
        clock: deps.clock,
        principalId: adminAuth.principalId,
        credential: adminAuth.credential,
        requestedPublicSchoolId: schoolPublicId || null,
      });
      if (
        !school.ok ||
        !operationPermissionsAllow(operationId, {
          permissions: school.value.permissions,
          isOwner: school.value.isOwner,
        })
      ) {
        res.status(403).end();
        return;
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      res.write(": connected\n\n");

      const unsubscribe = subscribeToNotifications(
        {
          audience: "admin",
          schoolId: school.value.schoolId,
          recipientId: school.value.schoolAccountId,
        },
        (event) => {
          res.write(
            `event: notification\ndata: ${JSON.stringify(event.notification)}\n\n`,
          );
        },
      );
      req.on("close", () => {
        unsubscribe();
      });
    } catch (error) {
      next(error);
    }
  });

  const server = initServer();
  const forward = async (input: {
    req: {
      method: string;
      path: string;
      headers: Record<string, string | string[] | undefined>;
      body?: unknown;
    };
    res: { setHeader(name: string, value: string): void };
  }) => {
    const req = input.req as typeof input.req & {
      originalUrl?: string;
      url?: string;
    };
    const path = req.originalUrl ?? req.url ?? req.path;
    const response = await dispatch(deps, {
      method: input.req.method,
      path,
      headers: input.req.headers,
      body: input.req.body,
    });
    for (const [name, value] of Object.entries(response.headers ?? {})) {
      input.res.setHeader(name, value);
    }
    return { status: response.status, body: response.body } as never;
  };
  const router = server.router(contract, {
    health: forward,
    ready: forward,
    resolvePublicHost: forward,
    getCaptchaConfig: forward,
    getPublicProduct: forward,
    getPublicLoginMethods: forward,
    signUpForLeadMagnet: forward,
    listProducts: forward,
    listPublicProducts: forward,
    listPublicCommunities: forward,
    listPublicCommunityPlans: forward,
    createProduct: forward,
    updateProduct: forward,
    deleteProduct: forward,
    getProduct: forward,
    getSalesPage: forward,
    getProductAnalytics: forward,
    listProductCustomers: forward,
    getProductCustomerProgress: forward,
    cancelProductCustomerSubscription: forward,
    removeProductCustomerAccess: forward,
    cancelLearnerProductSubscription: forward,
    listPlans: forward,
    listPublicPlans: forward,
    createPlan: forward,
    updatePlan: forward,
    setDefaultPlan: forward,
    archivePlan: forward,
    createPreviewGrant: forward,
    readPreviewProduct: forward,
    getPublicLessonMedia: forward,
    getPreviewLessonMedia: forward,
    getLearnerScormRuntime: forward,
    updateLearnerScormRuntime: forward,
    processScormPackage: forward,
    evaluateLearnerQuiz: forward,
    createLesson: forward,
    listSections: forward,
    createSection: forward,
    reorderSections: forward,
    reorderLessons: forward,
    updateLesson: forward,
    updateSection: forward,
    getSectionDripEmail: forward,
    updateSectionDripEmail: forward,
    getProductCertificateTemplate: forward,
    upsertProductCertificateTemplate: forward,
    authorizeMediaUpload: forward,
    finalizeMediaUpload: forward,
    listMedia: forward,
    searchUnsplash: forward,
    getMedia: forward,
    updateMedia: forward,
    deleteMedia: forward,
    listMediaReferences: forward,
    grantLearnerMembership: forward,
    learnerRequestEmailCode: forward,
    learnerVerifyEmailCode: forward,
    learnerStartGoogleSignIn: forward,
    learnerStartSsoSignIn: forward,
    consumeSchoolAuthTicket: forward,
    learnerSignOut: forward,
    learnerMe: forward,
    createLearnerMembership: forward,
    learnerCreateDownloadLink: forward,
    learnerCheckout: forward,
    getLearnerCheckout: forward,
    learnerCompleteLesson: forward,
    listLearnerProgress: forward,
    listLearnerCertificates: forward,
    listLearnerPurchases: forward,
    listContacts: forward,
    getContact: forward,
    createContact: forward,
    updateContact: forward,
    updateContactMarketing: forward,
    deleteContact: forward,
    filterPreviewContacts: forward,
    listContactSegments: forward,
    createContactSegment: forward,
    getContactSegment: forward,
    updateContactSegment: forward,
    deleteContactSegment: forward,
    getContactSegmentMembers: forward,
    listContactTags: forward,
    getContactTagReferences: forward,
    renameContactTag: forward,
    deleteContactTag: forward,
    subscribeNewsletter: forward,
    verifyCertificate: forward,
    listCertificateTemplates: forward,
    createCertificateTemplate: forward,
    updateCertificateTemplate: forward,
    getEntitlement: forward,
    getBillingCatalog: forward,
    listSchools: forward,
    listSchoolTeam: forward,
    updateSchoolTeamMember: forward,
    removeSchoolTeamMember: forward,
    previewTeamInvitation: forward,
    acceptTeamInvitation: forward,
    rejectTeamInvitation: forward,
    listSchoolWebsitePages: forward,
    createSchoolWebsitePage: forward,
    getSchoolWebsitePage: forward,
    updateSchoolWebsitePage: forward,
    publishSchoolWebsitePage: forward,
    discardSchoolWebsitePage: forward,
    getSchoolWebsiteBranding: forward,
    updateSchoolWebsiteBranding: forward,
    listSchoolWebsiteBrandingThemes: forward,
    createSchoolWebsiteBrandingTheme: forward,
    updateSchoolWebsiteBrandingTheme: forward,
    listSchoolWebsiteBlogs: forward,
    createSchoolWebsiteBlog: forward,
    getSchoolWebsiteBlog: forward,
    updateSchoolWebsiteBlog: forward,
    publishSchoolWebsiteBlog: forward,
    unpublishSchoolWebsiteBlog: forward,
    discardSchoolWebsiteBlog: forward,
    updateSchool: forward,
    listSchoolHosts: forward,
    createSchoolHost: forward,
    verifySchoolHost: forward,
    deleteSchoolHost: forward,
    getSchoolLoginMethods: forward,
    updateSchoolLoginMethods: forward,
    listSsoConnections: forward,
    createSsoConnection: forward,
    getSsoConnection: forward,
    updateSsoConnection: forward,
    deleteSsoConnection: forward,
    addSsoDomain: forward,
    verifySsoDomain: forward,
    deleteSsoDomain: forward,
    startSsoConnectionTest: forward,
    getSsoConnectionTestResult: forward,
    activateSsoConnection: forward,
    disableSsoConnection: forward,
    unlinkSsoIdentity: forward,
    createSchool: forward,
    selectSchool: forward,
    listApiKeys: forward,
    createApiKey: forward,
    revokeApiKey: forward,
    createInvitation: forward,
    acceptInvitation: forward,
    revokeInvitation: forward,
    stripeWebhook: forward,
    lemonSqueezyWebhook: forward,
    razorpayWebhook: forward,
  } as never);
  createExpressEndpoints(contract, router, app, {
    logInitialization: false,
    responseValidation: true,
    requestValidationErrorHandler: (_error, _req, res) => {
      res.status(400).json({
        code: "validation_failed",
        message: "The request body is invalid.",
      });
    },
  });
  app.use(async (req, res, next) => {
    try {
      const requestId = readOrCreateRequestId(
        typeof req.headers["x-request-id"] === "string"
          ? req.headers["x-request-id"]
          : undefined,
        deps.clock,
      );
      res.setHeader("X-Request-ID", requestId);
      const response = await dispatch(deps, {
        method: req.method,
        path: req.originalUrl ?? req.url ?? req.path,
        headers: req.headers as Record<string, string | string[] | undefined>,
        body: req.body,
      });
      for (const [name, value] of Object.entries(response.headers ?? {})) {
        res.setHeader(name, value);
      }
      if (response.body === null || response.body === undefined) {
        res.status(response.status).end();
        return;
      }
      res.status(response.status).json(response.body);
    } catch (error) {
      next(error);
    }
  });
  app.use(
    (
      error: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      deps.observability?.captureException({
        error,
        source: "express",
        context: { method: req.method, path: req.path },
      });
      if (res.headersSent) {
        next(error);
        return;
      }
      const isSyntax = error instanceof SyntaxError;
      res.status(isSyntax ? 400 : 500).json({
        code: isSyntax ? "validation_failed" : "internal_error",
        message: isSyntax
          ? "The request body is invalid."
          : "The request could not be completed.",
      });
    },
  );
  return app;
}
