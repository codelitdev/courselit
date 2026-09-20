import type { CourseLitPermission } from "@courselit/api-contract";

export type Audience = "school" | "account" | "system" | "public" | "learner";

export type CredentialKind = "session" | "oauth" | "api_key";

export type TeamOperationPolicy = {
  audience: "school";
  requiredPermissions?: readonly CourseLitPermission[];
  requireAll?: boolean;
  ownerOnly?: boolean;
  allowedCredentials: readonly CredentialKind[];
  recentAuthentication?: boolean;
};

export type AccountOperationPolicy = {
  audience: "account";
  allowedCredentials: readonly ("session" | "oauth")[];
  recentAuthentication?: boolean;
};

export type SystemOperationPolicy = {
  audience: "system";
  allowedCallers: readonly ("worker" | "webhook")[];
};

export type PublicOperationPolicy = {
  audience: "public";
};

export type LearnerOperationPolicy = {
  audience: "learner";
};

export type OperationPolicy =
  | TeamOperationPolicy
  | AccountOperationPolicy
  | SystemOperationPolicy
  | PublicOperationPolicy
  | LearnerOperationPolicy;

function schoolOp(
  requiredPermissions: readonly CourseLitPermission[],
  allowedCredentials: readonly CredentialKind[] = ["session", "oauth", "api_key"],
): TeamOperationPolicy {
  return {
    audience: "school",
    requiredPermissions,
    allowedCredentials,
  };
}

function schoolOwnerOp(
  allowedCredentials: readonly CredentialKind[] = ["session"],
  recentAuthentication = false,
): TeamOperationPolicy {
  return {
    audience: "school",
    ownerOnly: true,
    allowedCredentials,
    recentAuthentication,
  };
}

function schoolSessionOp(
  requiredPermissions: readonly CourseLitPermission[],
  recentAuthentication = false,
): TeamOperationPolicy {
  return {
    audience: "school",
    requiredPermissions,
    allowedCredentials: ["session"],
    recentAuthentication,
  };
}

function accountOp(
  allowedCredentials: readonly ("session" | "oauth")[] = ["session", "oauth"],
  recentAuthentication = false,
): AccountOperationPolicy {
  return {
    audience: "account",
    allowedCredentials,
    recentAuthentication,
  };
}

function systemOp(
  allowedCallers: readonly ("worker" | "webhook")[] = ["webhook"],
): SystemOperationPolicy {
  return {
    audience: "system",
    allowedCallers,
  };
}

function publicOp(): PublicOperationPolicy {
  return { audience: "public" };
}

function learnerOp(): LearnerOperationPolicy {
  return { audience: "learner" };
}

export const OPERATION_POLICIES = {
  // Service health
  health: publicOp(),
  ready: publicOp(),

  // Account & tenant selection
  listSchools: accountOp(["session", "oauth"]),
  createSchool: accountOp(["session"]),
  selectSchool: accountOp(["session"]),
  getEntitlement: accountOp(["session", "oauth"]),
  getBillingCatalog: accountOp(["session", "oauth"]),
  createCheckoutSession: accountOp(["session"]),
  getCheckoutSession: accountOp(["session", "oauth"]),
  previewTeamInvitation: accountOp(["session"]),
  acceptTeamInvitation: accountOp(["session"]),
  rejectTeamInvitation: accountOp(["session"]),
  acceptInvitation: accountOp(["session"]),

  // Webhooks
  stripeWebhook: systemOp(["webhook"]),
  razorpayWebhook: systemOp(["webhook"]),
  lemonSqueezyWebhook: systemOp(["webhook"]),

  // Team lifecycle (browser session only)
  listSchoolTeam: schoolSessionOp(["members:read"]),
  createSchoolTeamInvitation: schoolSessionOp(["members:invite"]),
  resendSchoolTeamInvitation: schoolSessionOp(["members:invite"]),
  revokeSchoolTeamInvitation: schoolSessionOp(["members:manage"]),
  updateSchoolTeamMember: schoolSessionOp(["members:manage"]),
  removeSchoolTeamMember: schoolSessionOp(["members:manage"]),
  leaveSchoolTeam: schoolSessionOp([]),
  transferSchoolOwnership: schoolOwnerOp(["session"], true),
  createInvitation: schoolSessionOp(["members:invite"]),
  revokeInvitation: schoolSessionOp(["members:manage"]),

  // School configuration
  getSchoolOverview: schoolOp(["school:read"]),
  updateSchool: schoolOp(["school:write"]),
  getSchoolCodeInjection: schoolOp(["school:read"]),
  updateSchoolCodeInjection: schoolOp(["school:write"]),
  getSchoolPaymentSettings: schoolOp(["commerce:manage"]),
  updateSchoolPaymentSettings: schoolOp(["commerce:manage"]),
  listSchoolHosts: schoolOp(["school:read"]),
  createSchoolHost: schoolOp(["school:write"]),
  deleteSchoolHost: schoolOp(["school:write"]),
  verifySchoolHost: schoolOp(["school:write"]),

  // Products & curriculum
  listProducts: schoolOp(["products:read"]),
  createProduct: schoolOp(["products:write"]),
  getProduct: schoolOp(["products:read"]),
  updateProduct: schoolOp(["products:write"]),
  deleteProduct: schoolOp(["products:delete"]),
  getProductAnalytics: schoolOp(["analytics:read"]),
  listSections: schoolOp(["products:read"]),
  createSection: schoolOp(["products:write"]),
  updateSection: schoolOp(["products:write"]),
  deleteSection: schoolOp(["products:write"]),
  reorderSections: schoolOp(["products:write"]),
  createLesson: schoolOp(["products:write"]),
  updateLesson: schoolOp(["products:write"]),
  deleteLesson: schoolOp(["products:write"]),
  reorderLessons: schoolOp(["products:write"]),
  processScormPackage: schoolOp(["products:write"]),
  listPlans: schoolOp(["products:read"]),
  createPlan: schoolOp(["products:write"]),
  updatePlan: schoolOp(["products:write"]),
  archivePlan: schoolOp(["products:write"]),
  setDefaultPlan: schoolOp(["products:write"]),
  listPreviewDiscussionComments: schoolOp(["products:read"]),
  listPreviewDiscussionReplies: schoolOp(["products:read"]),
  listPreviewDiscussionSummaries: schoolOp(["products:read"]),
  readPreviewProduct: schoolOp(["products:read"]),
  getPreviewLessonMedia: schoolOp(["products:read"]),
  createPreviewGrant: schoolOp(["products:write"]),
  listDiscussionReports: schoolOp(["communities:moderate"]),
  updateDiscussionReport: schoolOp(["communities:moderate"]),

  // Learners admin
  listLearners: schoolOp(["learners:read"]),
  grantLearnerMembership: schoolOp(["learners:write"]),
  updateLearner: schoolOp(["learners:write"]),
  createLearnerMembership: schoolOp(["learners:write"]),
  createLearnerIdentityLink: schoolOp(["learners:write"]),

  // Community admin
  listCommunities: schoolOp(["communities:read"]),
  createCommunity: schoolOp(["communities:write"]),
  getCommunity: schoolOp(["communities:read"]),
  updateCommunity: schoolOp(["communities:write"]),
  deleteCommunity: schoolOp(["communities:write"]),
  listCommunityMembers: schoolOp(["communities:read"]),
  updateCommunityMembership: schoolOp(["communities:write"]),
  addCommunityCategory: schoolOp(["communities:write"]),
  deleteCommunityCategory: schoolOp(["communities:write"]),
  listCommunityPosts: schoolOp(["communities:read"]),
  createCommunityPost: schoolOp(["communities:write"]),
  updateCommunityPost: schoolOp(["communities:write"]),
  deleteCommunityPost: schoolOp(["communities:moderate"]),
  listCommunityComments: schoolOp(["communities:read"]),
  createCommunityComment: schoolOp(["communities:write"]),
  updateCommunityComment: schoolOp(["communities:write"]),
  deleteCommunityComment: schoolOp(["communities:moderate"]),
  toggleCommunityReaction: schoolOp(["communities:write"]),
  toggleCommunityPostSubscription: schoolOp(["communities:write"]),
  listCommunityReports: schoolOp(["communities:moderate"]),
  createCommunityReport: schoolOp(["communities:moderate"]),
  updateCommunityReport: schoolOp(["communities:moderate"]),
  listCommunityPlans: schoolOp(["communities:read"]),
  createCommunityPlan: schoolOp(["communities:write"]),
  updateCommunityPlan: schoolOp(["communities:write"]),
  archiveCommunityPlan: schoolOp(["communities:write"]),
  setDefaultCommunityPlan: schoolOp(["communities:write"]),
  listSpaces: schoolOp(["communities:read"]),
  createSpace: schoolOp(["communities:write"]),
  getSpace: schoolOp(["communities:read"]),
  updateSpace: schoolOp(["communities:write"]),
  orderSpaces: schoolOp(["communities:write"]),
  deleteSpace: schoolOp(["communities:write"]),

  // Storefront & Website admin
  getSalesPage: schoolOp(["storefront:read"]),
  listSchoolWebsitePages: schoolOp(["storefront:read"]),
  createSchoolWebsitePage: schoolOp(["storefront:write"]),
  getSchoolWebsitePage: schoolOp(["storefront:read"]),
  updateSchoolWebsitePage: schoolOp(["storefront:write"]),
  publishSchoolWebsitePage: schoolOp(["storefront:publish"]),
  discardSchoolWebsitePage: schoolOp(["storefront:write"]),
  listSchoolWebsiteBlogs: schoolOp(["storefront:read"]),
  createSchoolWebsiteBlog: schoolOp(["storefront:write"]),
  getSchoolWebsiteBlog: schoolOp(["storefront:read"]),
  updateSchoolWebsiteBlog: schoolOp(["storefront:write"]),
  publishSchoolWebsiteBlog: schoolOp(["storefront:publish"]),
  discardSchoolWebsiteBlog: schoolOp(["storefront:write"]),
  getSchoolWebsiteBranding: schoolOp(["storefront:read"]),
  updateSchoolWebsiteBranding: schoolOp(["storefront:write"]),
  listSchoolWebsiteBrandingThemes: schoolOp(["storefront:read"]),
  createSchoolWebsiteBrandingTheme: schoolOp(["storefront:write"]),
  updateSchoolWebsiteBrandingTheme: schoolOp(["storefront:write"]),

  // Media admin
  listMedia: schoolOp(["media:read"]),
  getMedia: schoolOp(["media:read"]),
  updateMedia: schoolOp(["media:write"]),
  deleteMedia: schoolOp(["media:delete"]),
  authorizeMediaUpload: schoolOp(["media:write"]),
  finalizeMediaUpload: schoolOp(["media:write"]),
  listMediaReferences: schoolOp(["media:read"]),
  reconcileMediaReferences: schoolOp(["media:write"]),
  searchUnsplash: schoolOp(["media:read"]),

  // Certificates admin
  listCertificateTemplates: schoolOp(["certificates:read"]),
  createCertificateTemplate: schoolOp(["certificates:write"]),
  updateCertificateTemplate: schoolOp(["certificates:write"]),
  getProductCertificateTemplate: schoolOp(["certificates:read"]),
  upsertProductCertificateTemplate: schoolOp(["certificates:write"]),

  // API access management (browser session only)
  listApiKeys: schoolSessionOp(["api_keys:read"]),
  createApiKey: schoolSessionOp(["api_keys:manage"]),
  revokeApiKey: schoolSessionOp(["api_keys:manage"]),

  // Admin notifications
  listAdminNotifications: schoolSessionOp(["members:read"]),
  markAdminNotificationRead: schoolSessionOp(["members:read"]),
  markAllAdminNotificationsRead: schoolSessionOp(["members:read"]),

  // Public catalog & storefront
  listPublicProducts: publicOp(),
  listPublicCommunities: publicOp(),
  getPublicCommunity: publicOp(),
  listPublicPlans: publicOp(),
  listPublicCommunityPlans: publicOp(),
  getPublicSiteSettings: publicOp(),
  getPublicSitePage: publicOp(),
  listPublicSiteBlogs: publicOp(),
  getPublicSiteBlog: publicOp(),
  verifyCertificate: publicOp(),

  // Learner portal application endpoints
  learnerSignUp: learnerOp(),
  learnerSignIn: learnerOp(),
  learnerSignOut: learnerOp(),
  learnerMe: learnerOp(),
  learnerCheckout: learnerOp(),
  startLearnerCheckoutSession: learnerOp(),
  getLearnerCheckout: learnerOp(),
  listLearnerProducts: learnerOp(),
  listLearnerProgress: learnerOp(),
  learnerCompleteLesson: learnerOp(),
  learnerCreateDownloadLink: learnerOp(),
  getLearnerLessonMedia: learnerOp(),
  evaluateLearnerQuiz: learnerOp(),
  getLearnerScormRuntime: learnerOp(),
  updateLearnerScormRuntime: learnerOp(),
  listLearnerCertificates: learnerOp(),
  updateLearnerProfile: learnerOp(),
  authorizeLearnerAvatarMediaUpload: learnerOp(),
  finalizeLearnerAvatarMediaUpload: learnerOp(),
  listLearnerCommunities: learnerOp(),
  listLearnerFeed: learnerOp(),
  listAvailableLearnerCommunities: learnerOp(),
  getLearnerCommunity: learnerOp(),
  joinLearnerCommunity: learnerOp(),
  leaveLearnerCommunity: learnerOp(),
  listLearnerCommunityPlans: learnerOp(),
  startLearnerCommunityCheckout: learnerOp(),
  getLearnerCommunityCheckout: learnerOp(),
  listLearnerCommunityPosts: learnerOp(),
  createLearnerCommunityPost: learnerOp(),
  getLearnerCommunityPost: learnerOp(),
  listLearnerCommunityComments: learnerOp(),
  createLearnerCommunityComment: learnerOp(),
  updateLearnerCommunityComment: learnerOp(),
  deleteLearnerCommunityComment: learnerOp(),
  toggleLearnerCommunityReaction: learnerOp(),
  toggleLearnerCommunityPostSubscription: learnerOp(),
  createLearnerCommunityReport: learnerOp(),
  listLearnerCommunityMedia: learnerOp(),
  authorizeLearnerCommunityMediaUpload: learnerOp(),
  finalizeLearnerCommunityMediaUpload: learnerOp(),
  listLearnerDiscussionSummaries: learnerOp(),
  listLearnerDiscussionComments: learnerOp(),
  createLearnerDiscussionComment: learnerOp(),
  updateLearnerDiscussionComment: learnerOp(),
  deleteLearnerDiscussionComment: learnerOp(),
  listLearnerDiscussionReplies: learnerOp(),
  createLearnerDiscussionReply: learnerOp(),
  updateLearnerDiscussionReply: learnerOp(),
  deleteLearnerDiscussionReply: learnerOp(),
  toggleLearnerDiscussionLike: learnerOp(),
  toggleLearnerDiscussionSubscription: learnerOp(),
  createLearnerDiscussionReport: learnerOp(),
  listLearnerNotifications: learnerOp(),
  markLearnerNotificationRead: learnerOp(),
  markAllLearnerNotificationsRead: learnerOp(),
  listLearnerNotificationPreferences: learnerOp(),
  updateLearnerNotificationPreference: learnerOp(),
  listLearnerSpaces: learnerOp(),
  followLearnerSpace: learnerOp(),
  unfollowLearnerSpace: learnerOp(),
  createLearnerSpacePost: learnerOp(),
  getLearnerSpacePost: learnerOp(),
} as const satisfies Record<string, OperationPolicy>;

export type OperationId = keyof typeof OPERATION_POLICIES;

export function getOperationPolicy(operationId: string): OperationPolicy | null {
  return (OPERATION_POLICIES as Record<string, OperationPolicy>)[operationId] ?? null;
}
