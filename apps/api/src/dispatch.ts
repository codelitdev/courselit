import {
  captureAndMapException,
  createPlatformError,
  healthReport,
  type PlatformRequestContext,
  readinessReport,
  readOrCreateRequestId,
  selectHttpCredential,
  toPublicHttpError,
  uuidv7,
} from "@codelitdev/platform";
import {
  activityRangeSchema,
  addCommunityCategoryBodySchema,
  authorizeMediaUploadBodySchema,
  communityListQuerySchema,
  communityMembershipListQuerySchema,
  communityReactionBodySchema,
  communityStatusQuerySchema,
  communitySubscriptionBodySchema,
  createCertificateTemplateBodySchema,
  createCheckoutSessionBodySchema,
  createCommunityBodySchema,
  createCommunityCommentBodySchema,
  createCommunityPaymentPlanBodySchema,
  createCommunityPostBodySchema,
  createCommunityReportBodySchema,
  createDiscussionCommentBodySchema,
  createDiscussionReplyBodySchema,
  createDiscussionReportBodySchema,
  createLearnerCheckoutBodySchema,
  createLearnerCommunityCheckoutBodySchema,
  createLearnerDownloadLinkBodySchema,
  createLessonBodySchema,
  createPreviewGrantBodySchema,
  createProductBodySchema,
  createSchoolBodySchema,
  createSchoolHostBodySchema,
  createSchoolWebsiteBlogBodySchema,
  createSchoolWebsitePageBodySchema,
  createSchoolWebsiteThemeBodySchema,
  createSectionBodySchema,
  createSpaceBodySchema,
  createSpacePostBodySchema,
  createStorefrontPlanBodySchema,
  deleteCommunityCategoryBodySchema,
  deleteSpaceBodySchema,
  discussionLikeBodySchema,
  discussionListQuerySchema,
  discussionSubscriptionBodySchema,
  evaluateQuizBodySchema,
  finalizeMediaUploadBodySchema,
  joinCommunityBodySchema,
  learnerAuthBodySchema,
  learnerAvatarMediaAuthorizationBodySchema,
  learnerAvatarMediaFinalizeBodySchema,
  learnerCommunityMediaAuthorizationBodySchema,
  learnerCommunityMediaListQuerySchema,
  leaveCommunityBodySchema,
  listProductsQuerySchema,
  notificationListQuerySchema,
  notificationPreferenceTypeSchema,
  orderSpacesBodySchema,
  processScormPackageBodySchema,
  productAnalyticsRangeSchema,
  reconcileMediaReferencesBodySchema,
  reorderLessonsBodySchema,
  reorderSectionsBodySchema,
  scormRuntimeUpdateBodySchema,
  searchUnsplashQuerySchema,
  startCheckoutSessionBodySchema,
  updateCertificateTemplateBodySchema,
  updateCommunityBodySchema,
  updateCommunityCommentBodySchema,
  updateCommunityMembershipBodySchema,
  updateCommunityPaymentPlanBodySchema,
  updateCommunityPostBodySchema,
  updateCommunityReportBodySchema,
  updateDiscussionReportBodySchema,
  updateLearnerProfileBodySchema,
  updateLessonBodySchema,
  updateMediaBodySchema,
  updateNotificationPreferenceBodySchema,
  updateProductBodySchema,
  updateSchoolBodySchema,
  updateSchoolCodeInjectionBodySchema,
  updateSchoolPaymentSettingsBodySchema,
  updateSchoolWebsiteBlogBodySchema,
  updateSchoolWebsiteBrandingBodySchema,
  updateSchoolWebsitePageBodySchema,
  updateSchoolWebsiteThemeBodySchema,
  updateSectionBodySchema,
  updateSpaceBodySchema,
  updateStorefrontPlanBodySchema,
  upsertProductCertificateTemplateBodySchema,
  verifySchoolHostBodySchema,
} from "@courselit/api-contract";
import { and, eq, isNull, or } from "drizzle-orm";
import { ActivityType, getSchoolOverview, recordActivity } from "./activities.js";
import {
  createApiKeyRecord,
  listApiKeyRecords,
  revokeApiKey,
} from "./auth/api-keys.js";
import { authenticateHttpRequest } from "./auth/authenticate.js";
import { ADMIN_SESSION_COOKIE_NAME } from "./auth/options.js";
import {
  createLesson,
  createSection,
  deleteLesson,
  deleteSection,
  getProduct,
  listSections,
  reorderLessons,
  reorderSections,
  updateLesson,
  updateSection,
} from "./catalog.js";
import {
  createCertificateTemplate,
  getProductCertificateTemplate,
  listCertificateTemplates,
  listLearnerCertificates,
  updateCertificateTemplate,
  upsertProductCertificateTemplate,
  verifyCertificate,
} from "./certificates.js";
import {
  createCheckoutSession,
  getCheckoutSession,
  getLearnerCheckout,
  receivePaymentWebhook,
  startCheckoutSession,
  startLearnerCheckout,
} from "./commerce.js";
import {
  addCommunityCategory,
  createComment,
  createCommunity,
  createPost,
  createReport,
  deleteComment,
  deleteCommunity,
  deleteCommunityCategory,
  deletePost,
  getCommunity,
  getPost,
  getPublicCommunity,
  joinCommunity,
  leaveCommunity,
  listAvailableLearnerCommunities,
  listComments,
  listCommunities,
  listLearnerCommunities,
  listLearnerFeed,
  listMemberships,
  listPosts,
  listPublicCommunities,
  listReports,
  togglePostSubscription,
  toggleReaction,
  updateComment,
  updateCommunity,
  updateMembership,
  updatePost,
  updateReport,
} from "./communities.js";
import {
  getLearnerCommunityCheckout,
  listLearnerCommunityPlans,
  startLearnerCommunityCheckout,
} from "./community-commerce.js";
import {
  archiveCommunityPlan,
  createCommunityPlan,
  listCommunityPlans,
  listPublicCommunityPlans,
  setDefaultCommunityPlan,
  updateCommunityPlan,
} from "./community-plans.js";
import * as schema from "./db/schema/index.js";
import type { DispatchDeps } from "./deps.js";
import { createLearnerDownloadLink } from "./downloads.js";
import {
  createFrontLitBlog,
  createFrontLitPage,
  createFrontLitTheme,
  discardFrontLitBlogDraft,
  discardFrontLitPageDraft,
  FrontLitApiError,
  frontLitConfig,
  getFrontLitBlog,
  getFrontLitPage,
  getFrontLitSettings,
  getPublicFrontLitBlog,
  getPublicFrontLitPage,
  getPublicFrontLitSettings,
  listFrontLitBlogs,
  listFrontLitPages,
  listFrontLitThemes,
  listPublicFrontLitBlogs,
  publishFrontLitBlog,
  publishFrontLitPage,
  updateFrontLitBlog,
  updateFrontLitPage,
  updateFrontLitSettings,
  updateFrontLitTheme,
} from "./frontlit-client.js";
import { getSalesPage, isCourseLitSalesPageSlug } from "./frontlit-sales-pages.js";
import { processNextIntegrationJob } from "./integration-provisioning.js";
import {
  acceptInvitation,
  acceptTeamInvitation,
  createInvitation,
  previewInvitation,
  previewTeamInvitation,
  rejectInvitation,
  rejectTeamInvitation,
  resendInvitation,
  revokeInvitation,
} from "./invitations.js";
import { readLearnerProfile } from "./learner-profile.js";
import {
  assertLearnerSchool,
  authenticateLearner,
  clearLearnerSessionCookieHeader,
  completeLesson,
  consumeSchoolAuthTicket,
  createLearnerIdentityLink,
  ensureLearnerProductMembershipForPublicSignup,
  getLearnerLessonMedia,
  grantLearnerMembership,
  learnerMe,
  learnerSessionCookieHeader,
  listLearnerProducts,
  listLearnerProgress,
  listLearners,
  signInLearner,
  signInLearnerWithIdentity,
  signOutLearner,
  signUpLearner,
  updateLearnerProfile,
  updateLearnerStatus,
} from "./learners.js";
import { createCourseLitMcp } from "./mcp.js";
import {
  authorizeLearnerAvatarUpload,
  authorizeLearnerCommunityMediaUpload,
  authorizeMediaUpload,
  deleteMedia,
  finalizeLearnerAvatarUpload,
  finalizeLearnerCommunityMediaUpload,
  finalizeMediaUpload,
  getMedia,
  listLearnerCommunityMedia,
  listMedia,
  listMediaReferences,
  reconcileMediaReferences,
  updateMedia,
} from "./media.js";
import {
  listAdminNotifications,
  listLearnerNotificationPreferences,
  listLearnerNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  markAllLearnerNotificationsRead,
  markLearnerNotificationRead,
  updateLearnerNotificationPreference,
} from "./notifications.js";
import { createOpenApiDocument } from "./openapi.js";
import { COURSELIT_PERMISSIONS, type CourseLitPermission } from "./permissions.js";
import { createPreviewGrant, readPreviewProduct } from "./preview.js";
import { getProductAnalytics } from "./product-analytics.js";
import {
  createDiscussionComment,
  createDiscussionReply,
  createDiscussionReport,
  deleteDiscussionComment,
  deleteDiscussionReply,
  listDiscussionComments,
  listDiscussionReplies,
  listDiscussionReports,
  listDiscussionSummaries,
  toggleDiscussionLike,
  toggleDiscussionSubscription,
  updateDiscussionComment,
  updateDiscussionReply,
  updateDiscussionReport,
} from "./product-discussions.js";
import {
  createProduct,
  deleteProduct,
  listProducts,
  listPublicProducts,
  removeMember,
  updateProduct,
} from "./products.js";
import { evaluateQuizLesson } from "./quiz.js";
import { readPublicBillingCatalog, startSchoolCheckout } from "./school-billing.js";
import { headerSchoolId, resolveSchoolContext } from "./school-context.js";
import { hostnameFromHeaders, schoolLookupKeyFromHost } from "./school-host.js";
import {
  createSchoolCustomHost,
  deleteSchoolCustomHost,
  listSchoolHosts,
  verifyCustomDomainTxt,
  verifySchoolCustomHost,
} from "./school-hosts.js";
import {
  createSchool,
  getSchoolCodeInjection,
  getSchoolPaymentSettings,
  listSchoolsForUser,
  loadSchoolByPublicId,
  updateSchoolCodeInjection,
  updateSchoolCurrency,
  updateSchoolPaymentSettings,
} from "./schools.js";
import {
  getScormRuntimeState,
  processScormPackage,
  updateScormRuntimeState,
} from "./scorm.js";
import {
  addSequenceEmail,
  addTagToContact,
  createSegment,
  createSequence,
  createSubscriber,
  createTemplate,
  deleteSegment,
  deleteSequence,
  deleteSequenceEmail,
  deleteSubscriber,
  deleteTemplate,
  duplicateTemplate,
  getMailingSettings,
  getOverview,
  getSegment,
  getSequence,
  getSequenceStats,
  getSubscriber,
  getTemplate,
  listSegments,
  listSequences,
  listSubscribers,
  listSystemTemplates,
  listTemplates,
  pauseSequence,
  removeTagFromContact,
  startSequence,
  updateMailingSettings,
  updateSegment,
  updateSequence,
  updateSequenceEmail,
  updateSubscriber,
  updateTemplate,
} from "./sendlit-service.js";
import {
  createLearnerSpacePost,
  createLearnerSpaceReport,
  createSpace,
  deleteSpace,
  followSpace,
  getAdminSpace,
  getLearnerSpacePost,
  listAdminSpaces,
  listLearnerSpaceFeed,
  listLearnerSpaces,
  listSpaceReports,
  orderSpaces,
  unfollowSpace,
  updateSpace,
} from "./spaces.js";
import {
  archivePlan,
  createPlan,
  listPlans,
  listPublicPlans,
  setDefaultPlan,
  updatePlan,
} from "./storefront.js";
import { sendTeamInvitationEmail } from "./system-mail.js";
import {
  leaveSchoolTeam,
  listSchoolTeam,
  removeSchoolTeamMember,
  transferSchoolOwnership,
  updateSchoolTeamMember,
} from "./team.js";

import type { DispatchResponse, IncomingRequest } from "./types.js";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "./utils/integration-secrets.js";

export type { DispatchDeps };

const mcpKits = new WeakMap<DispatchDeps, ReturnType<typeof createCourseLitMcp>>();

export function mcpFor(deps: DispatchDeps) {
  const existing = mcpKits.get(deps);
  if (existing) return existing;
  const created = createCourseLitMcp(deps);
  mcpKits.set(deps, created);
  return created;
}

function requestHeaders(request: IncomingRequest) {
  return request.headers;
}

function resolveLearnerSchoolKey(
  request: IncomingRequest,
  explicitSchoolId?: string,
): string | null {
  const host = hostnameFromHeaders(request.headers);
  const fromHost = host ? schoolLookupKeyFromHost(host) : null;
  // A verified school host is authoritative. The header/query fallback is
  // retained only for the generic local/API origin used by the development
  // app and tests; it must never let a request switch tenants on a school
  // host.
  if (fromHost) return fromHost;
  if (explicitSchoolId && explicitSchoolId.trim().length > 0) {
    return explicitSchoolId.trim();
  }
  return headerSchoolId(request.headers);
}

function decryptStoredProviderSecret(value: string | undefined, secret: string) {
  if (!value) return "";
  if (!value.startsWith("v1.")) return value;
  try {
    return decryptIntegrationSecret(value, secret);
  } catch {
    return "";
  }
}

function requestIdFrom(request: IncomingRequest, deps: DispatchDeps) {
  return readOrCreateRequestId(
    typeof request.headers["x-request-id"] === "string"
      ? request.headers["x-request-id"]
      : undefined,
    deps.clock,
  );
}

function emitSchoolTelemetry(
  deps: DispatchDeps,
  request: IncomingRequest,
  input: { requestId: string; schoolId: string; principalId?: string },
) {
  deps.observability?.captureEvent({
    event: "request.context",
    source: "http.dispatch",
    subjectId: input.principalId,
    properties: {
      path: request.path.split("?")[0] ?? request.path,
      method: request.method,
      school_id: input.schoolId,
      request_id: input.requestId,
    },
  });
}

function errorResponse(
  error: ReturnType<typeof createPlatformError>,
): DispatchResponse {
  const mapped = toPublicHttpError(error);
  return { status: mapped.status, body: mapped.body };
}

export async function dispatch(
  deps: DispatchDeps,
  request: IncomingRequest,
): Promise<DispatchResponse> {
  try {
    const [pathPart, queryString] = request.path.split("?", 2);
    const path = pathPart ?? request.path;
    const query = new URLSearchParams(queryString ?? "");
    if (request.method === "GET" && path === "/health") {
      return {
        status: 200,
        body: healthReport(deps.serviceName, deps.clock),
      };
    }
    if (request.method === "GET" && path === "/ready") {
      const report = readinessReport([{ name: "database", ready: deps.databaseReady }]);
      return {
        status: report.status === "ready" ? 200 : 503,
        body: report,
      };
    }
    if (request.method === "GET" && path === "/openapi.json") {
      return {
        status: 200,
        body: createOpenApiDocument(deps.auth.publicApiUrl),
      };
    }

    const paymentWebhookMatch =
      /^\/v1\/storefront\/webhooks\/(stripe|lemonsqueezy|razorpay)$/.exec(path);
    if (request.method === "POST" && paymentWebhookMatch) {
      if (!request.rawBody) {
        return errorResponse(
          createPlatformError("validation_failed", {
            safeDetails: { reason: "raw_webhook_body_required" },
          }),
        );
      }
      const webhook = await receivePaymentWebhook(
        deps.db,
        paymentWebhookMatch[1] as "stripe" | "lemonsqueezy" | "razorpay",
        request.rawBody,
        Object.fromEntries(
          Object.entries(request.headers).map(([name, value]) => [
            name.toLowerCase(),
            Array.isArray(value) ? value[0] : value,
          ]),
        ),
        deps.clock,
        requestIdFrom(request, deps),
        deps.paymentProvider,
      );
      return webhook.ok
        ? {
            status: 200,
            body: {
              received: true,
              duplicate: webhook.duplicate,
              status: webhook.status,
            },
          }
        : errorResponse(webhook.error);
    }

    const certificateVerificationMatch = /^\/v1\/certificates\/([^/]+)$/.exec(path);
    if (request.method === "GET" && certificateVerificationMatch) {
      const certificate = await verifyCertificate(
        deps.db,
        decodeURIComponent(certificateVerificationMatch[1]!),
      );
      return certificate
        ? { status: 200, body: certificate }
        : errorResponse(createPlatformError("not_found"));
    }

    if (path === "/mcp") {
      const mcp = mcpFor(deps);
      const result = await mcp.handle({
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      return {
        status: result.status,
        body: result.body,
        headers: result.headers,
      };
    }

    const previewLessonMediaMatch =
      /^\/v1\/preview\/products\/([^/]+)\/lessons\/([^/]+)\/media$/.exec(path);
    if (request.method === "GET" && previewLessonMediaMatch) {
      const rawToken =
        request.headers["x-preview-token"] ?? request.headers["X-Preview-Token"];
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      if (!token) return errorResponse(createPlatformError("unauthenticated"));
      const previewProduct = await readPreviewProduct(
        deps.db,
        {
          token,
          productPublicId: decodeURIComponent(previewLessonMediaMatch[1]!),
        },
        deps.clock,
      );
      if (!previewProduct.ok) return errorResponse(previewProduct.error);
      const school = await loadSchoolByPublicId(deps.db, previewProduct.value.schoolId);
      if (!school) return errorResponse(createPlatformError("not_found"));
      const result = await getLearnerLessonMedia(
        deps.db,
        deps.mediaLit,
        {
          schoolId: school.id,
          productPublicId: previewProduct.value.id,
          lessonPublicId: decodeURIComponent(previewLessonMediaMatch[2]!),
          viewer: { kind: "preview" },
        },
        deps.clock.now(),
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const previewDiscussionSummariesMatch =
      /^\/v1\/preview\/products\/([^/]+)\/discussions$/.exec(path);
    if (request.method === "GET" && previewDiscussionSummariesMatch) {
      const rawToken =
        request.headers["x-preview-token"] ?? request.headers["X-Preview-Token"];
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      if (!token) return errorResponse(createPlatformError("unauthenticated"));
      const productPublicId = decodeURIComponent(previewDiscussionSummariesMatch[1]!);
      const previewProduct = await readPreviewProduct(
        deps.db,
        { token, productPublicId },
        deps.clock,
      );
      if (!previewProduct.ok) return errorResponse(previewProduct.error);
      const school = await loadSchoolByPublicId(deps.db, previewProduct.value.schoolId);
      if (!school) return errorResponse(createPlatformError("not_found"));
      const parsed = discussionListQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listDiscussionSummaries(
        deps.db,
        {
          kind: "admin",
          context: {
            tenantId: school.id,
            principalId: `preview:${token.slice(0, 16)}`,
            credential: {
              kind: "session",
              credentialId: `preview:${token.slice(0, 16)}`,
            },
            permissions: new Set<CourseLitPermission>(["products:read"]),
            requestId: requestIdFrom(request, deps),
          },
        },
        productPublicId,
        parsed.data,
        deps.clock.now(),
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const previewDiscussionMatch =
      /^\/v1\/preview\/products\/([^/]+)\/lessons\/([^/]+)\/discussions$/.exec(path);
    if (request.method === "GET" && previewDiscussionMatch) {
      const rawToken =
        request.headers["x-preview-token"] ?? request.headers["X-Preview-Token"];
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      if (!token) return errorResponse(createPlatformError("unauthenticated"));
      const productPublicId = decodeURIComponent(previewDiscussionMatch[1]!);
      const previewProduct = await readPreviewProduct(
        deps.db,
        { token, productPublicId },
        deps.clock,
      );
      if (!previewProduct.ok) return errorResponse(previewProduct.error);
      const school = await loadSchoolByPublicId(deps.db, previewProduct.value.schoolId);
      if (!school) return errorResponse(createPlatformError("not_found"));
      const parsed = discussionListQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listDiscussionComments(
        deps.db,
        {
          kind: "admin",
          context: {
            tenantId: school.id,
            principalId: `preview:${token.slice(0, 16)}`,
            credential: {
              kind: "session",
              credentialId: `preview:${token.slice(0, 16)}`,
            },
            permissions: new Set<CourseLitPermission>(["products:read"]),
            requestId: requestIdFrom(request, deps),
          },
        },
        productPublicId,
        decodeURIComponent(previewDiscussionMatch[2]!),
        parsed.data,
        deps.clock.now(),
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const previewDiscussionRepliesMatch =
      /^\/v1\/preview\/products\/([^/]+)\/lessons\/([^/]+)\/discussions\/comments\/([^/]+)\/replies$/.exec(
        path,
      );
    if (request.method === "GET" && previewDiscussionRepliesMatch) {
      const rawToken =
        request.headers["x-preview-token"] ?? request.headers["X-Preview-Token"];
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      if (!token) return errorResponse(createPlatformError("unauthenticated"));
      const productPublicId = decodeURIComponent(previewDiscussionRepliesMatch[1]!);
      const previewProduct = await readPreviewProduct(
        deps.db,
        { token, productPublicId },
        deps.clock,
      );
      if (!previewProduct.ok) return errorResponse(previewProduct.error);
      const school = await loadSchoolByPublicId(deps.db, previewProduct.value.schoolId);
      if (!school) return errorResponse(createPlatformError("not_found"));
      const parsed = discussionListQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listDiscussionReplies(
        deps.db,
        {
          kind: "admin",
          context: {
            tenantId: school.id,
            principalId: `preview:${token.slice(0, 16)}`,
            credential: {
              kind: "session",
              credentialId: `preview:${token.slice(0, 16)}`,
            },
            permissions: new Set<CourseLitPermission>(["products:read"]),
            requestId: requestIdFrom(request, deps),
          },
        },
        productPublicId,
        decodeURIComponent(previewDiscussionRepliesMatch[2]!),
        decodeURIComponent(previewDiscussionRepliesMatch[3]!),
        parsed.data,
        deps.clock.now(),
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const previewReadMatch = /^\/v1\/preview\/products\/([^/]+)$/.exec(path);
    if (request.method === "GET" && previewReadMatch) {
      const rawToken =
        request.headers["x-preview-token"] ?? request.headers["X-Preview-Token"];
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      if (!token) return errorResponse(createPlatformError("unauthenticated"));
      const result = await readPreviewProduct(
        deps.db,
        {
          token,
          productPublicId: decodeURIComponent(previewReadMatch[1]!),
        },
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    let learnerAuth = await authenticateLearner(deps.db, request.headers, deps.clock);
    let bridgedLearnerToken: string | null = null;
    if (learnerAuth.kind !== "authenticated" && path.startsWith("/v1/learner/")) {
      const cookieHeader = request.headers.cookie ?? request.headers.Cookie;
      const hasBetterAuthCookie =
        typeof cookieHeader === "string" &&
        cookieHeader.split(";").some((part) => {
          const name = part.trim().split("=", 1)[0];
          return (
            name === "better-auth.session_token" ||
            name?.startsWith("better-auth.session_token.") ||
            name?.startsWith("__Secure-better-auth.session_token")
          );
        });
      if (hasBetterAuthCookie) {
        const globalIdentity = await authenticateHttpRequest(
          requestHeaders(request),
          deps,
        );
        if (globalIdentity.kind === "authenticated") {
          const schoolPublicId = resolveLearnerSchoolKey(request);
          if (schoolPublicId) {
            const users = await deps.db
              .select({
                id: schema.user.id,
                email: schema.user.email,
                name: schema.user.name,
                image: schema.user.image,
              })
              .from(schema.user)
              .where(eq(schema.user.id, globalIdentity.principalId))
              .limit(1);
            const user = users[0];
            if (user) {
              const bridged = await signInLearnerWithIdentity(
                deps.db,
                {
                  userId: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.image,
                  schoolPublicId,
                },
                deps.clock,
                requestIdFrom(request, deps),
              );
              if (bridged.ok) {
                learnerAuth = { kind: "authenticated", value: bridged.session };
                bridgedLearnerToken = bridged.token;
              } else {
                learnerAuth = { kind: "rejected", error: bridged.error };
              }
            } else {
              learnerAuth = {
                kind: "rejected",
                error: createPlatformError("unauthenticated"),
              };
            }
          }
        }
      }
    }
    const resolvePublicSchool = async (): Promise<
      | { ok: true; value: { schoolId: string; publicId: string } }
      | { ok: false; error: ReturnType<typeof createPlatformError> }
    > => {
      // Public website and checkout routes are tenant-selected by the
      // verified host. An authenticated learner session may be stale or
      // belong to another school; it must not override the public host and
      // make an otherwise anonymous sales page unusable.
      const schoolKey = resolveLearnerSchoolKey(request);
      if (!schoolKey) {
        if (learnerAuth.kind === "authenticated") {
          return {
            ok: true,
            value: {
              schoolId: learnerAuth.value.school.id,
              publicId: learnerAuth.value.school.publicId,
            },
          };
        }
        return { ok: false, error: createPlatformError("tenant_required") };
      }
      const loaded = await loadSchoolByPublicId(deps.db, schoolKey);
      if (!loaded) {
        return { ok: false, error: createPlatformError("tenant_forbidden") };
      }
      return {
        ok: true,
        value: { schoolId: loaded.id, publicId: loaded.publicId },
      };
    };

    const resolvePublicFrontLit = async () => {
      const school = await resolvePublicSchool();
      if (!school.ok) return school;
      const [integration] = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, school.value.schoolId),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      if (!integration?.remoteTeamId) {
        return { ok: false as const, error: createPlatformError("not_found") };
      }
      return {
        ok: true as const,
        value: {
          school: school.value,
          remoteTeamId: integration.remoteTeamId,
          config: {
            server: integration.server || frontLitConfig().server,
            provisioningSecret: null,
          },
        },
      };
    };

    if (request.method === "GET" && path === "/v1/public/school/login-methods") {
      const schoolKey = resolveLearnerSchoolKey(request);
      if (!schoolKey) return errorResponse(createPlatformError("tenant_required"));
      const school = await loadSchoolByPublicId(deps.db, schoolKey);
      if (!school) return errorResponse(createPlatformError("not_found"));
      const hasGoogle = Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      );
      const loginMethods = hasGoogle ? ["email", "google"] : ["email"];
      return {
        status: 200,
        body: {
          schoolId: school.publicId,
          loginMethods,
          hasGoogle,
        },
      };
    }

    if (request.method === "POST" && path === "/v1/auth/tickets/consume") {
      const body = (request.body ?? {}) as { ticket?: string };
      if (!body.ticket || typeof body.ticket !== "string") {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const consumed = await consumeSchoolAuthTicket(deps.db, {
        ticket: body.ticket,
        clock: deps.clock,
      });
      if (!consumed.ok) {
        return errorResponse(consumed.error);
      }
      return {
        status: 200,
        headers: {
          "Set-Cookie": learnerSessionCookieHeader(consumed.value.sessionToken),
        },
        body: consumed.value.dto,
      };
    }

    // Website / Branding
    if (request.method === "GET" && path === "/v1/public/site/settings") {
      const resolved = await resolvePublicFrontLit();
      if (!resolved.ok) return errorResponse(resolved.error);
      try {
        const settings = await getPublicFrontLitSettings(resolved.value.remoteTeamId, {
          config: resolved.value.config,
        });
        const injection = await getSchoolCodeInjection(
          deps.db,
          resolved.value.school.schoolId,
        );
        return {
          status: 200,
          body: {
            ...settings,
            codeInjectionHead: injection.ok ? injection.value.codeInjectionHead : "",
            codeInjectionBody: injection.ok ? injection.value.codeInjectionBody : "",
          },
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "public.site.settings",
          context: { school_id: resolved.value.school.publicId },
        });
        return errorResponse(
          createPlatformError(
            error instanceof FrontLitApiError && error.status === 404
              ? "not_found"
              : "internal_error",
          ),
        );
      }
    }

    // Website / Pages
    if (request.method === "GET" && path === "/v1/public/site/pages") {
      const slug = query.get("slug") ?? "";
      if (slug.length > 200) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const resolved = await resolvePublicFrontLit();
      if (!resolved.ok) return errorResponse(resolved.error);
      try {
        return {
          status: 200,
          body: await getPublicFrontLitPage(resolved.value.remoteTeamId, slug, {
            config: resolved.value.config,
          }),
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "public.site.pages",
          context: { school_id: resolved.value.school.publicId, slug },
        });
        return errorResponse(
          createPlatformError(
            error instanceof FrontLitApiError && error.status === 404
              ? "not_found"
              : "internal_error",
          ),
        );
      }
    }

    // Website / Blogs
    if (request.method === "GET" && path === "/v1/public/site/blogs") {
      const resolved = await resolvePublicFrontLit();
      if (!resolved.ok) return errorResponse(resolved.error);
      try {
        return {
          status: 200,
          body: await listPublicFrontLitBlogs(resolved.value.remoteTeamId, {
            config: resolved.value.config,
          }),
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "public.site.blogs",
          context: { school_id: resolved.value.school.publicId },
        });
        return errorResponse(createPlatformError("internal_error"));
      }
    }

    const publicSiteBlogMatch = /^\/v1\/public\/site\/blogs\/([^/]+)$/.exec(path);
    if (request.method === "GET" && publicSiteBlogMatch) {
      const slug = decodeURIComponent(publicSiteBlogMatch[1]!);
      if (slug.length === 0 || slug.length > 200) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const resolved = await resolvePublicFrontLit();
      if (!resolved.ok) return errorResponse(resolved.error);
      try {
        return {
          status: 200,
          body: await getPublicFrontLitBlog(resolved.value.remoteTeamId, slug, {
            config: resolved.value.config,
          }),
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "public.site.blogs.article",
          context: { school_id: resolved.value.school.publicId, slug },
        });
        return errorResponse(
          createPlatformError(
            error instanceof FrontLitApiError && error.status === 404
              ? "not_found"
              : "internal_error",
          ),
        );
      }
    }

    if (request.method === "GET" && path === "/v1/public/products") {
      let school: { schoolId: string; publicId: string; currency: string } | null =
        null;
      if (learnerAuth.kind === "authenticated") {
        const schoolCheck = assertLearnerSchool(
          learnerAuth.value,
          headerSchoolId(request.headers),
        );
        if (!schoolCheck.ok) return errorResponse(schoolCheck.error);
        school = {
          schoolId: learnerAuth.value.school.id,
          publicId: learnerAuth.value.school.publicId,
          currency: learnerAuth.value.school.currency,
        };
      } else {
        const schoolKey = resolveLearnerSchoolKey(request);
        if (!schoolKey) return errorResponse(createPlatformError("tenant_required"));
        const loaded = await loadSchoolByPublicId(deps.db, schoolKey);
        if (!loaded) return errorResponse(createPlatformError("tenant_forbidden"));
        school = {
          schoolId: loaded.id,
          publicId: loaded.publicId,
          currency: loaded.currency,
        };
      }
      const parsed = listProductsQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
        kind: query.get("kind") ?? undefined,
      });
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await listPublicProducts(deps.db, school, parsed.data);
      if (!result.ok) return errorResponse(result.error);
      return {
        status: 200,
        body: { items: result.value, nextCursor: result.nextCursor },
      };
    }
    if (request.method === "GET" && path === "/v1/public/communities") {
      return errorResponse(createPlatformError("not_found"));
    }
    const publicCommunityMatch = /^\/v1\/public\/communities\/([^/]+)$/.exec(path);
    if (request.method === "GET" && publicCommunityMatch) {
      let school: { schoolId: string; publicId: string } | null = null;
      if (learnerAuth.kind === "authenticated") {
        const schoolCheck = assertLearnerSchool(
          learnerAuth.value,
          headerSchoolId(request.headers),
        );
        if (!schoolCheck.ok) return errorResponse(schoolCheck.error);
        school = {
          schoolId: learnerAuth.value.school.id,
          publicId: learnerAuth.value.school.publicId,
        };
      } else {
        const schoolKey = resolveLearnerSchoolKey(request);
        if (!schoolKey) return errorResponse(createPlatformError("tenant_required"));
        const loaded = await loadSchoolByPublicId(deps.db, schoolKey);
        if (!loaded) return errorResponse(createPlatformError("tenant_forbidden"));
        school = { schoolId: loaded.id, publicId: loaded.publicId };
      }
      const communityId = decodeURIComponent(publicCommunityMatch[1]!);
      const result =
        learnerAuth.kind === "authenticated"
          ? await getCommunity(deps.db, school, communityId, {
              kind: "learner",
              schoolId: learnerAuth.value.school.id,
              schoolPublicId: learnerAuth.value.school.publicId,
              learnerId: learnerAuth.value.learner.id,
              learnerPublicId: learnerAuth.value.learner.publicId,
            })
          : await getPublicCommunity(deps.db, school, communityId);
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const publicCommunityPlansMatch =
      /^\/v1\/public\/communities\/([^/]+)\/plans$/.exec(path);
    if (request.method === "GET" && publicCommunityPlansMatch) {
      let school: { schoolId: string; publicId: string } | null = null;
      if (learnerAuth.kind === "authenticated") {
        const schoolCheck = assertLearnerSchool(
          learnerAuth.value,
          headerSchoolId(request.headers),
        );
        if (!schoolCheck.ok) return errorResponse(schoolCheck.error);
        school = {
          schoolId: learnerAuth.value.school.id,
          publicId: learnerAuth.value.school.publicId,
        };
      } else {
        const schoolKey = resolveLearnerSchoolKey(request);
        if (!schoolKey) return errorResponse(createPlatformError("tenant_required"));
        const loaded = await loadSchoolByPublicId(deps.db, schoolKey);
        if (!loaded) return errorResponse(createPlatformError("tenant_forbidden"));
        school = { schoolId: loaded.id, publicId: loaded.publicId };
      }
      const result = await listPublicCommunityPlans(
        deps.db,
        school,
        decodeURIComponent(publicCommunityPlansMatch[1]!),
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    const publicPlansMatch = /^\/v1\/storefront\/products\/([^/]+)\/plans$/.exec(path);
    if (request.method === "GET" && publicPlansMatch) {
      let school: { schoolId: string; publicId: string; currency: string } | null =
        null;
      if (learnerAuth.kind === "authenticated") {
        const schoolCheck = assertLearnerSchool(
          learnerAuth.value,
          headerSchoolId(request.headers),
        );
        if (!schoolCheck.ok) return errorResponse(schoolCheck.error);
        school = {
          schoolId: learnerAuth.value.school.id,
          publicId: learnerAuth.value.school.publicId,
          currency: learnerAuth.value.school.currency,
        };
      } else {
        const schoolKey = resolveLearnerSchoolKey(request);
        if (!schoolKey) return errorResponse(createPlatformError("tenant_required"));
        const loaded = await loadSchoolByPublicId(deps.db, schoolKey);
        if (!loaded) return errorResponse(createPlatformError("tenant_forbidden"));
        school = {
          schoolId: loaded.id,
          publicId: loaded.publicId,
          currency: loaded.currency,
        };
      }
      const result = await listPublicPlans(
        deps.db,
        school,
        decodeURIComponent(publicPlansMatch[1]!),
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    if (request.method === "POST" && path === "/v1/storefront/checkout-sessions") {
      const parsed = createCheckoutSessionBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const school = await resolvePublicSchool();
      if (!school.ok) return errorResponse(school.error);
      const result = await createCheckoutSession(
        deps.db,
        school.value,
        parsed.data.productId
          ? {
              resourceType: "product",
              resourcePublicId: parsed.data.productId,
              planPublicId: parsed.data.planId,
            }
          : {
              resourceType: "community",
              resourcePublicId: parsed.data.communityId!,
              planPublicId: parsed.data.planId,
            },
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const publicCheckoutSessionMatch =
      /^\/v1\/storefront\/checkout-sessions\/([^/]+)$/.exec(path);
    if (request.method === "GET" && publicCheckoutSessionMatch) {
      const school = await resolvePublicSchool();
      if (!school.ok) return errorResponse(school.error);
      const result = await getCheckoutSession(
        deps.db,
        {
          schoolId: school.value.schoolId,
          sessionPublicId: decodeURIComponent(publicCheckoutSessionMatch[1]!),
          learnerId:
            learnerAuth.kind === "authenticated"
              ? learnerAuth.value.learner.id
              : undefined,
        },
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const lessonMediaMatch = /^\/v1\/products\/([^/]+)\/lessons\/([^/]+)\/media$/.exec(
      path,
    );
    if (request.method === "GET" && lessonMediaMatch) {
      const productPublicId = decodeURIComponent(lessonMediaMatch[1]!);
      const lessonPublicId = decodeURIComponent(lessonMediaMatch[2]!);
      if (learnerAuth.kind === "authenticated") {
        const schoolCheck = assertLearnerSchool(
          learnerAuth.value,
          headerSchoolId(request.headers),
        );
        if (!schoolCheck.ok) return errorResponse(schoolCheck.error);
        const result = await getLearnerLessonMedia(
          deps.db,
          deps.mediaLit,
          {
            schoolId: learnerAuth.value.school.id,
            productPublicId,
            lessonPublicId,
            viewer: {
              kind: "learner",
              schoolAccountId: learnerAuth.value.schoolAccount.id,
              learnerId: learnerAuth.value.schoolAccount.id,
            },
          },
          deps.clock.now(),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (learnerAuth.kind === "rejected") {
        return errorResponse(learnerAuth.error);
      }
      const schoolKey = resolveLearnerSchoolKey(request);
      if (!schoolKey) return errorResponse(createPlatformError("tenant_required"));
      const school = await loadSchoolByPublicId(deps.db, schoolKey);
      if (!school) return errorResponse(createPlatformError("tenant_forbidden"));
      const result = await getLearnerLessonMedia(
        deps.db,
        deps.mediaLit,
        {
          schoolId: school.id,
          productPublicId,
          lessonPublicId,
          viewer: { kind: "public" },
        },
        deps.clock.now(),
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const productGet = /^\/v1\/products\/([^/]+)$/.exec(path);
    if (request.method === "POST" && path === "/v1/learner/auth/sign-up") {
      const parsed = learnerAuthBodySchema.safeParse(request.body ?? {});
      if (!parsed.success || typeof parsed.data.name !== "string") {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const schoolPublicId = resolveLearnerSchoolKey(request, parsed.data.schoolId);
      if (!schoolPublicId) {
        return errorResponse(createPlatformError("tenant_required"));
      }
      const requestId = requestIdFrom(request, deps);
      const result = await signUpLearner(
        deps.db,
        {
          email: parsed.data.email,
          password: parsed.data.password,
          name: parsed.data.name,
          schoolPublicId,
        },
        deps.clock,
        requestId,
      );
      if (!result.ok) return errorResponse(result.error);
      emitSchoolTelemetry(deps, request, {
        requestId,
        schoolId: result.value.schoolId,
        principalId: result.value.id,
      });
      return {
        status: 201,
        body: result.value,
        headers: { "Set-Cookie": learnerSessionCookieHeader(result.token) },
      };
    }
    if (request.method === "POST" && path === "/v1/learner/auth/sign-in") {
      const parsed = learnerAuthBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const schoolPublicId = resolveLearnerSchoolKey(request, parsed.data.schoolId);
      if (!schoolPublicId) {
        return errorResponse(createPlatformError("tenant_required"));
      }
      const requestId = requestIdFrom(request, deps);
      const result = await signInLearner(
        deps.db,
        {
          email: parsed.data.email,
          password: parsed.data.password,
          identityLinkToken: parsed.data.identityLinkToken,
          schoolPublicId,
        },
        deps.clock,
        requestId,
      );
      if (!result.ok) return errorResponse(result.error);
      emitSchoolTelemetry(deps, request, {
        requestId,
        schoolId: result.value.schoolId,
        principalId: result.value.id,
      });
      return {
        status: 200,
        body: result.value,
        headers: { "Set-Cookie": learnerSessionCookieHeader(result.token) },
      };
    }
    if (request.method === "POST" && path === "/v1/learner/auth/sign-out") {
      if (learnerAuth.kind === "authenticated") {
        await signOutLearner(deps.db, learnerAuth.value);
      }
      return {
        status: 204,
        body: undefined,
        headers: { "Set-Cookie": clearLearnerSessionCookieHeader() },
      };
    }
    if (path.startsWith("/v1/learner/")) {
      if (learnerAuth.kind !== "authenticated") {
        return errorResponse(
          learnerAuth.kind === "rejected"
            ? learnerAuth.error
            : createPlatformError("unauthenticated"),
        );
      }
      const schoolCheck = assertLearnerSchool(
        learnerAuth.value,
        headerSchoolId(request.headers),
      );
      if (!schoolCheck.ok) return errorResponse(schoolCheck.error);
      const requestId = requestIdFrom(request, deps);
      emitSchoolTelemetry(deps, request, {
        requestId,
        schoolId: learnerAuth.value.school.publicId,
        principalId: learnerAuth.value.learner.publicId,
      });
      const learnerCommunityViewer = {
        kind: "learner" as const,
        schoolId: learnerAuth.value.school.id,
        schoolPublicId: learnerAuth.value.school.publicId,
        learnerId: learnerAuth.value.learner.id,
        learnerPublicId: learnerAuth.value.learner.publicId,
      };
      const learnerCommunitySchool = {
        schoolId: learnerAuth.value.school.id,
        publicId: learnerAuth.value.school.publicId,
      };
      if (
        request.method === "POST" &&
        path === "/v1/learner/profile-media/upload-authorizations"
      ) {
        const parsed = learnerAvatarMediaAuthorizationBodySchema.safeParse(
          request.body ?? {},
        );
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await authorizeLearnerAvatarUpload(
          learnerCommunityViewer,
          deps.mediaLit,
          deps.clock,
          parsed.data,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "POST" && path === "/v1/learner/profile-media") {
        const parsed = learnerAvatarMediaFinalizeBodySchema.safeParse(
          request.body ?? {},
        );
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await finalizeLearnerAvatarUpload(
          deps.db,
          learnerCommunityViewer,
          learnerAuth.value.school.publicId,
          deps.mediaLit,
          deps.clock,
          requestId,
          parsed.data,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      if (
        request.method === "POST" &&
        path === "/v1/learner/community-media/upload-authorizations"
      ) {
        const parsed = learnerCommunityMediaAuthorizationBodySchema.safeParse(
          request.body ?? {},
        );
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await authorizeLearnerCommunityMediaUpload(
          learnerCommunityViewer,
          deps.mediaLit,
          deps.clock,
          parsed.data,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "POST" && path === "/v1/learner/community-media") {
        const parsed = finalizeMediaUploadBodySchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await finalizeLearnerCommunityMediaUpload(
          deps.db,
          learnerCommunityViewer,
          learnerAuth.value.school.publicId,
          deps.mediaLit,
          deps.clock,
          requestId,
          parsed.data,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "GET" && path === "/v1/learner/community-media") {
        const parsed = learnerCommunityMediaListQuerySchema.safeParse({
          search: query.get("search") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ?? undefined,
        });
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await listLearnerCommunityMedia(
          deps.db,
          learnerCommunityViewer,
          learnerAuth.value.school.publicId,
          parsed.data,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "GET" && path === "/v1/learner/me") {
        const profile = await readLearnerProfile(deps.db, deps.sendLit, {
          schoolId: learnerAuth.value.school.id,
          email: learnerAuth.value.schoolAccount.email,
        });
        return {
          status: 200,
          body: learnerMe(learnerAuth.value, profile),
          ...(bridgedLearnerToken
            ? {
                headers: {
                  "Set-Cookie": learnerSessionCookieHeader(bridgedLearnerToken),
                },
              }
            : {}),
        };
      }
      if (request.method === "PATCH" && path === "/v1/learner/me") {
        const parsed = updateLearnerProfileBodySchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await updateLearnerProfile(
          deps.db,
          learnerAuth.value,
          parsed.data,
          deps.clock,
          requestId,
          deps.sendLit,
        );
        return result.ok
          ? {
              status: 200,
              body: result.value,
              ...(bridgedLearnerToken
                ? {
                    headers: {
                      "Set-Cookie": learnerSessionCookieHeader(bridgedLearnerToken),
                    },
                  }
                : {}),
            }
          : errorResponse(result.error);
      }
      if (request.method === "GET" && path === "/v1/learner/notifications") {
        const parsed = notificationListQuerySchema.safeParse({
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ?? undefined,
        });
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await listLearnerNotifications(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            learnerId: learnerAuth.value.learner.id,
          },
          parsed.data,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "GET" && path === "/v1/learner/notification-preferences") {
        const result = await listLearnerNotificationPreferences(deps.db, {
          schoolId: learnerAuth.value.school.id,
          learnerId: learnerAuth.value.learner.id,
        });
        return { status: 200, body: result };
      }
      const learnerNotificationPreferenceMatch =
        /^\/v1\/learner\/notification-preferences\/([^/]+)$/.exec(path);
      if (request.method === "PATCH" && learnerNotificationPreferenceMatch) {
        const type = decodeURIComponent(learnerNotificationPreferenceMatch[1]!);
        const typeCheck = notificationPreferenceTypeSchema.safeParse(type);
        const parsed = updateNotificationPreferenceBodySchema.safeParse(
          request.body ?? {},
        );
        if (!typeCheck.success || !parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await updateLearnerNotificationPreference(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            learnerId: learnerAuth.value.learner.id,
          },
          typeCheck.data,
          parsed.data.appEnabled,
          parsed.data.emailEnabled,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerNotificationReadMatch =
        /^\/v1\/learner\/notifications\/([^/]+)\/read$/.exec(path);
      if (request.method === "PATCH" && learnerNotificationReadMatch) {
        const result = await markLearnerNotificationRead(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            learnerId: learnerAuth.value.learner.id,
          },
          decodeURIComponent(learnerNotificationReadMatch[1]!),
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "POST" && path === "/v1/learner/notifications/read-all") {
        const result = await markAllLearnerNotificationsRead(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            learnerId: learnerAuth.value.learner.id,
          },
          deps.clock,
        );
        return { status: 200, body: result.value };
      }
      if (request.method === "GET" && path === "/v1/learner/communities") {
        const parsed = communityListQuerySchema.safeParse({
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ?? undefined,
        });
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        return errorResponse(createPlatformError("not_found"));
      }
      if (request.method === "GET" && path === "/v1/learner/feed") {
        const parsed = communityListQuerySchema.safeParse({
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ?? undefined,
          spaceId: query.get("spaceId") ?? undefined,
        });
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await listLearnerSpaceFeed(
          deps.db,
          learnerCommunityViewer,
          parsed.data,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "GET" && path === "/v1/learner/spaces") {
        const result = await listLearnerSpaces(deps.db, learnerCommunityViewer);
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerFollowMatch = /^\/v1\/learner\/spaces\/([^/]+)\/follow$/.exec(path);
      if (learnerFollowMatch) {
        const spaceId = decodeURIComponent(learnerFollowMatch[1]!);
        if (request.method === "PUT") {
          const result = await followSpace(
            deps.db,
            learnerCommunityViewer,
            spaceId,
            deps.clock,
          );
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
        if (request.method === "DELETE") {
          const result = await unfollowSpace(deps.db, learnerCommunityViewer, spaceId);
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
      }
      const learnerSpaceReportMatch = /^\/v1\/learner\/spaces\/([^/]+)\/reports$/.exec(
        path,
      );
      if (request.method === "POST" && learnerSpaceReportMatch) {
        const parsed = createCommunityReportBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await createLearnerSpaceReport(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerSpaceReportMatch[1]!),
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      const learnerSpacePostDetailMatch =
        /^\/v1\/learner\/spaces\/([^/]+)\/posts\/([^/]+)$/.exec(path);
      if (request.method === "GET" && learnerSpacePostDetailMatch) {
        const result = await getLearnerSpacePost(
          deps.db,
          learnerCommunityViewer,
          decodeURIComponent(learnerSpacePostDetailMatch[1]!),
          decodeURIComponent(learnerSpacePostDetailMatch[2]!),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerSpacePostMatch = /^\/v1\/learner\/spaces\/([^/]+)\/posts$/.exec(
        path,
      );
      if (request.method === "POST" && learnerSpacePostMatch) {
        const parsed = createSpacePostBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await createLearnerSpacePost(
          deps.db,
          learnerCommunityViewer,
          decodeURIComponent(learnerSpacePostMatch[1]!),
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "GET" && path === "/v1/learner/communities/available") {
        return errorResponse(createPlatformError("not_found"));
      }
      if (request.method === "GET" && path === "/v1/learner/products") {
        return {
          status: 200,
          body: {
            items: await listLearnerProducts(deps.db, {
              schoolId: learnerAuth.value.school.id,
              publicSchoolId: learnerAuth.value.school.publicId,
              learnerId: learnerAuth.value.learner.id,
            }),
          },
        };
      }
      const learnerScormRuntimeMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/scorm\/runtime$/.exec(
          path,
        );
      if (learnerScormRuntimeMatch) {
        const input = {
          schoolId: learnerAuth.value.school.id,
          learnerId: learnerAuth.value.learner.id,
          productPublicId: decodeURIComponent(learnerScormRuntimeMatch[1]!),
          lessonPublicId: decodeURIComponent(learnerScormRuntimeMatch[2]!),
        };
        if (request.method === "GET") {
          const result = await getScormRuntimeState(deps.db, input, deps.clock.now());
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
        if (request.method === "POST") {
          const parsed = scormRuntimeUpdateBodySchema.safeParse(request.body ?? {});
          if (!parsed.success) {
            return errorResponse(createPlatformError("validation_failed"));
          }
          const updates =
            "updates" in parsed.data
              ? parsed.data.updates
              : { [parsed.data.element]: parsed.data.value };
          const result = await updateScormRuntimeState(
            deps.db,
            input,
            updates,
            deps.clock,
          );
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
      }
      const learnerQuizEvaluationMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/evaluation$/.exec(path);
      if (request.method === "POST" && learnerQuizEvaluationMatch) {
        const parsed = evaluateQuizBodySchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await evaluateQuizLesson(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            learnerId: learnerAuth.value.learner.id,
            productPublicId: decodeURIComponent(learnerQuizEvaluationMatch[1]!),
            lessonPublicId: decodeURIComponent(learnerQuizEvaluationMatch[2]!),
          },
          parsed.data.answers,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerDiscussionSummariesMatch =
        /^\/v1\/learner\/products\/([^/]+)\/discussions$/.exec(path);
      if (request.method === "GET" && learnerDiscussionSummariesMatch) {
        const parsed = discussionListQuerySchema.safeParse({
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ?? undefined,
        });
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await listDiscussionSummaries(
          deps.db,
          learnerCommunityViewer,
          decodeURIComponent(learnerDiscussionSummariesMatch[1]!),
          parsed.data,
          deps.clock.now(),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerDiscussionTargetMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/discussions$/.exec(path);
      if (learnerDiscussionTargetMatch) {
        const productPublicId = decodeURIComponent(learnerDiscussionTargetMatch[1]!);
        const lessonPublicId = decodeURIComponent(learnerDiscussionTargetMatch[2]!);
        if (request.method === "GET") {
          const parsed = discussionListQuerySchema.safeParse({
            cursor: query.get("cursor") ?? undefined,
            limit: query.get("limit") ?? undefined,
          });
          if (!parsed.success)
            return errorResponse(createPlatformError("validation_failed"));
          const result = await listDiscussionComments(
            deps.db,
            learnerCommunityViewer,
            productPublicId,
            lessonPublicId,
            parsed.data,
            deps.clock.now(),
          );
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
        if (request.method === "POST") {
          const parsed = createDiscussionCommentBodySchema.safeParse(
            request.body ?? {},
          );
          if (!parsed.success)
            return errorResponse(createPlatformError("validation_failed"));
          const result = await createDiscussionComment(
            deps.db,
            learnerCommunityViewer,
            productPublicId,
            lessonPublicId,
            parsed.data.content,
            deps.clock,
          );
          return result.ok
            ? { status: 201, body: result.value }
            : errorResponse(result.error);
        }
      }
      const learnerDiscussionRepliesMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/discussions\/comments\/([^/]+)\/replies$/.exec(
          path,
        );
      if (learnerDiscussionRepliesMatch) {
        const productPublicId = decodeURIComponent(learnerDiscussionRepliesMatch[1]!);
        const lessonPublicId = decodeURIComponent(learnerDiscussionRepliesMatch[2]!);
        const commentPublicId = decodeURIComponent(learnerDiscussionRepliesMatch[3]!);
        if (request.method === "GET") {
          const parsed = discussionListQuerySchema.safeParse({
            cursor: query.get("cursor") ?? undefined,
            limit: query.get("limit") ?? undefined,
          });
          if (!parsed.success)
            return errorResponse(createPlatformError("validation_failed"));
          const result = await listDiscussionReplies(
            deps.db,
            learnerCommunityViewer,
            productPublicId,
            lessonPublicId,
            commentPublicId,
            parsed.data,
            deps.clock.now(),
          );
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
        if (request.method === "POST") {
          const parsed = createDiscussionReplyBodySchema.safeParse(request.body ?? {});
          if (!parsed.success)
            return errorResponse(createPlatformError("validation_failed"));
          const result = await createDiscussionReply(
            deps.db,
            learnerCommunityViewer,
            productPublicId,
            lessonPublicId,
            commentPublicId,
            parsed.data.content,
            parsed.data.parentReplyId,
            deps.clock,
          );
          return result.ok
            ? { status: 201, body: result.value }
            : errorResponse(result.error);
        }
      }
      const learnerDiscussionCommentMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/discussions\/comments\/([^/]+)$/.exec(
          path,
        );
      if (learnerDiscussionCommentMatch) {
        const productPublicId = decodeURIComponent(learnerDiscussionCommentMatch[1]!);
        const lessonPublicId = decodeURIComponent(learnerDiscussionCommentMatch[2]!);
        const commentPublicId = decodeURIComponent(learnerDiscussionCommentMatch[3]!);
        if (request.method === "PATCH") {
          const parsed = createDiscussionCommentBodySchema.safeParse(
            request.body ?? {},
          );
          if (!parsed.success)
            return errorResponse(createPlatformError("validation_failed"));
          const result = await updateDiscussionComment(
            deps.db,
            learnerCommunityViewer,
            productPublicId,
            lessonPublicId,
            commentPublicId,
            parsed.data.content,
            deps.clock,
          );
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
        if (request.method === "DELETE") {
          const result = await deleteDiscussionComment(
            deps.db,
            learnerCommunityViewer,
            productPublicId,
            lessonPublicId,
            commentPublicId,
            deps.clock,
          );
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
      }
      const learnerDiscussionReplyMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/discussions\/replies\/([^/]+)$/.exec(
          path,
        );
      if (learnerDiscussionReplyMatch) {
        const productPublicId = decodeURIComponent(learnerDiscussionReplyMatch[1]!);
        const lessonPublicId = decodeURIComponent(learnerDiscussionReplyMatch[2]!);
        const replyPublicId = decodeURIComponent(learnerDiscussionReplyMatch[3]!);
        if (request.method === "PATCH") {
          const parsed = createDiscussionCommentBodySchema.safeParse(
            request.body ?? {},
          );
          if (!parsed.success)
            return errorResponse(createPlatformError("validation_failed"));
          const result = await updateDiscussionReply(
            deps.db,
            learnerCommunityViewer,
            productPublicId,
            lessonPublicId,
            replyPublicId,
            parsed.data.content,
            deps.clock,
          );
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
        if (request.method === "DELETE") {
          const result = await deleteDiscussionReply(
            deps.db,
            learnerCommunityViewer,
            productPublicId,
            lessonPublicId,
            replyPublicId,
            deps.clock,
          );
          return result.ok
            ? { status: 200, body: result.value }
            : errorResponse(result.error);
        }
      }
      const learnerDiscussionLikeMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/discussions\/likes$/.exec(
          path,
        );
      if (request.method === "POST" && learnerDiscussionLikeMatch) {
        const parsed = discussionLikeBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await toggleDiscussionLike(
          deps.db,
          learnerCommunityViewer,
          decodeURIComponent(learnerDiscussionLikeMatch[1]!),
          decodeURIComponent(learnerDiscussionLikeMatch[2]!),
          parsed.data.contentType,
          parsed.data.contentId,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerDiscussionSubscriptionMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/discussions\/subscription$/.exec(
          path,
        );
      if (request.method === "POST" && learnerDiscussionSubscriptionMatch) {
        const parsed = discussionSubscriptionBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await toggleDiscussionSubscription(
          deps.db,
          learnerCommunityViewer,
          decodeURIComponent(learnerDiscussionSubscriptionMatch[1]!),
          decodeURIComponent(learnerDiscussionSubscriptionMatch[2]!),
          parsed.data.subscription,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerDiscussionReportMatch =
        /^\/v1\/learner\/products\/([^/]+)\/lessons\/([^/]+)\/discussions\/reports$/.exec(
          path,
        );
      if (request.method === "POST" && learnerDiscussionReportMatch) {
        const parsed = createDiscussionReportBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await createDiscussionReport(
          deps.db,
          learnerCommunityViewer,
          decodeURIComponent(learnerDiscussionReportMatch[1]!),
          decodeURIComponent(learnerDiscussionReportMatch[2]!),
          parsed.data.contentType,
          parsed.data.contentId,
          parsed.data.reason,
          deps.clock,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      const joinCommunityMatch = /^\/v1\/learner\/communities\/([^/]+)\/join$/.exec(
        path,
      );
      if (request.method === "POST" && joinCommunityMatch) {
        const parsed = joinCommunityBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await joinCommunity(
          deps.db,
          learnerCommunityViewer,
          decodeURIComponent(joinCommunityMatch[1]!),
          parsed.data.joiningReason,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const leaveCommunityMatch = /^\/v1\/learner\/communities\/([^/]+)\/leave$/.exec(
        path,
      );
      if (request.method === "POST" && leaveCommunityMatch) {
        const parsed = leaveCommunityBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await leaveCommunity(
          deps.db,
          learnerCommunityViewer,
          decodeURIComponent(leaveCommunityMatch[1]!),
          deps.clock,
          requestId,
          deps.paymentProvider,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityPlansMatch =
        /^\/v1\/learner\/communities\/([^/]+)\/plans$/.exec(path);
      if (request.method === "GET" && learnerCommunityPlansMatch) {
        const result = await listLearnerCommunityPlans(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            publicSchoolId: learnerAuth.value.school.publicId,
            learnerId: learnerAuth.value.learner.id,
            learnerPublicId: learnerAuth.value.learner.publicId,
            learnerEmail: learnerAuth.value.learner.email,
            learnerName: learnerAuth.value.learner.name,
            requestId,
          },
          decodeURIComponent(learnerCommunityPlansMatch[1]!),
        );
        return result.ok
          ? { status: 200, body: { items: result.value } }
          : errorResponse(result.error);
      }
      const learnerCommunityCheckoutMatch =
        /^\/v1\/learner\/communities\/([^/]+)\/checkout$/.exec(path);
      if (request.method === "POST" && learnerCommunityCheckoutMatch) {
        const parsed = createLearnerCommunityCheckoutBodySchema.safeParse(
          request.body ?? {},
        );
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const rawIdempotency =
          request.headers["idempotency-key"] ?? request.headers["Idempotency-Key"];
        const idempotencyKey = Array.isArray(rawIdempotency)
          ? rawIdempotency[0]
          : rawIdempotency;
        if (!idempotencyKey) {
          return errorResponse(
            createPlatformError("validation_failed", {
              safeDetails: { reason: "idempotency_key_required" },
            }),
          );
        }
        const result = await startLearnerCommunityCheckout(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            publicSchoolId: learnerAuth.value.school.publicId,
            learnerId: learnerAuth.value.learner.id,
            learnerPublicId: learnerAuth.value.learner.publicId,
            learnerEmail: learnerAuth.value.learner.email,
            learnerName: learnerAuth.value.learner.name,
            requestId,
          },
          decodeURIComponent(learnerCommunityCheckoutMatch[1]!),
          {
            planPublicId: parsed.data.planId,
            joiningReason: parsed.data.joiningReason,
            idempotencyKey,
            returnUrl:
              parsed.data.returnUrl ??
              `${deps.auth.webOrigin.replace(/\/$/, "")}/community/checkout/complete`,
          },
          deps.clock,
          deps.paymentProvider,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityCheckoutReadMatch =
        /^\/v1\/learner\/community-checkouts\/([^/]+)$/.exec(path);
      if (request.method === "GET" && learnerCommunityCheckoutReadMatch) {
        const result = await getLearnerCommunityCheckout(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            publicSchoolId: learnerAuth.value.school.publicId,
            learnerId: learnerAuth.value.learner.id,
            learnerPublicId: learnerAuth.value.learner.publicId,
            learnerEmail: learnerAuth.value.learner.email,
            learnerName: learnerAuth.value.learner.name,
            requestId,
          },
          decodeURIComponent(learnerCommunityCheckoutReadMatch[1]!),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityMatch = /^\/v1\/learner\/communities\/([^/]+)$/.exec(path);
      if (request.method === "GET" && learnerCommunityMatch) {
        const result = await getCommunity(
          deps.db,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityMatch[1]!),
          learnerCommunityViewer,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityPostsMatch =
        /^\/v1\/learner\/communities\/([^/]+)\/posts$/.exec(path);
      if (learnerCommunityPostsMatch && request.method === "GET") {
        const parsed = communityListQuerySchema.safeParse({
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ?? undefined,
          category: query.get("category") ?? undefined,
        });
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await listPosts(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityPostsMatch[1]!),
          parsed.data,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (learnerCommunityPostsMatch && request.method === "POST") {
        const parsed = createCommunityPostBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await createPost(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityPostsMatch[1]!),
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityPostMatch =
        /^\/v1\/learner\/community-posts\/([^/]+)$/.exec(path);
      if (learnerCommunityPostMatch && request.method === "GET") {
        const result = await getPost(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityPostMatch[1]!),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (learnerCommunityPostMatch && request.method === "PATCH") {
        const parsed = updateCommunityPostBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await updatePost(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityPostMatch[1]!),
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (learnerCommunityPostMatch && request.method === "DELETE") {
        const result = await deletePost(
          deps.db,
          learnerCommunityViewer,
          learnerAuth.value.school.id,
          decodeURIComponent(learnerCommunityPostMatch[1]!),
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityCommentsMatch =
        /^\/v1\/learner\/community-posts\/([^/]+)\/comments$/.exec(path);
      if (learnerCommunityCommentsMatch && request.method === "GET") {
        const parsed = communityListQuerySchema.safeParse({
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ?? undefined,
        });
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await listComments(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityCommentsMatch[1]!),
          parsed.data,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (learnerCommunityCommentsMatch && request.method === "POST") {
        const parsed = createCommunityCommentBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await createComment(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityCommentsMatch[1]!),
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityCommentMatch =
        /^\/v1\/learner\/community-comments\/([^/]+)$/.exec(path);
      if (learnerCommunityCommentMatch && request.method === "PATCH") {
        const parsed = updateCommunityCommentBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await updateComment(
          deps.db,
          learnerCommunityViewer,
          learnerAuth.value.school.id,
          decodeURIComponent(learnerCommunityCommentMatch[1]!),
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (learnerCommunityCommentMatch && request.method === "DELETE") {
        const result = await deleteComment(
          deps.db,
          learnerCommunityViewer,
          learnerAuth.value.school.id,
          decodeURIComponent(learnerCommunityCommentMatch[1]!),
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityReactionMatch =
        /^\/v1\/learner\/communities\/([^/]+)\/reactions$/.exec(path);
      if (request.method === "POST" && learnerCommunityReactionMatch) {
        const parsed = communityReactionBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await toggleReaction(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityReactionMatch[1]!),
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunitySubscriptionMatch =
        /^\/v1\/learner\/community-posts\/([^/]+)\/subscription$/.exec(path);
      if (request.method === "POST" && learnerCommunitySubscriptionMatch) {
        const parsed = communitySubscriptionBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await togglePostSubscription(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunitySubscriptionMatch[1]!),
          parsed.data.subscribed,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const learnerCommunityReportsMatch =
        /^\/v1\/learner\/communities\/([^/]+)\/reports$/.exec(path);
      if (request.method === "POST" && learnerCommunityReportsMatch) {
        const parsed = createCommunityReportBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await createReport(
          deps.db,
          learnerCommunityViewer,
          learnerCommunitySchool,
          decodeURIComponent(learnerCommunityReportsMatch[1]!),
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "GET" && path === "/v1/learner/certificates") {
        return {
          status: 200,
          body: {
            items: await listLearnerCertificates(deps.db, {
              schoolId: learnerAuth.value.school.id,
              learnerId: learnerAuth.value.learner.id,
              publicSchoolId: learnerAuth.value.school.publicId,
            }),
          },
        };
      }
      if (request.method === "POST" && path === "/v1/learner/memberships") {
        const productId =
          request.body &&
          typeof request.body === "object" &&
          typeof (request.body as { productId?: unknown }).productId === "string"
            ? (request.body as { productId: string }).productId
            : "";
        if (!productId) return errorResponse(createPlatformError("validation_failed"));
        const result = await ensureLearnerProductMembershipForPublicSignup(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            publicSchoolId: learnerAuth.value.school.publicId,
            learnerId: learnerAuth.value.learner.id,
            actorId: learnerAuth.value.learner.publicId,
            productPublicId: productId,
            requestId,
          },
          deps.clock,
        );
        if (!result.ok) return errorResponse(result.error);
        return { status: 201, body: result.value };
      }
      const learnerDownloadLinkMatch =
        /^\/v1\/learner\/products\/([^/]+)\/download$/.exec(path);
      if (request.method === "POST" && learnerDownloadLinkMatch) {
        const parsed = createLearnerDownloadLinkBodySchema.safeParse(
          request.body ?? {},
        );
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const result = await createLearnerDownloadLink(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            learnerId: learnerAuth.value.learner.id,
            productPublicId: decodeURIComponent(learnerDownloadLinkMatch[1]!),
            actorId: learnerAuth.value.learner.publicId,
            requestId,
          },
          deps.clock,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      const checkoutSessionStartMatch =
        /^\/v1\/learner\/checkout-sessions\/([^/]+)\/checkout$/.exec(path);
      if (request.method === "POST" && checkoutSessionStartMatch) {
        const parsed = startCheckoutSessionBodySchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        const returnUrl =
          parsed.data.returnUrl ?? `${deps.auth.webOrigin.replace(/\/$/, "")}/checkout`;
        const result = await startCheckoutSession(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            publicSchoolId: learnerAuth.value.school.publicId,
            learnerId: learnerAuth.value.learner.id,
            learnerPublicId: learnerAuth.value.learner.publicId,
            learnerEmail: learnerAuth.value.learner.email,
            learnerName: learnerAuth.value.learner.name,
            requestId,
          },
          {
            sessionPublicId: decodeURIComponent(checkoutSessionStartMatch[1]!),
            returnUrl,
            joiningReason: parsed.data.joiningReason,
          },
          deps.clock,
          deps.paymentProvider,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "POST" && path === "/v1/learner/checkout") {
        const parsed = createLearnerCheckoutBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const rawIdempotency =
          request.headers["idempotency-key"] ?? request.headers["Idempotency-Key"];
        const idempotencyKey = Array.isArray(rawIdempotency)
          ? rawIdempotency[0]
          : rawIdempotency;
        if (!idempotencyKey) {
          return errorResponse(
            createPlatformError("validation_failed", {
              safeDetails: { reason: "idempotency_key_required" },
            }),
          );
        }
        const returnUrl =
          parsed.data.returnUrl ??
          `${deps.auth.webOrigin.replace(/\/$/, "")}/checkout/complete`;
        const result = await startLearnerCheckout(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            publicSchoolId: learnerAuth.value.school.publicId,
            learnerId: learnerAuth.value.learner.id,
            learnerPublicId: learnerAuth.value.learner.publicId,
            learnerEmail: learnerAuth.value.learner.email,
            learnerName: learnerAuth.value.learner.name,
            requestId,
          },
          { planPublicId: parsed.data.planId, idempotencyKey, returnUrl },
          deps.clock,
          deps.paymentProvider,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
      const checkoutMatch = /^\/v1\/learner\/checkouts\/([^/]+)$/.exec(path);
      if (request.method === "GET" && checkoutMatch) {
        const result = await getLearnerCheckout(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            publicSchoolId: learnerAuth.value.school.publicId,
            learnerId: learnerAuth.value.learner.id,
            learnerPublicId: learnerAuth.value.learner.publicId,
            learnerEmail: learnerAuth.value.learner.email,
            learnerName: learnerAuth.value.learner.name,
            requestId,
          },
          decodeURIComponent(checkoutMatch[1]!),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "GET" && path === "/v1/learner/progress") {
        const productId = query.get("productId");
        if (!productId) return errorResponse(createPlatformError("validation_failed"));
        const result = await listLearnerProgress(deps.db, {
          schoolId: learnerAuth.value.school.id,
          learnerId: learnerAuth.value.learner.id,
          productPublicId: productId,
        });
        return result.ok
          ? { status: 200, body: { items: result.value } }
          : errorResponse(result.error);
      }
      const completeMatch = /^\/v1\/learner\/lessons\/([^/]+)\/complete$/.exec(path);
      if (request.method === "POST" && completeMatch) {
        const result = await completeLesson(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            learnerId: learnerAuth.value.learner.id,
            actorId: learnerAuth.value.learner.publicId,
            lessonPublicId: decodeURIComponent(completeMatch[1]!),
            requestId,
          },
          deps.clock,
        );
        if (!result.ok) return errorResponse(result.error);
        return { status: 200, body: result.value };
      }
      return errorResponse(createPlatformError("not_found"));
    }

    if (request.method === "GET" && productGet) {
      const productPublicId = decodeURIComponent(productGet[1]!);
      const requestedSchool = resolveLearnerSchoolKey(request);
      if (learnerAuth.kind === "authenticated") {
        const schoolCheck = assertLearnerSchool(learnerAuth.value, requestedSchool);
        if (!schoolCheck.ok) return errorResponse(schoolCheck.error);
        const requestId = requestIdFrom(request, deps);
        emitSchoolTelemetry(deps, request, {
          requestId,
          schoolId: learnerAuth.value.school.publicId,
          principalId: learnerAuth.value.learner.publicId,
        });
        const result = await getProduct(
          deps.db,
          {
            schoolId: learnerAuth.value.school.id,
            publicId: learnerAuth.value.school.publicId,
          },
          productPublicId,
          {
            kind: "learner",
            schoolAccountId: learnerAuth.value.schoolAccount.id,
            learnerId: learnerAuth.value.schoolAccount.id,
          },
          deps.clock.now(),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (learnerAuth.kind === "rejected") {
        return errorResponse(learnerAuth.error);
      }
      const presented = selectHttpCredential(requestHeaders(request), {
        sessionCookieName: ADMIN_SESSION_COOKIE_NAME,
      });
      if (presented.kind === "absent") {
        if (!requestedSchool) {
          return errorResponse(createPlatformError("tenant_required"));
        }
        const school = await loadSchoolByPublicId(deps.db, requestedSchool);
        if (!school) return errorResponse(createPlatformError("tenant_forbidden"));
        const requestId = requestIdFrom(request, deps);
        emitSchoolTelemetry(deps, request, {
          requestId,
          schoolId: school.publicId,
        });
        const result = await getProduct(
          deps.db,
          { schoolId: school.id, publicId: school.publicId },
          productPublicId,
          { kind: "public" },
          deps.clock.now(),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      const adminAuth = await authenticateHttpRequest(requestHeaders(request), deps);
      if (adminAuth.kind === "authenticated") {
        const school = await resolveSchoolContext({
          db: deps.db,
          principalId: adminAuth.principalId,
          credential: adminAuth.credential,
          requestedPublicSchoolId: requestedSchool,
        });
        if (!school.ok) {
          // A public course page must not be blocked by an unrelated admin
          // session (for example, a team member without product permissions).
          // Fall back only to published public data; drafts still remain
          // protected by the normal admin authorization response.
          if (requestedSchool) {
            const publicSchool = await loadSchoolByPublicId(deps.db, requestedSchool);
            if (publicSchool) {
              const publicResult = await getProduct(
                deps.db,
                { schoolId: publicSchool.id, publicId: publicSchool.publicId },
                productPublicId,
                { kind: "public" },
                deps.clock.now(),
              );
              if (publicResult.ok) return { status: 200, body: publicResult.value };
            }
          }
          return errorResponse(school.error);
        }
        if (!school.value.permissions.has("products:read")) {
          const publicResult = await getProduct(
            deps.db,
            { schoolId: school.value.schoolId, publicId: school.value.publicId },
            productPublicId,
            { kind: "public" },
            deps.clock.now(),
          );
          return publicResult.ok
            ? { status: 200, body: publicResult.value }
            : errorResponse(createPlatformError("forbidden"));
        }
        const requestId = requestIdFrom(request, deps);
        emitSchoolTelemetry(deps, request, {
          requestId,
          schoolId: school.value.publicId,
          principalId: adminAuth.principalId,
        });
        const result = await getProduct(
          deps.db,
          { schoolId: school.value.schoolId, publicId: school.value.publicId },
          productPublicId,
          { kind: "admin" },
          deps.clock.now(),
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      return errorResponse(
        adminAuth.kind === "rejected"
          ? adminAuth.error
          : createPlatformError("unauthenticated"),
      );
    }

    const auth = await authenticateHttpRequest(requestHeaders(request), deps);
    if (auth.kind !== "authenticated") {
      const error =
        auth.kind === "rejected" ? auth.error : createPlatformError("unauthenticated");
      return errorResponse(error);
    }

    if (request.method === "POST" && path === "/api/school/select") {
      if (auth.credential.kind === "api_key") {
        return errorResponse(createPlatformError("forbidden"));
      }
      const schoolId =
        request.body &&
        typeof request.body === "object" &&
        typeof (request.body as { schoolId?: unknown }).schoolId === "string"
          ? (request.body as { schoolId: string }).schoolId
          : "";
      if (!schoolId) return errorResponse(createPlatformError("validation_failed"));
      const resolved = await resolveSchoolContext({
        db: deps.db,
        principalId: auth.principalId,
        credential: auth.credential,
        requestedPublicSchoolId: schoolId,
      });
      if (!resolved.ok) return errorResponse(resolved.error);
      const requestId = readOrCreateRequestId(
        typeof request.headers["x-request-id"] === "string"
          ? request.headers["x-request-id"]
          : undefined,
        deps.clock,
      );
      await deps.db.transaction(async (tx) => {
        await tx
          .delete(schema.selectedSchools)
          .where(eq(schema.selectedSchools.userId, auth.principalId));
        await tx.insert(schema.selectedSchools).values({
          userId: auth.principalId,
          schoolId: resolved.value.schoolId,
        });
        await tx.insert(schema.auditEvents).values({
          id: uuidv7(deps.clock),
          schoolId: resolved.value.schoolId,
          actorId: auth.principalId,
          action: "school.selected",
          resourceType: "school",
          resourceId: resolved.value.publicId,
          requestId,
          createdAt: deps.clock.now(),
        });
      });
      return { status: 204, body: undefined };
    }
    if (request.method === "GET" && path === "/v1/schools") {
      if (auth.credential.kind === "api_key") {
        return errorResponse(createPlatformError("forbidden"));
      }
      const items = await listSchoolsForUser(deps.db, auth.principalId);
      return { status: 200, body: { items } };
    }
    if (request.method === "GET" && path === "/v1/billing/catalog") {
      if (auth.credential.kind === "api_key") {
        return errorResponse(createPlatformError("forbidden"));
      }
      if (deps.billingMode === "cloud") {
        await deps.billing.billing.recordRequestedCatalog();
        await deps.billing.billing.verifyRequestedCatalog();
      }
      const catalog = await readPublicBillingCatalog(deps.billing.billing);
      return { status: 200, body: catalog };
    }
    if (request.method === "POST" && path === "/v1/schools") {
      if (auth.credential.kind === "api_key") {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed = createSchoolBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const plan = parsed.data.plan;
      const interval = parsed.data.interval;
      const catalogRevision = parsed.data.catalogRevision;
      if (deps.billingMode !== "oss") {
        if (plan !== "pro" && plan !== "business") {
          return errorResponse(
            createPlatformError("validation_failed", {
              safeDetails: { reason: "paid_plan_required" },
            }),
          );
        }
        if (interval !== "month" && interval !== "year") {
          return errorResponse(createPlatformError("validation_failed"));
        }
        if (typeof catalogRevision !== "number") {
          return errorResponse(createPlatformError("validation_failed"));
        }
      }
      const requestId = requestIdFrom(request, deps);
      const result = await createSchool(
        deps.db,
        {
          name: parsed.data.name,
          subdomain: parsed.data.subdomain,
          locale: parsed.data.locale,
          currency: parsed.data.currency,
          principalId: auth.principalId,
          requestId,
        },
        deps.clock,
      );
      if (!result.ok) return errorResponse(result.error);
      emitSchoolTelemetry(deps, request, {
        requestId,
        schoolId: result.value.id,
        principalId: auth.principalId,
      });
      if (deps.observability) {
        void processNextIntegrationJob(
          deps.db,
          deps.clock,
          deps.observability.logger,
        ).catch((error) => {
          deps.observability?.captureException({
            error,
            source: "school.website-provisioning",
          });
        });
      }
      if (deps.billingMode === "oss") {
        return { status: 201, body: result.value };
      }
      if (
        (plan !== "pro" && plan !== "business") ||
        (interval !== "month" && interval !== "year") ||
        typeof catalogRevision !== "number"
      ) {
        return errorResponse(createPlatformError("internal_error"));
      }
      const created = await deps.db
        .select({ id: schema.schools.id })
        .from(schema.schools)
        .where(eq(schema.schools.publicId, result.value.id))
        .limit(1);
      const internalId = created[0]?.id;
      if (!internalId) {
        return errorResponse(createPlatformError("internal_error"));
      }
      const checkout = await startSchoolCheckout({
        db: deps.db,
        billing: deps.billing,
        clock: deps.clock,
        principalId: auth.principalId,
        schoolInternalId: internalId,
        plan,
        interval,
        catalogRevision,
        returnUrl: `${deps.auth.webOrigin.replace(/\/$/, "")}/`,
      });
      if (!checkout.ok) return errorResponse(checkout.error);
      return {
        status: 201,
        body: { ...result.value, checkoutUrl: checkout.checkoutUrl },
      };
    }
    if (request.method === "POST" && path === "/v1/invitations/accept") {
      if (auth.credential.kind === "api_key") {
        return errorResponse(createPlatformError("forbidden"));
      }
      const input = request.body as { token?: unknown; email?: unknown } | undefined;
      if (typeof input?.token !== "string" || typeof input.email !== "string") {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await acceptInvitation(
        deps.db,
        {
          requestId: readOrCreateRequestId(
            typeof request.headers["x-request-id"] === "string"
              ? request.headers["x-request-id"]
              : undefined,
            deps.clock,
          ),
          principalId: auth.principalId,
          tenantId: null,
          credential: auth.credential,
          permissions: new Set(),
        },
        input.token,
        input.email,
        deps.clock,
      );
      return result.ok ? { status: 200, body: result } : errorResponse(result.error);
    }
    if (
      request.method === "POST" &&
      (path === "/v1/team-invitations/preview" ||
        path === "/v1/team-invitations/accept" ||
        path === "/v1/team-invitations/reject")
    ) {
      if (auth.credential.kind === "api_key") {
        return errorResponse(createPlatformError("forbidden"));
      }
      const input = request.body as
        | { invitationId?: unknown; token?: unknown }
        | undefined;
      if (typeof input?.invitationId !== "string" || typeof input.token !== "string") {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const invitationContext = {
        requestId: requestIdFrom(request, deps),
        principalId: auth.principalId,
        tenantId: null,
        credential: auth.credential,
        permissions: new Set<CourseLitPermission>(),
      };
      if (path === "/v1/team-invitations/preview") {
        const result = await previewInvitation(
          deps.db,
          invitationContext,
          input.invitationId,
          input.token,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (path === "/v1/team-invitations/reject") {
        const result = await rejectInvitation(
          deps.db,
          invitationContext,
          input.invitationId,
          input.token,
          deps.clock,
        );
        return result.ok
          ? { status: 204, body: undefined }
          : errorResponse(result.error);
      }
      const result = await acceptInvitation(
        deps.db,
        invitationContext,
        input.token,
        undefined,
        deps.clock,
        input.invitationId,
      );
      return result.ok ? { status: 200, body: result } : errorResponse(result.error);
    }

    const school = await resolveSchoolContext({
      db: deps.db,
      principalId: auth.principalId,
      credential: auth.credential,
      requestedPublicSchoolId: headerSchoolId(request.headers),
    });
    if (!school.ok) return errorResponse(school.error);

    const context: PlatformRequestContext<string, string, CourseLitPermission> = {
      requestId: requestIdFrom(request, deps),
      principalId: auth.principalId,
      tenantId: school.value.schoolId,
      credential: auth.credential,
      permissions: school.value.permissions,
    };
    emitSchoolTelemetry(deps, request, {
      requestId: context.requestId,
      schoolId: school.value.publicId,
      principalId: auth.principalId,
    });

    if (request.method === "GET" && path === "/v1/notifications") {
      const parsed = notificationListQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
      });
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await listAdminNotifications(
        deps.db,
        { schoolId: context.tenantId!, adminUserId: context.principalId },
        parsed.data,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const adminNotificationReadMatch = /^\/v1\/notifications\/([^/]+)\/read$/.exec(
      path,
    );
    if (request.method === "PATCH" && adminNotificationReadMatch) {
      const result = await markAdminNotificationRead(
        deps.db,
        { schoolId: context.tenantId!, adminUserId: context.principalId },
        decodeURIComponent(adminNotificationReadMatch[1]!),
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "POST" && path === "/v1/notifications/read-all") {
      const result = await markAllAdminNotificationsRead(
        deps.db,
        { schoolId: context.tenantId!, adminUserId: context.principalId },
        deps.clock,
      );
      return { status: 200, body: result.value };
    }

    if (request.method === "POST" && path === "/v1/learners/identity-link") {
      if (auth.credential.kind === "api_key") {
        return errorResponse(createPlatformError("forbidden"));
      }
      const result = await createLearnerIdentityLink(
        deps.db,
        {
          schoolId: context.tenantId,
          publicSchoolId: school.value.publicId,
          principalId: context.principalId,
          requestId: context.requestId,
          permissions: context.permissions,
        },
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }

    const updateSchoolMatch = /^\/v1\/schools\/([^/]+)$/.exec(path);
    // Website / Pages
    if (
      (request.method === "GET" || request.method === "POST") &&
      path === "/v1/school/website/pages"
    ) {
      const requiredPerm = request.method === "POST" ? "storefront:write" : "storefront:read";
      if (!context.permissions.has(requiredPerm)) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed =
        request.method === "POST"
          ? createSchoolWebsitePageBodySchema.safeParse(request.body ?? {})
          : null;
      if (parsed && !parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const integrationRows = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      const integration = integrationRows[0];
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        if (request.method === "POST" && parsed?.success) {
          const page = await createFrontLitPage(parsed.data, teamApiKey, { config });
          return { status: 201, body: page };
        }
        const pages = await listFrontLitPages(teamApiKey, { config });
        // Sales pages are owned by their product/community. They are edited
        // from those resource screens, not from the ordinary page list.
        const [productSalesPages, communitySalesPages] = await Promise.all([
          deps.db
            .select({ pageId: schema.products.salesPageId })
            .from(schema.products)
            .where(eq(schema.products.schoolId, context.tenantId!)),
          deps.db
            .select({ pageId: schema.communities.salesPageId })
            .from(schema.communities)
            .where(eq(schema.communities.schoolId, context.tenantId!)),
        ]);
        const salesPageIds = new Set(
          [...productSalesPages, ...communitySalesPages]
            .map((mapping) => mapping.pageId)
            .filter((pageId): pageId is string => Boolean(pageId)),
        );
        return {
          status: 200,
          body: {
            items: pages.filter(
              (page) =>
                !isCourseLitSalesPageSlug(page.slug) && !salesPageIds.has(page.id),
            ),
          },
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-pages",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        if (error instanceof FrontLitApiError && error.status === 400) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }
    // Website / Branding
    if (
      (request.method === "GET" || request.method === "PATCH") &&
      path === "/v1/school/website/branding"
    ) {
      const requiredPerm = request.method === "PATCH" ? "storefront:write" : "storefront:read";
      if (!context.permissions.has(requiredPerm)) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed =
        request.method === "PATCH"
          ? updateSchoolWebsiteBrandingBodySchema.safeParse(request.body ?? {})
          : null;
      if (parsed && !parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const [integration] = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        if (request.method === "PATCH" && parsed?.success) {
          const settings = await updateFrontLitSettings(parsed.data, teamApiKey, {
            config,
          });
          return { status: 200, body: settings };
        }
        const settings = await getFrontLitSettings(teamApiKey, { config });
        return { status: 200, body: settings };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-branding",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 400) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }

    // Website / Blogs
    if (
      (request.method === "GET" || request.method === "POST") &&
      path === "/v1/school/website/blogs"
    ) {
      const requiredPerm = request.method === "POST" ? "storefront:write" : "storefront:read";
      if (!context.permissions.has(requiredPerm)) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed =
        request.method === "POST"
          ? createSchoolWebsiteBlogBodySchema.safeParse(request.body ?? {})
          : null;
      if (parsed && !parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const integrationRows = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      const integration = integrationRows[0];
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        if (request.method === "POST" && parsed?.success) {
          const blog = await createFrontLitBlog(parsed.data, teamApiKey, { config });
          return { status: 201, body: blog };
        }
        const blogs = await listFrontLitBlogs(teamApiKey, { config });
        return { status: 200, body: { items: blogs } };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-blogs",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        if (error instanceof FrontLitApiError && error.status === 400) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }
    // Website / Branding themes
    if (
      (request.method === "GET" || request.method === "POST") &&
      path === "/v1/school/website/branding/themes"
    ) {
      const requiredPerm = request.method === "POST" ? "storefront:write" : "storefront:read";
      if (!context.permissions.has(requiredPerm)) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed =
        request.method === "POST"
          ? createSchoolWebsiteThemeBodySchema.safeParse(request.body ?? {})
          : null;
      if (parsed && !parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const [integration] = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        if (request.method === "POST" && parsed?.success) {
          return {
            status: 201,
            body: await createFrontLitTheme(parsed.data, teamApiKey, { config }),
          };
        }
        return {
          status: 200,
          body: { items: await listFrontLitThemes(teamApiKey, { config }) },
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-branding-themes",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 400) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }

    const frontLitThemeMatch =
      /^\/v1\/school\/website\/branding\/themes\/([^/]+)$/.exec(path);
    if (request.method === "PATCH" && frontLitThemeMatch) {
      if (!context.permissions.has("storefront:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed = updateSchoolWebsiteThemeBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const [integration] = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        return {
          status: 200,
          body: await updateFrontLitTheme(
            decodeURIComponent(frontLitThemeMatch[1]!),
            parsed.data,
            teamApiKey,
            { config },
          ),
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-branding-themes.editor",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 400) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        if (error instanceof FrontLitApiError && error.status === 404) {
          return errorResponse(createPlatformError("not_found"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }

    const frontLitPageMatch = /^\/v1\/school\/website\/pages\/([^/]+)$/.exec(path);
    if ((request.method === "GET" || request.method === "PATCH") && frontLitPageMatch) {
      const requiredPerm = request.method === "PATCH" ? "storefront:write" : "storefront:read";
      if (!context.permissions.has(requiredPerm)) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed =
        request.method === "PATCH"
          ? updateSchoolWebsitePageBodySchema.safeParse(request.body ?? {})
          : null;
      if (parsed && !parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const integrationRows = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      const integration = integrationRows[0];
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        const pageId = decodeURIComponent(frontLitPageMatch[1]!);
        const [productOwner, communityOwner] = await Promise.all([
          deps.db
            .select({
              publicId: schema.products.publicId,
              kind: schema.products.kind,
            })
            .from(schema.products)
            .where(
              and(
                eq(schema.products.schoolId, context.tenantId!),
                eq(schema.products.salesPageId, pageId),
              ),
            )
            .limit(1),
          deps.db
            .select({ publicId: schema.communities.publicId })
            .from(schema.communities)
            .where(
              and(
                eq(schema.communities.schoolId, context.tenantId!),
                eq(schema.communities.salesPageId, pageId),
                isNull(schema.communities.deletedAt),
              ),
            )
            .limit(1),
        ]);
        const product = productOwner[0];
        const community = communityOwner[0];
        const page =
          request.method === "PATCH" && parsed?.success
            ? await updateFrontLitPage(pageId, parsed.data, teamApiKey, { config })
            : await getFrontLitPage(pageId, teamApiKey, { config });
        return {
          status: 200,
          body: {
            ...page,
            ...(product
              ? {
                  salesResourceType: "product" as const,
                  salesResourceId: product.publicId,
                  salesResourceKind: product.kind,
                }
              : community
                ? {
                    salesResourceType: "community" as const,
                    salesResourceId: community.publicId,
                    salesResourceKind: null,
                  }
                : {}),
          },
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-pages.editor",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 400) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        if (error instanceof FrontLitApiError && error.status === 404) {
          return errorResponse(createPlatformError("not_found"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }
    const discardFrontLitPageMatch =
      /^\/v1\/school\/website\/pages\/([^/]+)\/discard-draft$/.exec(path);
    if (request.method === "POST" && discardFrontLitPageMatch) {
      if (!context.permissions.has("storefront:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const integrationRows = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      const integration = integrationRows[0];
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        const page = await discardFrontLitPageDraft(
          decodeURIComponent(discardFrontLitPageMatch[1]!),
          teamApiKey,
          { config },
        );
        return { status: 200, body: page };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-pages.discard",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 404) {
          return errorResponse(createPlatformError("not_found"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }
    const frontLitBlogMatch = /^\/v1\/school\/website\/blogs\/([^/]+)$/.exec(path);
    if ((request.method === "GET" || request.method === "PATCH") && frontLitBlogMatch) {
      const requiredPerm = request.method === "PATCH" ? "storefront:write" : "storefront:read";
      if (!context.permissions.has(requiredPerm)) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed =
        request.method === "PATCH"
          ? updateSchoolWebsiteBlogBodySchema.safeParse(request.body ?? {})
          : null;
      if (parsed && !parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const integrationRows = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      const integration = integrationRows[0];
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        const blogId = decodeURIComponent(frontLitBlogMatch[1]!);
        if (request.method === "PATCH" && parsed?.success) {
          return {
            status: 200,
            body: await updateFrontLitBlog(blogId, parsed.data, teamApiKey, { config }),
          };
        }
        return {
          status: 200,
          body: await getFrontLitBlog(blogId, teamApiKey, { config }),
        };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-blogs.editor",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 400) {
          return errorResponse(createPlatformError("validation_failed"));
        }
        if (error instanceof FrontLitApiError && error.status === 404) {
          return errorResponse(createPlatformError("not_found"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }
    const discardFrontLitBlogMatch =
      /^\/v1\/school\/website\/blogs\/([^/]+)\/discard-draft$/.exec(path);
    if (request.method === "POST" && discardFrontLitBlogMatch) {
      if (!context.permissions.has("storefront:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const integrationRows = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      const integration = integrationRows[0];
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        const blog = await discardFrontLitBlogDraft(
          decodeURIComponent(discardFrontLitBlogMatch[1]!),
          teamApiKey,
          { config },
        );
        return { status: 200, body: blog };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-blogs.discard",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 404) {
          return errorResponse(createPlatformError("not_found"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }
    const publishFrontLitPageMatch =
      /^\/v1\/school\/website\/pages\/([^/]+)\/publish$/.exec(path);
    if (request.method === "POST" && publishFrontLitPageMatch) {
      if (!context.permissions.has("storefront:publish")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const integrationRows = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      const integration = integrationRows[0];
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        const page = await publishFrontLitPage(
          decodeURIComponent(publishFrontLitPageMatch[1]!),
          teamApiKey,
          { config },
        );
        return { status: 200, body: page };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-pages.publish",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 404) {
          return errorResponse(createPlatformError("not_found"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }
    const publishFrontLitBlogMatch =
      /^\/v1\/school\/website\/blogs\/([^/]+)\/publish$/.exec(path);
    if (request.method === "POST" && publishFrontLitBlogMatch) {
      if (!context.permissions.has("storefront:publish")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const integrationRows = await deps.db
        .select()
        .from(schema.schoolIntegrations)
        .where(
          and(
            eq(schema.schoolIntegrations.schoolId, context.tenantId!),
            eq(schema.schoolIntegrations.provider, "frontlit"),
          ),
        )
        .limit(1);
      const integration = integrationRows[0];
      if (!integration?.encryptedTeamKey || !integration.remoteTeamId) {
        return errorResponse(createPlatformError("conflict"));
      }
      try {
        const teamApiKey = decryptIntegrationSecret(integration.encryptedTeamKey);
        const config = {
          server: integration.server || frontLitConfig().server,
          provisioningSecret: null,
        };
        const blog = await publishFrontLitBlog(
          decodeURIComponent(publishFrontLitBlogMatch[1]!),
          teamApiKey,
          { config },
        );
        return { status: 200, body: blog };
      } catch (error) {
        deps.observability?.captureException({
          error,
          source: "school.website-blogs.publish",
          context: { school_id: school.value.publicId },
        });
        if (error instanceof FrontLitApiError && error.status === 404) {
          return errorResponse(createPlatformError("not_found"));
        }
        if (error instanceof FrontLitApiError && error.status === 409) {
          return errorResponse(createPlatformError("conflict"));
        }
        return errorResponse(createPlatformError("internal_error"));
      }
    }
    if (request.method === "PATCH" && updateSchoolMatch) {
      if (!context.permissions.has("school:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      if (decodeURIComponent(updateSchoolMatch[1]!) !== school.value.publicId) {
        return errorResponse(createPlatformError("tenant_forbidden"));
      }
      const parsed = updateSchoolBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateSchoolCurrency(
        deps.db,
        {
          schoolId: context.tenantId!,
          actorId: context.principalId,
          currency: parsed.data.currency,
          requestId: context.requestId,
        },
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    if (path === "/v1/school/payment-settings") {
      if (!context.permissions.has("commerce:manage")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      if (request.method === "GET") {
        const result = await getSchoolPaymentSettings(deps.db, context.tenantId!);
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "PATCH") {
        const parsed = updateSchoolPaymentSettingsBodySchema.safeParse(
          request.body ?? {},
        );
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await updateSchoolPaymentSettings(
          deps.db,
          {
            schoolId: context.tenantId!,
            actorId: context.principalId,
            settings: parsed.data,
            requestId: context.requestId,
          },
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    if (path === "/v1/school/code-injection") {
      const requiredPerm = request.method === "PATCH" ? "school:write" : "school:read";
      if (!context.permissions.has(requiredPerm)) {
        return errorResponse(createPlatformError("forbidden"));
      }
      if (request.method === "GET") {
        const result = await getSchoolCodeInjection(deps.db, context.tenantId!);
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "PATCH") {
        const parsed = updateSchoolCodeInjectionBodySchema.safeParse(
          request.body ?? {},
        );
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await updateSchoolCodeInjection(
          deps.db,
          {
            schoolId: context.tenantId!,
            actorId: context.principalId,
            codeInjectionHead: parsed.data.codeInjectionHead,
            codeInjectionBody: parsed.data.codeInjectionBody,
            requestId: context.requestId,
          },
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    // ---------------------------------------------------------------------------
    // Mailing, Tags, Segments, Subscribers, Sequences & Templates
    // ---------------------------------------------------------------------------
    if (path === "/v1/school/mails/settings") {
      if (
        !context.permissions.has("learners:write")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      if (request.method === "GET") {
        const result = await getMailingSettings(deps.db, context.tenantId!, deps.clock);
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "PATCH" || request.method === "PUT") {
        const result = await updateMailingSettings(
          deps.db,
          context.tenantId!,
          deps.clock,
          (request.body ?? {}) as any,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    if (request.method === "GET" && path === "/v1/school/mails/overview") {
      if (
        !context.permissions.has("learners:read")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const result = await getOverview(deps.db, context.tenantId!, deps.clock);
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    if (request.method === "GET" && path === "/v1/school/overview") {
      if (
        !context.permissions.has("learners:read")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsedRange = activityRangeSchema.safeParse(query.get("range") ?? "7d");
      if (!parsedRange.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await getSchoolOverview(
        deps.db,
        context.tenantId!,
        parsedRange.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const contactTagMatch =
      /^\/v1\/school\/(?:contacts|users)\/([^/]+)\/tags\/([^/]+)$/.exec(path);
    if (contactTagMatch) {
      if (
        !context.permissions.has("learners:write")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const contactId = decodeURIComponent(contactTagMatch[1]!);
      const tag = decodeURIComponent(contactTagMatch[2]!);
      if (request.method === "POST") {
        const result = await addTagToContact(
          deps.db,
          context.tenantId!,
          deps.clock,
          contactId,
          tag,
        );
        if (result.ok) {
          await recordActivity(
            deps.db,
            {
              schoolId: context.tenantId!,
              actorId: contactId,
              type: ActivityType.TAG_ADDED,
              entityId: contactId,
              metadata: { tag },
            },
            deps.clock,
          );
        }
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "DELETE") {
        const result = await removeTagFromContact(
          deps.db,
          context.tenantId!,
          deps.clock,
          contactId,
          tag,
        );
        if (result.ok) {
          await recordActivity(
            deps.db,
            {
              schoolId: context.tenantId!,
              actorId: contactId,
              type: ActivityType.TAG_REMOVED,
              entityId: contactId,
              metadata: { tag },
            },
            deps.clock,
          );
        }
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    if (path === "/v1/school/mails/subscribers" || path === "/v1/school/contacts") {
      if (request.method === "GET") {
        if (
            !context.permissions.has("learners:read")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await listSubscribers(deps.db, context.tenantId!, deps.clock, {
          search: query.get("search") ?? undefined,
          tag: query.get("tag") ?? undefined,
          status: query.get("status") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ? Number(query.get("limit")) : undefined,
        });
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "POST") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await createSubscriber(
          deps.db,
          context.tenantId!,
          deps.clock,
          (request.body ?? {}) as any,
        );
        if (result.ok) {
          await recordActivity(
            deps.db,
            {
              schoolId: context.tenantId!,
              actorId: result.value.contactId,
              type: ActivityType.USER_CREATED,
              entityId: result.value.contactId,
              metadata: { email: result.value.email },
            },
            deps.clock,
          );
          if (result.value.subscribed) {
            await recordActivity(
              deps.db,
              {
                schoolId: context.tenantId!,
                actorId: result.value.contactId,
                type: ActivityType.NEWSLETTER_SUBSCRIBED,
                entityId: result.value.contactId,
                metadata: { email: result.value.email },
              },
              deps.clock,
            );
          }
        }
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
    }

    const subscriberMatch =
      /^\/v1\/school\/(?:mails\/subscribers|contacts)\/([^/]+)$/.exec(path);
    if (subscriberMatch) {
      const contactId = decodeURIComponent(subscriberMatch[1]!);
      if (request.method === "GET") {
        if (
            !context.permissions.has("learners:read")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await getSubscriber(
          deps.db,
          context.tenantId!,
          deps.clock,
          contactId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "PATCH" || request.method === "PUT") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await updateSubscriber(
          deps.db,
          context.tenantId!,
          deps.clock,
          contactId,
          (request.body ?? {}) as any,
        );
        const updateInput = (request.body ?? {}) as { subscribed?: boolean };
        if (result.ok && updateInput.subscribed !== undefined) {
          await recordActivity(
            deps.db,
            {
              schoolId: context.tenantId!,
              actorId: contactId,
              type: updateInput.subscribed
                ? ActivityType.NEWSLETTER_SUBSCRIBED
                : ActivityType.NEWSLETTER_UNSUBSCRIBED,
              entityId: contactId,
              metadata: { email: result.value.email },
            },
            deps.clock,
          );
        }
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "DELETE") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await deleteSubscriber(
          deps.db,
          context.tenantId!,
          deps.clock,
          contactId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    if (path === "/v1/school/segments") {
      if (request.method === "GET") {
        if (
            !context.permissions.has("learners:read")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await listSegments(deps.db, context.tenantId!, deps.clock, {
          search: query.get("search") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ? Number(query.get("limit")) : undefined,
        });
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "POST") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await createSegment(
          deps.db,
          context.tenantId!,
          deps.clock,
          (request.body ?? {}) as any,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
    }

    const segmentMatch = /^\/v1\/school\/segments\/([^/]+)$/.exec(path);
    if (segmentMatch) {
      const segmentId = decodeURIComponent(segmentMatch[1]!);
      if (request.method === "GET") {
        if (
            !context.permissions.has("learners:read")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await getSegment(
          deps.db,
          context.tenantId!,
          deps.clock,
          segmentId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "PATCH" || request.method === "PUT") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await updateSegment(
          deps.db,
          context.tenantId!,
          deps.clock,
          segmentId,
          (request.body ?? {}) as any,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "DELETE") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await deleteSegment(
          deps.db,
          context.tenantId!,
          deps.clock,
          segmentId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    if (path === "/v1/school/mails/sequences") {
      if (request.method === "GET") {
        if (
            !context.permissions.has("learners:read")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await listSequences(deps.db, context.tenantId!, deps.clock, {
          type: query.get("type") ?? undefined,
          status: query.get("status") ?? undefined,
          search: query.get("search") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ? Number(query.get("limit")) : undefined,
        });
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "POST") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await createSequence(
          deps.db,
          context.tenantId!,
          deps.clock,
          (request.body ?? {}) as any,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
    }

    const sequenceStatsMatch = /^\/v1\/school\/mails\/sequences\/([^/]+)\/stats$/.exec(
      path,
    );
    if (request.method === "GET" && sequenceStatsMatch) {
      if (
        !context.permissions.has("learners:read")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const sequenceId = decodeURIComponent(sequenceStatsMatch[1]!);
      const result = await getSequenceStats(
        deps.db,
        context.tenantId!,
        deps.clock,
        sequenceId,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const sequenceStartMatch = /^\/v1\/school\/mails\/sequences\/([^/]+)\/start$/.exec(
      path,
    );
    if (request.method === "POST" && sequenceStartMatch) {
      if (
        !context.permissions.has("learners:write")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const sequenceId = decodeURIComponent(sequenceStartMatch[1]!);
      const result = await startSequence(
        deps.db,
        context.tenantId!,
        deps.clock,
        sequenceId,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const sequencePauseMatch = /^\/v1\/school\/mails\/sequences\/([^/]+)\/pause$/.exec(
      path,
    );
    if (request.method === "POST" && sequencePauseMatch) {
      if (
        !context.permissions.has("learners:write")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const sequenceId = decodeURIComponent(sequencePauseMatch[1]!);
      const result = await pauseSequence(
        deps.db,
        context.tenantId!,
        deps.clock,
        sequenceId,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const sequenceEmailItemMatch =
      /^\/v1\/school\/mails\/sequences\/([^/]+)\/emails\/([^/]+)$/.exec(path);
    if (sequenceEmailItemMatch) {
      if (
        !context.permissions.has("learners:write")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const sequenceId = decodeURIComponent(sequenceEmailItemMatch[1]!);
      const emailId = decodeURIComponent(sequenceEmailItemMatch[2]!);
      if (request.method === "PATCH" || request.method === "PUT") {
        const result = await updateSequenceEmail(
          deps.db,
          context.tenantId!,
          deps.clock,
          sequenceId,
          emailId,
          (request.body ?? {}) as any,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "DELETE") {
        const result = await deleteSequenceEmail(
          deps.db,
          context.tenantId!,
          deps.clock,
          sequenceId,
          emailId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    const sequenceEmailsMatch =
      /^\/v1\/school\/mails\/sequences\/([^/]+)\/emails$/.exec(path);
    if (request.method === "POST" && sequenceEmailsMatch) {
      if (
        !context.permissions.has("learners:write")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const sequenceId = decodeURIComponent(sequenceEmailsMatch[1]!);
      const result = await addSequenceEmail(
        deps.db,
        context.tenantId!,
        deps.clock,
        sequenceId,
        (request.body ?? {}) as any,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }

    const sequenceMatch = /^\/v1\/school\/mails\/sequences\/([^/]+)$/.exec(path);
    if (sequenceMatch) {
      const sequenceId = decodeURIComponent(sequenceMatch[1]!);
      if (request.method === "GET") {
        if (
            !context.permissions.has("learners:read")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await getSequence(
          deps.db,
          context.tenantId!,
          deps.clock,
          sequenceId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "PATCH" || request.method === "PUT") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await updateSequence(
          deps.db,
          context.tenantId!,
          deps.clock,
          sequenceId,
          (request.body ?? {}) as any,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "DELETE") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await deleteSequence(
          deps.db,
          context.tenantId!,
          deps.clock,
          sequenceId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    if (path === "/v1/school/mails/system-templates" && request.method === "GET") {
      if (
        !context.permissions.has("learners:read")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const result = await listSystemTemplates(deps.db, context.tenantId!, deps.clock);
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    if (path === "/v1/school/mails/templates") {
      if (request.method === "GET") {
        if (
            !context.permissions.has("learners:read")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await listTemplates(deps.db, context.tenantId!, deps.clock, {
          search: query.get("search") ?? undefined,
          cursor: query.get("cursor") ?? undefined,
          limit: query.get("limit") ? Number(query.get("limit")) : undefined,
        });
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "POST") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await createTemplate(
          deps.db,
          context.tenantId!,
          deps.clock,
          (request.body ?? {}) as any,
        );
        return result.ok
          ? { status: 201, body: result.value }
          : errorResponse(result.error);
      }
    }

    const templateDuplicateMatch =
      /^\/v1\/school\/mails\/templates\/([^/]+)\/duplicate$/.exec(path);
    if (request.method === "POST" && templateDuplicateMatch) {
      if (
        !context.permissions.has("learners:write")
      ) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const templateId = decodeURIComponent(templateDuplicateMatch[1]!);
      const result = await duplicateTemplate(
        deps.db,
        context.tenantId!,
        deps.clock,
        templateId,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }

    const templateMatch = /^\/v1\/school\/mails\/templates\/([^/]+)$/.exec(path);
    if (templateMatch) {
      const templateId = decodeURIComponent(templateMatch[1]!);
      if (request.method === "GET") {
        if (
            !context.permissions.has("learners:read")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await getTemplate(
          deps.db,
          context.tenantId!,
          deps.clock,
          templateId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "PATCH" || request.method === "PUT") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await updateTemplate(
          deps.db,
          context.tenantId!,
          deps.clock,
          templateId,
          (request.body ?? {}) as any,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "DELETE") {
        if (
            !context.permissions.has("learners:write")
        ) {
          return errorResponse(createPlatformError("forbidden"));
        }
        const result = await deleteTemplate(
          deps.db,
          context.tenantId!,
          deps.clock,
          templateId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }

    const adminCommunityViewer = { kind: "admin" as const, context };
    const communitySchool = {
      schoolId: context.tenantId!,
      publicId: school.value.publicId,
    };
    const discussionReportsMatch =
      /^\/v1\/products\/([^/]+)\/discussions\/reports$/.exec(path);
    if (request.method === "GET" && discussionReportsMatch) {
      const parsed = communityStatusQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
        status: query.get("status") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listDiscussionReports(
        deps.db,
        context,
        decodeURIComponent(discussionReportsMatch[1]!),
        {
          status: parsed.data.status,
          cursor: parsed.data.cursor,
          limit: parsed.data.limit,
        },
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const discussionReportMatch = /^\/v1\/product-discussion-reports\/([^/]+)$/.exec(
      path,
    );
    if (request.method === "PATCH" && discussionReportMatch) {
      const parsed = updateDiscussionReportBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await updateDiscussionReport(
        deps.db,
        context,
        decodeURIComponent(discussionReportMatch[1]!),
        parsed.data.status,
        parsed.data.rejectionReason,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "GET" && path === "/v1/spaces") {
      const result = await listAdminSpaces(deps.db, context, school.value.schoolId);
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "POST" && path === "/v1/spaces") {
      const parsed = createSpaceBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await createSpace(
        deps.db,
        context,
        school.value.schoolId,
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "GET" && path === "/v1/spaces/reports") {
      const parsed = communityStatusQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
        status: query.get("status") ?? undefined,
        spaceId: query.get("spaceId") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listSpaceReports(
        deps.db,
        context,
        communitySchool,
        parsed.data,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "PUT" && path === "/v1/spaces/order") {
      const parsed = orderSpacesBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await orderSpaces(
        deps.db,
        context,
        school.value.schoolId,
        parsed.data.spaceIds,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const spaceMatch = /^\/v1\/spaces\/([^/]+)$/.exec(path);
    if (spaceMatch) {
      const spaceId = decodeURIComponent(spaceMatch[1]!);
      if (request.method === "GET") {
        const result = await getAdminSpace(
          deps.db,
          context,
          school.value.schoolId,
          spaceId,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "PATCH") {
        const parsed = updateSpaceBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await updateSpace(
          deps.db,
          context,
          school.value.schoolId,
          spaceId,
          parsed.data,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
      if (request.method === "DELETE") {
        const parsed = deleteSpaceBodySchema.safeParse(request.body ?? {});
        if (!parsed.success)
          return errorResponse(createPlatformError("validation_failed"));
        const result = await deleteSpace(
          deps.db,
          context,
          school.value.schoolId,
          spaceId,
          parsed.data.destinationSpaceId,
          deps.clock,
        );
        return result.ok
          ? { status: 200, body: result.value }
          : errorResponse(result.error);
      }
    }
    if (request.method === "GET" && path === "/v1/community") {
      const community = await deps.db
        .select({ publicId: schema.communities.publicId })
        .from(schema.communities)
        .where(eq(schema.communities.schoolId, school.value.schoolId))
        .limit(1);
      if (!community[0]) return errorResponse(createPlatformError("not_found"));
      const result = await getCommunity(
        deps.db,
        communitySchool,
        community[0].publicId,
        adminCommunityViewer,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "GET" && path === "/v1/communities") {
      if (!context.permissions.has("communities:read")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      return errorResponse(createPlatformError("not_found"));
    }
    if (request.method === "POST" && path === "/v1/communities") {
      if (!context.permissions.has("communities:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      return errorResponse(createPlatformError("not_found"));
    }
    const communityMatch = /^\/v1\/communities\/([^/]+)$/.exec(path);
    if (request.method === "GET" && communityMatch) {
      const result = await getCommunity(
        deps.db,
        communitySchool,
        decodeURIComponent(communityMatch[1]!),
        adminCommunityViewer,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "PATCH" && communityMatch) {
      const parsed = updateCommunityBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await updateCommunity(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(communityMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityCategoriesMatch = /^\/v1\/communities\/([^/]+)\/categories$/.exec(
      path,
    );
    if (request.method === "POST" && communityCategoriesMatch) {
      const parsed = addCommunityCategoryBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await addCommunityCategory(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(communityCategoriesMatch[1]!),
        parsed.data.category,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityCategoryMatch =
      /^\/v1\/communities\/([^/]+)\/categories\/([^/]+)$/.exec(path);
    if (request.method === "DELETE" && communityCategoryMatch) {
      const parsed = deleteCommunityCategoryBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await deleteCommunityCategory(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(communityCategoryMatch[1]!),
        decodeURIComponent(communityCategoryMatch[2]!),
        parsed.data.migrateToCategory,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "DELETE" && communityMatch) {
      const result = await deleteCommunity(
        deps.db,
        context,
        decodeURIComponent(communityMatch[1]!),
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityMembersMatch = /^\/v1\/communities\/([^/]+)\/members$/.exec(path);
    if (request.method === "GET" && communityMembersMatch) {
      const parsed = communityMembershipListQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
        category: query.get("category") ?? undefined,
        status: query.get("status") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listMemberships(
        deps.db,
        context,
        decodeURIComponent(communityMembersMatch[1]!),
        parsed.data,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityMembershipMatch = /^\/v1\/community-memberships\/([^/]+)$/.exec(
      path,
    );
    if (request.method === "PATCH" && communityMembershipMatch) {
      const parsed = updateCommunityMembershipBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await updateMembership(
        deps.db,
        context,
        decodeURIComponent(communityMembershipMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityPostsMatch = /^\/v1\/communities\/([^/]+)\/posts$/.exec(path);
    if (communityPostsMatch && request.method === "GET") {
      const parsed = communityListQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listPosts(
        deps.db,
        adminCommunityViewer,
        communitySchool,
        decodeURIComponent(communityPostsMatch[1]!),
        parsed.data,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (communityPostsMatch && request.method === "POST") {
      const parsed = createCommunityPostBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await createPost(
        deps.db,
        adminCommunityViewer,
        communitySchool,
        decodeURIComponent(communityPostsMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const communityPostMatch = /^\/v1\/community-posts\/([^/]+)$/.exec(path);
    if (communityPostMatch && request.method === "PATCH") {
      const parsed = updateCommunityPostBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await updatePost(
        deps.db,
        adminCommunityViewer,
        communitySchool,
        decodeURIComponent(communityPostMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (communityPostMatch && request.method === "DELETE") {
      const result = await deletePost(
        deps.db,
        adminCommunityViewer,
        context.tenantId!,
        decodeURIComponent(communityPostMatch[1]!),
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityPostCommentsMatch =
      /^\/v1\/community-posts\/([^/]+)\/comments$/.exec(path);
    if (communityPostCommentsMatch && request.method === "GET") {
      const parsed = communityListQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listComments(
        deps.db,
        adminCommunityViewer,
        communitySchool,
        decodeURIComponent(communityPostCommentsMatch[1]!),
        parsed.data,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (communityPostCommentsMatch && request.method === "POST") {
      const parsed = createCommunityCommentBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await createComment(
        deps.db,
        adminCommunityViewer,
        communitySchool,
        decodeURIComponent(communityPostCommentsMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const communityCommentMatch = /^\/v1\/community-comments\/([^/]+)$/.exec(path);
    if (communityCommentMatch && request.method === "PATCH") {
      const parsed = updateCommunityCommentBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await updateComment(
        deps.db,
        adminCommunityViewer,
        context.tenantId!,
        decodeURIComponent(communityCommentMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (communityCommentMatch && request.method === "DELETE") {
      const result = await deleteComment(
        deps.db,
        adminCommunityViewer,
        context.tenantId!,
        decodeURIComponent(communityCommentMatch[1]!),
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityReactionMatch = /^\/v1\/communities\/([^/]+)\/reactions$/.exec(path);
    if (request.method === "POST" && communityReactionMatch) {
      const parsed = communityReactionBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await toggleReaction(
        deps.db,
        adminCommunityViewer,
        communitySchool,
        decodeURIComponent(communityReactionMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communitySubscriptionMatch =
      /^\/v1\/community-posts\/([^/]+)\/subscription$/.exec(path);
    if (request.method === "POST" && communitySubscriptionMatch) {
      const parsed = communitySubscriptionBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await togglePostSubscription(
        deps.db,
        adminCommunityViewer,
        communitySchool,
        decodeURIComponent(communitySubscriptionMatch[1]!),
        parsed.data.subscribed,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityReportsMatch = /^\/v1\/communities\/([^/]+)\/reports$/.exec(path);
    if (communityReportsMatch && request.method === "GET") {
      const parsed = communityStatusQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
        status: query.get("status") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listReports(
        deps.db,
        context,
        communitySchool,
        decodeURIComponent(communityReportsMatch[1]!),
        parsed.data,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (communityReportsMatch && request.method === "POST") {
      const parsed = createCommunityReportBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await createReport(
        deps.db,
        adminCommunityViewer,
        communitySchool,
        decodeURIComponent(communityReportsMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const communityReportMatch = /^\/v1\/community-reports\/([^/]+)$/.exec(path);
    if (request.method === "PATCH" && communityReportMatch) {
      const parsed = updateCommunityReportBodySchema.safeParse(request.body ?? {});
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await updateReport(
        deps.db,
        context,
        context.tenantId!,
        decodeURIComponent(communityReportMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const communityPlansMatch = /^\/v1\/communities\/([^/]+)\/plans$/.exec(path);
    if (communityPlansMatch && request.method === "GET") {
      const result = await listCommunityPlans(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(communityPlansMatch[1]!),
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    if (communityPlansMatch && request.method === "POST") {
      const parsed = createCommunityPaymentPlanBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createCommunityPlan(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(communityPlansMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const communityPlanMatch = /^\/v1\/community-plans\/([^/]+)$/.exec(path);
    if (request.method === "PATCH" && communityPlanMatch) {
      const parsed = updateCommunityPaymentPlanBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateCommunityPlan(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(communityPlanMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const communityPlanActionMatch =
      /^\/v1\/community-plans\/([^/]+)\/(default|archive)$/.exec(path);
    if (request.method === "POST" && communityPlanActionMatch) {
      const planId = decodeURIComponent(communityPlanActionMatch[1]!);
      const result =
        communityPlanActionMatch[2] === "default"
          ? await setDefaultCommunityPlan(
              deps.db,
              context,
              school.value.publicId,
              planId,
              deps.clock,
            )
          : await archiveCommunityPlan(
              deps.db,
              context,
              school.value.publicId,
              planId,
              deps.clock,
            );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    if (request.method === "GET" && path === "/v1/learners") {
      const limitValue = query.get("limit");
      const limit = limitValue === null ? 25 : Number(limitValue);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await listLearners(
        deps.db,
        {
          schoolId: context.tenantId,
          publicSchoolId: school.value.publicId,
          principalId: context.principalId,
          requestId: context.requestId,
          permissions: context.permissions,
        },
        { cursor: query.get("cursor") ?? undefined, limit },
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const learnerMatch = /^\/v1\/learners\/([^/]+)$/.exec(path);
    if (request.method === "PATCH" && learnerMatch) {
      const input = request.body as { status?: unknown } | undefined;
      if (input?.status !== "active" && input?.status !== "deactivated") {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateLearnerStatus(
        deps.db,
        {
          schoolId: context.tenantId,
          publicSchoolId: school.value.publicId,
          principalId: context.principalId,
          requestId: context.requestId,
          permissions: context.permissions,
        },
        decodeURIComponent(learnerMatch[1]!),
        input.status,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const plansMatch = /^\/v1\/products\/([^/]+)\/plans$/.exec(path);
    if (plansMatch && request.method === "GET") {
      const result = await listPlans(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(plansMatch[1]!),
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    if (plansMatch && request.method === "POST") {
      const parsed = createStorefrontPlanBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createPlan(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(plansMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const planMatch = /^\/v1\/plans\/([^/]+)$/.exec(path);
    if (request.method === "PATCH" && planMatch) {
      const parsed = updateStorefrontPlanBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updatePlan(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(planMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const planActionMatch = /^\/v1\/plans\/([^/]+)\/(default|archive)$/.exec(path);
    if (request.method === "POST" && planActionMatch) {
      const planId = decodeURIComponent(planActionMatch[1]!);
      const result =
        planActionMatch[2] === "default"
          ? await setDefaultPlan(
              deps.db,
              context,
              school.value.publicId,
              planId,
              deps.clock,
            )
          : await archivePlan(
              deps.db,
              context,
              school.value.publicId,
              planId,
              deps.clock,
            );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    if (request.method === "GET" && path === "/v1/certificate-templates") {
      const result = await listCertificateTemplates(
        deps.db,
        context,
        school.value.publicId,
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    if (request.method === "POST" && path === "/v1/certificate-templates") {
      const parsed = createCertificateTemplateBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createCertificateTemplate(
        deps.db,
        context,
        school.value.publicId,
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const certificateTemplateMatch = /^\/v1\/certificate-templates\/([^/]+)$/.exec(
      path,
    );
    if (request.method === "PATCH" && certificateTemplateMatch) {
      const parsed = updateCertificateTemplateBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateCertificateTemplate(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(certificateTemplateMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const productCertificateTemplateMatch =
      /^\/v1\/products\/([^/]+)\/certificate-template$/.exec(path);
    if (request.method === "GET" && productCertificateTemplateMatch) {
      const result = await getProductCertificateTemplate(
        deps.db,
        context,
        decodeURIComponent(productCertificateTemplateMatch[1]!),
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "PUT" && productCertificateTemplateMatch) {
      const parsed = upsertProductCertificateTemplateBodySchema.safeParse(
        request.body ?? {},
      );
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await upsertProductCertificateTemplate(
        deps.db,
        context,
        decodeURIComponent(productCertificateTemplateMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const previewCreateMatch = /^\/v1\/products\/([^/]+)\/preview$/.exec(path);
    if (request.method === "POST" && previewCreateMatch) {
      const parsed = createPreviewGrantBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createPreviewGrant(
        deps.db,
        context,
        decodeURIComponent(previewCreateMatch[1]!),
        deps.clock,
        parsed.data.ttlSeconds,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }

    const sectionsMatch = /^\/v1\/products\/([^/]+)\/sections$/.exec(path);
    if (request.method === "GET" && sectionsMatch) {
      const result = await listSections(
        deps.db,
        context,
        decodeURIComponent(sectionsMatch[1]!),
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    if (request.method === "POST" && sectionsMatch) {
      const parsed = createSectionBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createSection(
        deps.db,
        context,
        decodeURIComponent(sectionsMatch[1]!),
        {
          ...parsed.data,
          dripAt:
            parsed.data.dripAt === undefined
              ? undefined
              : parsed.data.dripAt === null
                ? null
                : new Date(parsed.data.dripAt),
        },
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const reorderSectionsMatch = /^\/v1\/products\/([^/]+)\/sections\/reorder$/.exec(
      path,
    );
    if (request.method === "POST" && reorderSectionsMatch) {
      const parsed = reorderSectionsBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await reorderSections(
        deps.db,
        context,
        decodeURIComponent(reorderSectionsMatch[1]!),
        parsed.data.sectionIds,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    const reorderLessonsMatch = /^\/v1\/products\/([^/]+)\/lessons\/reorder$/.exec(
      path,
    );
    if (request.method === "POST" && reorderLessonsMatch) {
      const parsed = reorderLessonsBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await reorderLessons(
        deps.db,
        context,
        decodeURIComponent(reorderLessonsMatch[1]!),
        parsed.data.lessonIds,
        parsed.data.sectionAssignments,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    const sectionMatch = /^\/v1\/sections\/([^/]+)$/.exec(path);
    if (request.method === "DELETE" && sectionMatch) {
      const result = await deleteSection(
        deps.db,
        context,
        decodeURIComponent(sectionMatch[1]!),
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "PATCH" && sectionMatch) {
      const parsed = updateSectionBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateSection(
        deps.db,
        context,
        decodeURIComponent(sectionMatch[1]!),
        {
          ...parsed.data,
          dripAt:
            parsed.data.dripAt === undefined
              ? undefined
              : parsed.data.dripAt === null
                ? null
                : new Date(parsed.data.dripAt),
        },
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    if (request.method === "POST" && path === "/v1/media/upload-authorizations") {
      const parsed = authorizeMediaUploadBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await authorizeMediaUpload(
        context,
        deps.mediaLit,
        deps.clock,
        parsed.data,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "POST" && path === "/v1/media") {
      const parsed = finalizeMediaUploadBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await finalizeMediaUpload(
        deps.db,
        context,
        school.value.publicId,
        deps.mediaLit,
        deps.clock,
        parsed.data,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "GET" && path === "/v1/media") {
      const limitValue = query.get("limit");
      const limit = limitValue === null ? 25 : Number(limitValue);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await listMedia(deps.db, context, school.value.publicId, {
        search: query.get("search") ?? undefined,
        cursor: query.get("cursor") ?? undefined,
        limit,
      });
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "GET" && path === "/v1/media/unsplash") {
      const parsed = searchUnsplashQuerySchema.safeParse({
        q: query.get("q") ?? undefined,
      });
      if (!parsed.success || !context.permissions.has("media:read")) {
        return errorResponse(
          createPlatformError(parsed.success ? "forbidden" : "validation_failed"),
        );
      }
      try {
        return { status: 200, body: await deps.unsplash.search(parsed.data.q) };
      } catch {
        return {
          status: 502,
          body: { code: "internal_error", message: "Unable to search Unsplash." },
        };
      }
    }
    const mediaReferencesMatch = /^\/v1\/media\/([^/]+)\/references$/.exec(path);
    if (request.method === "GET" && mediaReferencesMatch) {
      const result = await listMediaReferences(
        deps.db,
        context,
        decodeURIComponent(mediaReferencesMatch[1]!),
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    if (request.method === "PUT" && mediaReferencesMatch) {
      const parsed = reconcileMediaReferencesBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await reconcileMediaReferences(
        deps.db,
        context,
        decodeURIComponent(mediaReferencesMatch[1]!),
        parsed.data.references,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: { items: result.value } }
        : errorResponse(result.error);
    }
    const mediaMatch = /^\/v1\/media\/([^/]+)$/.exec(path);
    if (request.method === "GET" && mediaMatch) {
      const result = await getMedia(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(mediaMatch[1]!),
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "PATCH" && mediaMatch) {
      const parsed = updateMediaBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateMedia(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(mediaMatch[1]!),
        parsed.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "DELETE" && mediaMatch) {
      const result = await deleteMedia(
        deps.db,
        context,
        deps.mediaLit,
        decodeURIComponent(mediaMatch[1]!),
        deps.clock,
      );
      return result.ok ? { status: 204, body: undefined } : errorResponse(result.error);
    }

    if (request.method === "GET" && path === "/v1/school/hosts") {
      if (!context.permissions.has("school:read")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      return {
        status: 200,
        body: { items: await listSchoolHosts(deps.db, context.tenantId!) },
      };
    }

    if (request.method === "POST" && path === "/v1/school/hosts") {
      if (!context.permissions.has("school:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed = createSchoolHostBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createSchoolCustomHost(
        deps.db,
        {
          schoolId: context.tenantId!,
          actorId: context.principalId,
          hostname: parsed.data.hostname,
          requestId: context.requestId,
        },
        deps.clock,
      );
      return result.ok
        ? { status: 201, body: result.value }
        : errorResponse(result.error);
    }
    const verifyHostMatch = /^\/v1\/school\/hosts\/([^/]+)\/verify$/.exec(path);
    if (request.method === "POST" && verifyHostMatch) {
      if (!context.permissions.has("school:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const parsed = verifySchoolHostBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await verifySchoolCustomHost(
        deps.db,
        {
          schoolId: context.tenantId!,
          actorId: context.principalId,
          hostname: decodeURIComponent(verifyHostMatch[1]!),
          token: parsed.data.token,
          requestId: context.requestId,
          verify: deps.customDomainVerifier ?? verifyCustomDomainTxt,
        },
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const deleteHostMatch = /^\/v1\/school\/hosts\/([^/]+)$/.exec(path);
    if (request.method === "DELETE" && deleteHostMatch) {
      if (!context.permissions.has("school:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const result = await deleteSchoolCustomHost(
        deps.db,
        {
          schoolId: context.tenantId!,
          actorId: context.principalId,
          hostname: decodeURIComponent(deleteHostMatch[1]!),
          requestId: context.requestId,
        },
        deps.clock,
      );
      return result.ok ? { status: 204, body: undefined } : errorResponse(result.error);
    }

    if (request.method === "POST" && path === "/v1/api-keys") {
      if (!context.permissions.has("api_keys:manage")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const input = request.body as
        | {
            permissions?: unknown;
            expiresAt?: unknown;
          }
        | undefined;
      const permissions = Array.isArray(input?.permissions) ? input.permissions : [];
      const expiresAt =
        typeof input?.expiresAt === "string" ? new Date(input.expiresAt) : undefined;
      if (
        expiresAt &&
        (Number.isNaN(expiresAt.getTime()) || expiresAt <= deps.clock.now())
      ) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      if (
        !permissions.every(
          (value): value is string =>
            typeof value === "string" &&
            (COURSELIT_PERMISSIONS as readonly string[]).includes(value),
        )
      ) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const key = await createApiKeyRecord({
        db: deps.db,
        schoolId: context.tenantId!,
        userId: context.principalId,
        permissions,
        pepper: deps.apiKeyPepper,
        clock: deps.clock,
        expiresAt,
        audit: { requestId: context.requestId },
      });
      return { status: 201, body: key };
    }
    if (request.method === "GET" && path === "/v1/api-keys") {
      if (!context.permissions.has("api_keys:read")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const keys = await listApiKeyRecords(deps.db, context.tenantId!);
      return {
        status: 200,
        body: {
          items: keys.map((key) => ({
            id: key.id,
            publicId: key.publicId,
            expiresAt: key.expiresAt?.toISOString() ?? null,
            revokedAt: key.revokedAt?.toISOString() ?? null,
            lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
            createdAt: key.createdAt.toISOString(),
          })),
        },
      };
    }
    const revokeMatch = /^\/v1\/api-keys\/([^/]+)$/.exec(path);
    if (request.method === "DELETE" && revokeMatch) {
      if (!context.permissions.has("api_keys:manage")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const revoked = await revokeApiKey(
        deps.db,
        decodeURIComponent(revokeMatch[1]!),
        context.tenantId!,
        deps.clock,
        { actorId: context.principalId, requestId: context.requestId },
      );
      return revoked
        ? { status: 204, body: null }
        : errorResponse(createPlatformError("not_found"));
    }
    if (request.method === "GET" && path === "/v1/school/team") {
      const result = await listSchoolTeam(deps.db, context);
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    const teamMemberMatch = /^\/v1\/school\/team\/members\/([^/]+)$/.exec(path);
    if (request.method === "PATCH" && teamMemberMatch) {
      const input = request.body as
        | { permissions?: unknown; expectedVersion?: unknown }
        | undefined;
      const permissions = input?.permissions;
      if (
        !Array.isArray(permissions) ||
        !permissions.every(
          (value): value is CourseLitPermission =>
            typeof value === "string" &&
            (COURSELIT_PERMISSIONS as readonly string[]).includes(value),
        )
      ) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateSchoolTeamMember(
        deps.db,
        context,
        decodeURIComponent(teamMemberMatch[1]!),
        permissions,
        deps.clock,
        typeof input?.expectedVersion === "number" ? input.expectedVersion : undefined,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }
    if (request.method === "DELETE" && teamMemberMatch) {
      const result = await removeSchoolTeamMember(
        deps.db,
        context,
        decodeURIComponent(teamMemberMatch[1]!),
        deps.clock,
      );
      return result.ok ? { status: 204, body: undefined } : errorResponse(result.error);
    }
    if (request.method === "POST" && path === "/v1/school/team/leave") {
      const result = await leaveSchoolTeam(deps.db, context, deps.clock);
      return result.ok ? { status: 204, body: undefined } : errorResponse(result.error);
    }
    if (request.method === "POST" && path === "/v1/school/team/transfer-ownership") {
      const input = request.body as
        | { targetMembershipId?: unknown; targetMemberId?: unknown; postTransferPermissions?: unknown }
        | undefined;
      const targetId = input?.targetMemberId ?? input?.targetMembershipId;
      if (typeof targetId !== "string") {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const postPerms = Array.isArray(input?.postTransferPermissions)
        ? (input.postTransferPermissions as CourseLitPermission[])
        : [];
      const result = await transferSchoolOwnership(
        deps.db,
        context,
        targetId,
        deps.clock,
        postPerms,
      );
      return result.ok ? { status: 200, body: { ok: true } } : errorResponse(result.error);
    }
    const resendInvitationMatch =
      /^\/v1\/school\/team\/invitations\/([^/]+)\/resend$/.exec(path);
    if (request.method === "POST" && resendInvitationMatch) {
      const result = await resendInvitation(
        deps.db,
        context,
        decodeURIComponent(resendInvitationMatch[1]!),
        deps.clock,
      );
      return result.ok ? { status: 200, body: result } : errorResponse(result.error);
    }
    const teamInvitationMatch =
      /^\/v1\/school\/team\/invitations\/([^/]+)$/.exec(path);
    if (request.method === "DELETE" && teamInvitationMatch) {
      const result = await revokeInvitation(
        deps.db,
        context,
        decodeURIComponent(teamInvitationMatch[1]!),
        deps.clock,
      );
      return result.ok ? { status: 204, body: null } : errorResponse(result.error);
    }
    if (
      request.method === "POST" &&
      (path === "/v1/invitations" || path === "/v1/school/team/invitations")
    ) {
      const input = request.body as
        | {
            email?: unknown;
            permissions?: unknown;
            presetId?: unknown;
          }
        | undefined;
      const permissions = Array.isArray(input?.permissions) ? input.permissions : [];
      if (
        typeof input?.email !== "string" ||
        !permissions.every(
          (value): value is CourseLitPermission =>
            typeof value === "string" &&
            (COURSELIT_PERMISSIONS as readonly string[]).includes(value),
        )
      ) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createInvitation(
        deps.db,
        context,
        {
          email: input.email,
          permissions,
          presetId: typeof input.presetId === "string" ? input.presetId : undefined,
        },
        deps.clock,
      );
      if (result.ok) {
        const acceptUrl = new URL(
          `/team-invitations/${encodeURIComponent(result.id)}`,
          deps.auth.webOrigin,
        );
        acceptUrl.hash = `token=${encodeURIComponent(result.token)}`;
        const [schoolRow] = await deps.db
          .select({ name: schema.schools.name })
          .from(schema.schools)
          .where(eq(schema.schools.id, context.tenantId!))
          .limit(1);
        const [inviterRow] = await deps.db
          .select({ name: schema.user.name })
          .from(schema.user)
          .where(eq(schema.user.id, context.principalId))
          .limit(1);
        void sendTeamInvitationEmail({
          email: input.email.trim().toLowerCase(),
          acceptUrl: acceptUrl.toString(),
          schoolName: schoolRow?.name ?? "your CourseLit school",
          inviterName: inviterRow?.name ?? null,
          expiresAt: result.expiresAt,
        }).catch((error) => {
          deps.observability?.captureException({
            error,
            source: "team.invitation.email",
          });
        });
      }
      return result.ok ? { status: 201, body: result } : errorResponse(result.error);
    }
    const invitationMatch = /^\/v1\/invitations\/([^/]+)$/.exec(path);
    if (request.method === "DELETE" && invitationMatch) {
      const result = await revokeInvitation(
        deps.db,
        context,
        decodeURIComponent(invitationMatch[1]!),
        deps.clock,
      );
      return result.ok ? { status: 204, body: null } : errorResponse(result.error);
    }

    const salesPageMatch = /^\/v1\/sales-pages\/(product|community)\/([^/]+)$/.exec(
      path,
    );
    if (request.method === "GET" && salesPageMatch) {
      if (!context.permissions.has("storefront:read")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const salesPage = await getSalesPage(
        deps.db,
        context.tenantId!,
        salesPageMatch[1] as "product" | "community",
        decodeURIComponent(salesPageMatch[2]!),
      );
      return salesPage
        ? { status: 200, body: salesPage }
        : errorResponse(createPlatformError("not_found"));
    }

    if (request.method === "GET" && path === "/v1/products") {
      const parsed = listProductsQuerySchema.safeParse({
        cursor: query.get("cursor") ?? undefined,
        limit: query.get("limit") ?? undefined,
        kind: query.get("kind") ?? undefined,
      });
      if (!parsed.success)
        return errorResponse(createPlatformError("validation_failed"));
      const result = await listProducts(
        deps.db,
        context,
        school.value.publicId,
        parsed.data,
      );
      if (!result.ok) return errorResponse(result.error);
      return {
        status: 200,
        body: { items: result.value, nextCursor: result.nextCursor },
      };
    }

    if (request.method === "POST" && path === "/v1/products") {
      const parsed = createProductBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createProduct(
        deps.db,
        context,
        school.value.publicId,
        parsed.data,
        deps.clock,
      );
      if (!result.ok) return errorResponse(result.error);
      return { status: 201, body: result.value };
    }

    const productAnalyticsMatch = /^\/v1\/products\/([^/]+)\/analytics$/.exec(path);
    if (request.method === "GET" && productAnalyticsMatch) {
      const parsedRange = productAnalyticsRangeSchema.safeParse(
        query.get("range") ?? "7d",
      );
      if (!parsedRange.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await getProductAnalytics(
        deps.db,
        context,
        decodeURIComponent(productAnalyticsMatch[1]!),
        parsedRange.data,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: result.value }
        : errorResponse(result.error);
    }

    const noteMatch = /^\/v1\/products\/([^/]+)$/.exec(path);
    if (request.method === "PATCH" && noteMatch) {
      const parsed = updateProductBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateProduct(
        deps.db,
        context,
        school.value.publicId,
        decodeURIComponent(noteMatch[1]!),
        parsed.data,
        deps.clock,
      );
      if (!result.ok) return errorResponse(result.error);
      return { status: 200, body: result.value };
    }
    if (request.method === "DELETE" && noteMatch) {
      const result = await deleteProduct(
        deps.db,
        context,
        decodeURIComponent(noteMatch[1]!),
        deps.clock,
      );
      if (!result.ok) return errorResponse(result.error);
      return { status: 200, body: result.value };
    }

    const createLessonMatch = /^\/v1\/products\/([^/]+)\/lessons$/.exec(path);
    if (request.method === "POST" && createLessonMatch) {
      const parsed = createLessonBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await createLesson(
        deps.db,
        context,
        decodeURIComponent(createLessonMatch[1]!),
        {
          ...parsed.data,
          dripAt:
            parsed.data.dripAt === undefined
              ? undefined
              : parsed.data.dripAt === null
                ? null
                : new Date(parsed.data.dripAt),
        },
        deps.clock,
      );
      if (!result.ok) return errorResponse(result.error);
      return { status: 201, body: result.value };
    }
    const processScormMatch = /^\/v1\/lessons\/([^/]+)\/scorm\/process$/.exec(path);
    if (request.method === "POST" && processScormMatch) {
      const parsed = processScormPackageBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await processScormPackage(
        deps.db,
        context,
        decodeURIComponent(processScormMatch[1]!),
        parsed.data.mediaId,
        deps.mediaLit,
        deps.clock,
      );
      return result.ok
        ? { status: 200, body: { success: true, packageInfo: result.value } }
        : errorResponse(result.error);
    }
    const lessonMatch = /^\/v1\/lessons\/([^/]+)$/.exec(path);
    if (request.method === "DELETE" && lessonMatch) {
      const result = await deleteLesson(
        deps.db,
        context,
        decodeURIComponent(lessonMatch[1]!),
        deps.clock,
      );
      if (!result.ok) return errorResponse(result.error);
      return { status: 200, body: result.value };
    }
    if (request.method === "PATCH" && lessonMatch) {
      const parsed = updateLessonBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await updateLesson(
        deps.db,
        context,
        decodeURIComponent(lessonMatch[1]!),
        {
          ...parsed.data,
          dripAt:
            parsed.data.dripAt === undefined
              ? undefined
              : parsed.data.dripAt === null
                ? null
                : new Date(parsed.data.dripAt),
        },
        deps.clock,
      );
      if (!result.ok) return errorResponse(result.error);
      return { status: 200, body: result.value };
    }
    if (request.method === "POST" && path === "/v1/memberships") {
      if (!context.permissions.has("learners:write")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const input = request.body as
        | { productId?: unknown; email?: unknown; name?: unknown }
        | undefined;
      if (typeof input?.productId !== "string" || typeof input.email !== "string") {
        return errorResponse(createPlatformError("validation_failed"));
      }
      const result = await grantLearnerMembership(
        deps.db,
        {
          schoolId: context.tenantId!,
          publicSchoolId: school.value.publicId,
          actorId: context.principalId,
          productPublicId: input.productId,
          email: input.email,
          name: typeof input.name === "string" ? input.name : "Learner",
          requestId: context.requestId,
        },
        deps.clock,
      );
      if (!result.ok) return errorResponse(result.error);
      return { status: 201, body: result.value };
    }

    if (request.method === "GET" && path === "/v1/billing/entitlement") {
      if (!context.permissions.has("billing:read")) {
        return errorResponse(createPlatformError("forbidden"));
      }
      const state = await deps.billing.billing.commercialState(context.tenantId!);
      return {
        status: 200,
        body: {
          schoolId: school.value.publicId,
          activePaidPlan: state.activePaidPlan,
          entitled: state.activePaidPlan !== null,
          subscriptionStatus: state.subscriptionStatus,
        },
      };
    }

    return errorResponse(createPlatformError("not_found"));
  } catch (thrown) {
    return errorResponse(
      captureAndMapException(thrown, (error) =>
        deps.observability?.captureException({
          error,
          source: "http.dispatch",
          context: {
            method: request.method,
            path: request.path,
            school_id: headerSchoolId(request.headers) ?? undefined,
            request_id:
              typeof request.headers["x-request-id"] === "string"
                ? request.headers["x-request-id"]
                : undefined,
          },
        }),
      ),
    );
  }
}
