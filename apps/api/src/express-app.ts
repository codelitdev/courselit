import { createOAuthPagesRouter } from "@codelitdev/oauth-server-kit/express";
import {
  createPlatformError,
  readOrCreateRequestId,
  toPublicHttpError,
} from "@codelitdev/platform";
import { contract } from "@courselit/api-contract";
import { createExpressEndpoints, initServer } from "@ts-rest/express";
import { toNodeHandler } from "better-auth/node";
import express, { type Express, type RequestHandler } from "express";
import swaggerUi from "swagger-ui-express";
import { AUTH_BASE_PATH } from "./auth/options.js";
import type { DispatchDeps } from "./deps.js";
import { dispatch } from "./dispatch.js";
import { serveLearnerDownload } from "./downloads.js";
import { assertLearnerSchool, authenticateLearner } from "./learners.js";
import { createOpenApiDocument } from "./openapi.js";

export function createExpressApp(deps: DispatchDeps): Express {
  const app = express();
  app.disable("x-powered-by");
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
    const forwardedHeader = req.headers["x-forwarded-for"];
    const forwardedIp = typeof forwardedHeader === "string"
      ? forwardedHeader.split(",")[0]?.trim()
      : Array.isArray(forwardedHeader)
        ? forwardedHeader[0]?.split(",")[0]?.trim()
        : undefined;
    const clientIp = forwardedIp || req.ip || req.socket.remoteAddress || "unknown";
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
      (process.env.NODE_ENV === "production"
        ? isLoopback ? 10_000 : 1_200
        : 10_000);

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
  app.all(`${AUTH_BASE_PATH}/*`, toNodeHandler(deps.auth.auth));
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
    listPlans: forward,
    listPublicPlans: forward,
    createPlan: forward,
    updatePlan: forward,
    setDefaultPlan: forward,
    archivePlan: forward,
    createPreviewGrant: forward,
    readPreviewProduct: forward,
    getLearnerLessonMedia: forward,
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
    getProductCertificateTemplate: forward,
    upsertProductCertificateTemplate: forward,
    authorizeMediaUpload: forward,
    finalizeMediaUpload: forward,
    listMedia: forward,
    getMedia: forward,
    updateMedia: forward,
    deleteMedia: forward,
    listMediaReferences: forward,
    reconcileMediaReferences: forward,
    grantEnrollment: forward,
    learnerRequestOtp: forward,
    learnerVerifyOtp: forward,
    learnerSignUp: forward,
    learnerSignIn: forward,
    learnerSignOut: forward,
    learnerMe: forward,
    learnerEnroll: forward,
    learnerCreateDownloadLink: forward,
    learnerCheckout: forward,
    getLearnerCheckout: forward,
    learnerStartLesson: forward,
    learnerCompleteLesson: forward,
    listLearnerProgress: forward,
    listLearnerCertificates: forward,
    listLearners: forward,
    updateLearner: forward,
    verifyCertificate: forward,
    listCertificateTemplates: forward,
    createCertificateTemplate: forward,
    updateCertificateTemplate: forward,
    getEntitlement: forward,
    getBillingCatalog: forward,
    listSchools: forward,
    listSchoolFrontLitPages: forward,
    createSchoolFrontLitPage: forward,
    getSchoolFrontLitPage: forward,
    updateSchoolFrontLitPage: forward,
    publishSchoolFrontLitPage: forward,
    discardSchoolFrontLitPage: forward,
    listSchoolFrontLitBlogs: forward,
    createSchoolFrontLitBlog: forward,
    getSchoolFrontLitBlog: forward,
    updateSchoolFrontLitBlog: forward,
    publishSchoolFrontLitBlog: forward,
    discardSchoolFrontLitBlog: forward,
    updateSchool: forward,
    listSchoolHosts: forward,
    createSchoolHost: forward,
    verifySchoolHost: forward,
    deleteSchoolHost: forward,
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
