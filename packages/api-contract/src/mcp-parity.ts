const communityParityExemptions = [
  ["listCommunities", "communities.list"],
  ["createCommunity", "communities.create"],
  ["getCommunity", "communities.get"],
  ["getSalesPage", "school.frontlit.salesPages.get"],
  ["updateCommunity", "communities.update"],
  ["addCommunityCategory", "communities.categories.add"],
  ["deleteCommunityCategory", "communities.categories.delete"],
  ["deleteCommunity", "communities.delete"],
  ["listCommunityMembers", "communities.members.list"],
  ["updateCommunityMembership", "communities.members.update"],
  ["listCommunityPosts", "communities.posts.list"],
  ["createCommunityPost", "communities.posts.create"],
  ["updateCommunityPost", "communities.posts.update"],
  ["deleteCommunityPost", "communities.posts.delete"],
  ["listCommunityComments", "communities.comments.list"],
  ["createCommunityComment", "communities.comments.create"],
  ["updateCommunityComment", "communities.comments.update"],
  ["deleteCommunityComment", "communities.comments.delete"],
  ["toggleCommunityReaction", "communities.reactions.toggle"],
  ["toggleCommunityPostSubscription", "communities.subscriptions.toggle"],
  ["createCommunityReport", "communities.reports.create"],
  ["listCommunityReports", "communities.reports.list"],
  ["updateCommunityReport", "communities.reports.update"],
  ["listLearnerCommunities", "learner.communities.list"],
  ["listLearnerFeed", "learner.communities.feed.list"],
  ["listAvailableLearnerCommunities", "learner.communities.available.list"],
  ["getLearnerCommunity", "learner.communities.get"],
  ["listLearnerCommunityPosts", "learner.communities.posts.list"],
  ["createLearnerCommunityPost", "learner.communities.posts.create"],
  ["getLearnerCommunityPost", "learner.communities.posts.get"],
  ["listLearnerCommunityComments", "learner.communities.comments.list"],
  ["createLearnerCommunityComment", "learner.communities.comments.create"],
  ["updateLearnerCommunityComment", "learner.communities.comments.update"],
  ["deleteLearnerCommunityComment", "learner.communities.comments.delete"],
  ["toggleLearnerCommunityReaction", "learner.communities.reactions.toggle"],
  [
    "toggleLearnerCommunityPostSubscription",
    "learner.communities.subscriptions.toggle",
  ],
  ["createLearnerCommunityReport", "learner.communities.reports.create"],
  ["listLearnerNotifications", "learner.notifications.list"],
  ["listLearnerNotificationPreferences", "learner.notifications.preferences.list"],
  ["updateLearnerNotificationPreference", "learner.notifications.preferences.update"],
  ["markLearnerNotificationRead", "learner.notifications.read"],
  ["markAllLearnerNotificationsRead", "learner.notifications.readAll"],
  ["listCommunityPlans", "communities.plans.list"],
  ["createCommunityPlan", "communities.plans.create"],
  ["updateCommunityPlan", "communities.plans.update"],
  ["setDefaultCommunityPlan", "communities.plans.default"],
  ["archiveCommunityPlan", "communities.plans.archive"],
  ["listLearnerProducts", "learner.products.list"],
  ["joinLearnerCommunity", "learner.communities.join"],
  ["leaveLearnerCommunity", "learner.communities.leave"],
  ["listLearnerCommunityPlans", "learner.communities.plans.list"],
  ["startLearnerCommunityCheckout", "learner.communities.checkout.start"],
  ["getLearnerCommunityCheckout", "learner.communities.checkout.get"],
  ["listDiscussionReports", "products.discussions.reports.list"],
  ["updateDiscussionReport", "products.discussions.reports.update"],
  ["listLearnerDiscussionComments", "learner.discussions.comments.list"],
  ["createLearnerDiscussionComment", "learner.discussions.comments.create"],
  ["updateLearnerDiscussionComment", "learner.discussions.comments.update"],
  ["deleteLearnerDiscussionComment", "learner.discussions.comments.delete"],
  ["listLearnerDiscussionReplies", "learner.discussions.replies.list"],
  ["createLearnerDiscussionReply", "learner.discussions.replies.create"],
  ["updateLearnerDiscussionReply", "learner.discussions.replies.update"],
  ["deleteLearnerDiscussionReply", "learner.discussions.replies.delete"],
  ["toggleLearnerDiscussionLike", "learner.discussions.likes.toggle"],
  ["toggleLearnerDiscussionSubscription", "learner.discussions.subscriptions.toggle"],
  ["createLearnerDiscussionReport", "learner.discussions.reports.create"],
  ["listLearnerDiscussionSummaries", "learner.discussions.summaries.list"],
  ["listPreviewDiscussionComments", "preview.discussions.comments.list"],
  ["listPreviewDiscussionSummaries", "preview.discussions.summaries.list"],
  ["listPreviewDiscussionReplies", "preview.discussions.replies.list"],
  ["getPublicSiteSettings", "public.site.settings.get"],
  ["getPublicSitePage", "public.site.pages.get"],
  ["listPublicSiteBlogs", "public.site.blogs.list"],
  ["getPublicSiteBlog", "public.site.blogs.get"],
] as const;

export const mcpParityManifest = [
  ...communityParityExemptions.map(([operationId, capability]) => ({
    capability,
    rest: { operationId },
    parity: "exempt" as const,
    exemption: {
      reason:
        "Community administration and learner discussion flows are browser surfaces and are not exposed as MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  })),
  {
    capability: "learner.lessonMedia.get",
    rest: { operationId: "getLearnerLessonMedia" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner binary delivery is an access-filtered browser/media transport and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.communityMedia.uploadAuthorization",
    rest: { operationId: "authorizeLearnerCommunityMediaUpload" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner community binary upload authorization is a browser/provider transport and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.communityMedia.uploadFinalize",
    rest: { operationId: "finalizeLearnerCommunityMediaUpload" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner community binary upload finalization is a browser/provider transport and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.communityMedia.list",
    rest: { operationId: "listLearnerCommunityMedia" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner community media reuse is a browser/provider picker surface and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "public.products.list",
    rest: { operationId: "listPublicProducts" },
    parity: "exempt",
    exemption: {
      reason:
        "The public product catalog is a learner-site/browser surface and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "public.communities.list",
    rest: { operationId: "listPublicCommunities" },
    parity: "exempt",
    exemption: {
      reason:
        "The public community catalog is a learner-site/browser surface and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "public.communities.get",
    rest: { operationId: "getPublicCommunity" },
    parity: "exempt",
    exemption: {
      reason:
        "The public community detail page is a learner-site/browser surface and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "public.communities.plans.list",
    rest: { operationId: "listPublicCommunityPlans" },
    parity: "exempt",
    exemption: {
      reason:
        "Public community access-plan discovery is a learner-site/browser surface and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "public.media.unsplash.search",
    rest: { operationId: "searchUnsplash" },
    parity: "exempt",
    exemption: {
      reason:
        "Unsplash search is a media-picker/provider transport and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.download.createLink",
    rest: { operationId: "learnerCreateDownloadLink" },
    parity: "exempt",
    exemption: {
      reason:
        "Download-link creation is a learner browser flow whose resulting binary archive is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "preview.lessonMedia.get",
    rest: { operationId: "getPreviewLessonMedia" },
    parity: "exempt",
    exemption: {
      reason:
        "Preview binary delivery is an access-filtered browser/media transport and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.scormRuntime.get",
    rest: { operationId: "getLearnerScormRuntime" },
    parity: "exempt",
    exemption: {
      reason:
        "SCORM runtime state is a learner browser protocol and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.scormRuntime.update",
    rest: { operationId: "updateLearnerScormRuntime" },
    parity: "exempt",
    exemption: {
      reason:
        "SCORM runtime state is a learner browser protocol and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "products.scorm.process",
    rest: { operationId: "processScormPackage" },
    parity: "exempt",
    exemption: {
      reason:
        "SCORM package processing is an admin upload workflow and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.quiz.evaluate",
    rest: { operationId: "evaluateLearnerQuiz" },
    parity: "exempt",
    exemption: {
      reason:
        "Quiz evaluation is a learner browser interaction and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "products.list",
    risk: "read",
    rest: { operationId: "listProducts" },
    mcp: { tool: "products.list" },
    parity: "required",
  },
  {
    capability: "products.get",
    risk: "read",
    rest: { operationId: "getProduct" },
    mcp: { tool: "products.get" },
    parity: "required",
  },
  {
    capability: "products.analytics",
    rest: { operationId: "getProductAnalytics" },
    parity: "exempt",
    exemption: {
      reason:
        "Product analytics is an admin dashboard read model and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.pages.list",
    rest: { operationId: "listSchoolFrontLitPages" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit page listing is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.pages.create",
    rest: { operationId: "createSchoolFrontLitPage" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit page creation is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.pages.get",
    rest: { operationId: "getSchoolFrontLitPage" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit page editing is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.pages.update",
    rest: { operationId: "updateSchoolFrontLitPage" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit page editing is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.pages.publish",
    rest: { operationId: "publishSchoolFrontLitPage" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit page publishing is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.pages.discard",
    rest: { operationId: "discardSchoolFrontLitPage" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit page draft management is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.settings.get",
    rest: { operationId: "getSchoolFrontLitSettings" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit site-theme settings are an admin browser integration surface and are not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.settings.update",
    rest: { operationId: "updateSchoolFrontLitSettings" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit site-theme settings are an admin browser integration surface and are not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.themes.list",
    rest: { operationId: "listSchoolFrontLitThemes" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit theme management is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.themes.create",
    rest: { operationId: "createSchoolFrontLitTheme" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit theme management is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.themes.update",
    rest: { operationId: "updateSchoolFrontLitTheme" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit theme management is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.blogs.list",
    rest: { operationId: "listSchoolFrontLitBlogs" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit blog listing is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.blogs.create",
    rest: { operationId: "createSchoolFrontLitBlog" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit blog creation is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.blogs.get",
    rest: { operationId: "getSchoolFrontLitBlog" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit blog editing is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.blogs.update",
    rest: { operationId: "updateSchoolFrontLitBlog" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit blog editing is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.blogs.publish",
    rest: { operationId: "publishSchoolFrontLitBlog" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit blog publishing is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.frontlit.blogs.discard",
    rest: { operationId: "discardSchoolFrontLitBlog" },
    parity: "exempt",
    exemption: {
      reason:
        "FrontLit blog draft management is an admin browser integration surface and is not exposed as a CourseLit MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "products.create",
    risk: "write",
    rest: { operationId: "createProduct" },
    mcp: { tool: "products.create" },
    parity: "required",
  },
  {
    capability: "products.update",
    risk: "write",
    rest: { operationId: "updateProduct" },
    mcp: { tool: "products.update" },
    parity: "required",
  },
  {
    capability: "products.delete",
    risk: "destructive",
    rest: { operationId: "deleteProduct" },
    mcp: { tool: "products.delete" },
    parity: "required",
  },
  {
    capability: "media.list",
    risk: "read",
    rest: { operationId: "listMedia" },
    mcp: { tool: "media.list" },
    parity: "required",
  },
  {
    capability: "media.get",
    risk: "read",
    rest: { operationId: "getMedia" },
    mcp: { tool: "media.get" },
    parity: "required",
  },
  {
    capability: "media.update",
    risk: "write",
    rest: { operationId: "updateMedia" },
    mcp: { tool: "media.update" },
    parity: "required",
  },
  {
    capability: "media.references.list",
    risk: "read",
    rest: { operationId: "listMediaReferences" },
    mcp: { tool: "media.references.list" },
    parity: "required",
  },
  {
    capability: "media.references.reconcile",
    risk: "write",
    rest: { operationId: "reconcileMediaReferences" },
    mcp: { tool: "media.references.reconcile" },
    parity: "required",
  },
  {
    capability: "media.delete",
    risk: "destructive",
    rest: { operationId: "deleteMedia" },
    mcp: { tool: "media.delete" },
    parity: "required",
  },
  {
    capability: "media.uploadAuthorization",
    rest: { operationId: "authorizeMediaUpload" },
    parity: "exempt",
    exemption: {
      reason:
        "Binary upload authorization is a browser/provider transport and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "media.uploadFinalize",
    rest: { operationId: "finalizeMediaUpload" },
    parity: "exempt",
    exemption: {
      reason:
        "Binary upload finalization is a browser/provider transport and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "certificate.templates.list",
    rest: { operationId: "listCertificateTemplates" },
    parity: "exempt",
    exemption: {
      reason:
        "Certificate template administration is a browser authoring workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "certificate.templates.create",
    rest: { operationId: "createCertificateTemplate" },
    parity: "exempt",
    exemption: {
      reason:
        "Certificate template administration is a browser authoring workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "certificate.templates.update",
    rest: { operationId: "updateCertificateTemplate" },
    parity: "exempt",
    exemption: {
      reason:
        "Certificate template administration is a browser authoring workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "certificate.productTemplate.get",
    rest: { operationId: "getProductCertificateTemplate" },
    parity: "exempt",
    exemption: {
      reason:
        "Product certificate template administration is a browser authoring workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "certificate.productTemplate.upsert",
    rest: { operationId: "upsertProductCertificateTemplate" },
    parity: "exempt",
    exemption: {
      reason:
        "Product certificate template administration is a browser authoring workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "certificate.learner.list",
    rest: { operationId: "listLearnerCertificates" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner session and certificate consumption endpoints are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.progress.start",
    rest: { operationId: "learnerStartLesson" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner session progress writes are learner-facing browser endpoints and are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.progress.list",
    rest: { operationId: "listLearnerProgress" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner session progress reads are learner-facing browser endpoints and are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learners.list",
    rest: { operationId: "listLearners" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner roster administration is a browser/admin workflow and is not an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learners.update",
    rest: { operationId: "updateLearner" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner lifecycle administration is a browser/admin workflow and is not an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learners.identityLink.create",
    rest: { operationId: "createLearnerIdentityLink" },
    parity: "exempt",
    exemption: {
      reason:
        "Admin-to-learner identity handoff is a browser workflow and is not an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.plans.list",
    rest: { operationId: "listPlans" },
    parity: "exempt",
    exemption: {
      reason:
        "Storefront plan administration is a browser workflow and is not an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.plans.create",
    rest: { operationId: "createPlan" },
    parity: "exempt",
    exemption: {
      reason:
        "Storefront plan administration is a browser workflow and is not an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.plans.update",
    rest: { operationId: "updatePlan" },
    parity: "exempt",
    exemption: {
      reason:
        "Storefront plan administration is a browser workflow and is not an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.plans.default",
    rest: { operationId: "setDefaultPlan" },
    parity: "exempt",
    exemption: {
      reason:
        "Storefront plan administration is a browser workflow and is not an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.plans.archive",
    rest: { operationId: "archivePlan" },
    parity: "exempt",
    exemption: {
      reason:
        "Storefront plan administration is a browser workflow and is not an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "certificate.verify",
    rest: { operationId: "verifyCertificate" },
    parity: "exempt",
    exemption: {
      reason:
        "Public certificate verification is a learner-facing browser endpoint and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "health",
    rest: { operationId: "health" },
    parity: "exempt",
    exemption: {
      reason: "Health is transport-specific and has no MCP tool.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "ready",
    rest: { operationId: "ready" },
    parity: "exempt",
    exemption: {
      reason: "Readiness is transport-specific and has no MCP tool.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "billing.catalog",
    rest: { operationId: "getBillingCatalog" },
    parity: "exempt",
    exemption: {
      reason: "Billing catalog is a browser checkout workflow, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "billing.entitlement",
    rest: { operationId: "getEntitlement" },
    parity: "exempt",
    exemption: {
      reason: "Billing entitlement remains REST-only in the reference vertical.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.list",
    rest: { operationId: "listSchools" },
    parity: "exempt",
    exemption: {
      reason:
        "School administration is account-scoped and REST-only in the reference vertical.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.create",
    rest: { operationId: "createSchool" },
    parity: "exempt",
    exemption: {
      reason:
        "School administration is account-scoped and REST-only in the reference vertical.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.update",
    rest: { operationId: "updateSchool" },
    parity: "exempt",
    exemption: {
      reason:
        "School settings administration is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.select",
    rest: { operationId: "selectSchool" },
    parity: "exempt",
    exemption: {
      reason:
        "School selection persists browser account state and has no MCP equivalent.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.hosts.list",
    rest: { operationId: "listSchoolHosts" },
    parity: "exempt",
    exemption: {
      reason:
        "Custom-host administration is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.hosts.create",
    rest: { operationId: "createSchoolHost" },
    parity: "exempt",
    exemption: {
      reason:
        "Custom-host administration is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.hosts.verify",
    rest: { operationId: "verifySchoolHost" },
    parity: "exempt",
    exemption: {
      reason:
        "DNS-backed custom-host verification is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.hosts.delete",
    rest: { operationId: "deleteSchoolHost" },
    parity: "exempt",
    exemption: {
      reason:
        "Custom-host administration is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "preview.create",
    rest: { operationId: "createPreviewGrant" },
    parity: "exempt",
    exemption: {
      reason:
        "Preview grant issuance is an ephemeral browser authoring workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "preview.read",
    rest: { operationId: "readPreviewProduct" },
    parity: "exempt",
    exemption: {
      reason:
        "Preview reads use a short-lived browser grant and are not exposed as an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "sections.list",
    rest: { operationId: "listSections" },
    parity: "exempt",
    exemption: {
      reason:
        "Section authoring is included in REST product authoring and is not exposed as a separate MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "sections.create",
    rest: { operationId: "createSection" },
    parity: "exempt",
    exemption: {
      reason:
        "Section authoring is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "sections.reorder",
    rest: { operationId: "reorderSections" },
    parity: "exempt",
    exemption: {
      reason:
        "Section ordering is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "lessons.reorder",
    rest: { operationId: "reorderLessons" },
    parity: "exempt",
    exemption: {
      reason:
        "Lesson ordering is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "sections.update",
    rest: { operationId: "updateSection" },
    parity: "exempt",
    exemption: {
      reason:
        "Section authoring is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "sections.delete",
    rest: { operationId: "deleteSection" },
    parity: "exempt",
    exemption: {
      reason:
        "Section deletion is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "api-key.list",
    rest: { operationId: "listApiKeys" },
    parity: "exempt",
    exemption: {
      reason:
        "Credential administration remains REST-only to avoid exposing secret-management flows over MCP.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "api-key.create",
    rest: { operationId: "createApiKey" },
    parity: "exempt",
    exemption: {
      reason:
        "Credential administration remains REST-only to avoid exposing secret-management flows over MCP.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "api-key.revoke",
    rest: { operationId: "revokeApiKey" },
    parity: "exempt",
    exemption: {
      reason:
        "Credential administration remains REST-only to avoid exposing secret-management flows over MCP.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "invitation.create",
    rest: { operationId: "createInvitation" },
    parity: "exempt",
    exemption: {
      reason:
        "Invitation delivery is a browser and email workflow, not an MCP capability.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "invitation.accept",
    rest: { operationId: "acceptInvitation" },
    parity: "exempt",
    exemption: {
      reason:
        "Invitation acceptance binds an authenticated browser identity and remains REST-only.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "invitation.revoke",
    rest: { operationId: "revokeInvitation" },
    parity: "exempt",
    exemption: {
      reason: "Invitation administration remains REST-only in the reference vertical.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "lessons.create",
    rest: { operationId: "createLesson" },
    parity: "exempt",
    exemption: {
      reason: "Lesson authoring is REST-only in the first vertical slice.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "lessons.update",
    rest: { operationId: "updateLesson" },
    parity: "exempt",
    exemption: {
      reason: "Lesson authoring is REST-only in the first vertical slice.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "lessons.delete",
    rest: { operationId: "deleteLesson" },
    parity: "exempt",
    exemption: {
      reason: "Lesson authoring is REST-only in the first vertical slice.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "enrollment.grant",
    rest: { operationId: "grantEnrollment" },
    parity: "exempt",
    exemption: {
      reason: "Admin enrollment grants are a browser workflow, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.signUp",
    rest: { operationId: "learnerSignUp" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.requestOtp",
    rest: { operationId: "learnerRequestOtp" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser authentication operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.verifyOtp",
    rest: { operationId: "learnerVerifyOtp" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser authentication operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.signIn",
    rest: { operationId: "learnerSignIn" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.signOut",
    rest: { operationId: "learnerSignOut" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.me",
    rest: { operationId: "learnerMe" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.enroll",
    rest: { operationId: "learnerEnroll" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.completeLesson",
    rest: { operationId: "learnerCompleteLesson" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.checkout",
    rest: { operationId: "learnerCheckout" },
    parity: "exempt",
    exemption: {
      reason:
        "Hosted payment checkout is a browser/provider workflow, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.publicPlans",
    rest: { operationId: "listPublicPlans" },
    parity: "exempt",
    exemption: {
      reason:
        "Public storefront pricing is a learner browser surface, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.checkoutSession.create",
    rest: { operationId: "createCheckoutSession" },
    parity: "exempt",
    exemption: {
      reason:
        "Public checkout-intent creation is a learner browser workflow, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.checkoutSession.get",
    rest: { operationId: "getCheckoutSession" },
    parity: "exempt",
    exemption: {
      reason:
        "Checkout-session display and payment-status polling are learner browser workflows, not MCP capabilities.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.checkoutSession.start",
    rest: { operationId: "startLearnerCheckoutSession" },
    parity: "exempt",
    exemption: {
      reason:
        "Starting a learner checkout session is a browser/provider workflow, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.checkoutRead",
    rest: { operationId: "getLearnerCheckout" },
    parity: "exempt",
    exemption: {
      reason: "Learner checkout polling is a browser workflow, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.webhook",
    rest: { operationId: "stripeWebhook" },
    parity: "exempt",
    exemption: {
      reason:
        "Provider webhooks are machine-to-machine callbacks, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.webhook.lemonsqueezy",
    rest: { operationId: "lemonSqueezyWebhook" },
    parity: "exempt",
    exemption: {
      reason:
        "Provider webhooks are machine-to-machine callbacks, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "storefront.webhook.razorpay",
    rest: { operationId: "razorpayWebhook" },
    parity: "exempt",
    exemption: {
      reason:
        "Provider webhooks are machine-to-machine callbacks, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.overview",
    rest: { operationId: "getSchoolOverview" },
    parity: "exempt",
    exemption: {
      reason:
        "School dashboard overview is an admin read model, not an MCP capability.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.paymentSettings.get",
    rest: { operationId: "getSchoolPaymentSettings" },
    parity: "exempt",
    exemption: {
      reason:
        "School payment provider settings administration is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.paymentSettings.update",
    rest: { operationId: "updateSchoolPaymentSettings" },
    parity: "exempt",
    exemption: {
      reason:
        "School payment provider settings administration is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.codeInjection.get",
    rest: { operationId: "getSchoolCodeInjection" },
    parity: "exempt",
    exemption: {
      reason:
        "School code injection is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.codeInjection.update",
    rest: { operationId: "updateSchoolCodeInjection" },
    parity: "exempt",
    exemption: {
      reason:
        "School code injection is an owner browser workflow and is not exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
] as const;
