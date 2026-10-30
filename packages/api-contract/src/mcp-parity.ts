const communityParityExemptions = [
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
  ["listAdminNotifications", "admin.notifications.list"],
  ["markAdminNotificationRead", "admin.notifications.read"],
  ["markAllAdminNotificationsRead", "admin.notifications.readAll"],
  ["listLearnerProducts", "learner.products.list"],
  ["leaveLearnerCommunity", "learner.communities.leave"],
  ["listLearnerCommunityPlans", "learner.communities.plans.list"],
  ["startLearnerCommunityCheckout", "learner.communities.checkout.start"],
  ["getLearnerCommunityCheckout", "learner.communities.checkout.get"],
  ["getPublicSiteSettings", "public.site.settings.get"],
  ["getPublicSitePage", "public.site.pages.get"],
  ["listPublicSiteBlogs", "public.site.blogs.list"],
  ["getPublicSiteBlog", "public.site.blogs.get"],
  ["listLearnerSpaces", "learner.spaces.list"],
  ["followLearnerSpace", "learner.spaces.follow"],
  ["unfollowLearnerSpace", "learner.spaces.unfollow"],
  ["createLearnerSpacePost", "learner.spaces.posts.create"],
  ["getLearnerSpacePost", "learner.spaces.posts.get"],
  ["authorizeLearnerAvatarMediaUpload", "learner.avatars.authorize"],
  ["finalizeLearnerAvatarMediaUpload", "learner.avatars.finalize"],
] as const;

/**
 * Operations with a dedicated MCP tool, and operations kept off MCP with the
 * reason why. Every other contract operation is served by the generic
 * `api.*` tools (see `buildMcpParityManifest`).
 */
const mcpParityOverrides = [
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
    capability: "public.lessonMedia.get",
    rest: { operationId: "getPublicLessonMedia" },
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
    capability: "public.host.resolve",
    rest: { operationId: "resolvePublicHost" },
    parity: "exempt",
    exemption: {
      reason:
        "Website host resolution is an infrastructure edge/storefront routing check, not an application capability exposed over MCP.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "public.products.get",
    rest: { operationId: "getPublicProduct" },
    parity: "exempt",
    exemption: {
      reason:
        "The public product page is a learner-site/browser surface and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "public.loginMethods.get",
    rest: { operationId: "getPublicLoginMethods" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner login-method discovery is a learner-site/browser surface and is not exposed as an MCP tool.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "public.leadMagnets.signUp",
    rest: { operationId: "signUpForLeadMagnet" },
    parity: "exempt",
    exemption: {
      reason:
        "Lead-magnet signup is a storefront visitor form and is not exposed as an administrative MCP tool.",
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
    capability: "public.newsletter.subscribe",
    rest: { operationId: "subscribeNewsletter" },
    parity: "exempt",
    exemption: {
      reason:
        "Public newsletter signup is a storefront visitor form and is not exposed as an administrative MCP tool.",
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
    capability: "contacts.list",
    risk: "read",
    rest: { operationId: "listContacts" },
    mcp: { tool: "contacts.list" },
    parity: "required",
  },
  {
    capability: "contacts.get",
    risk: "read",
    rest: { operationId: "getContact" },
    mcp: { tool: "contacts.get" },
    parity: "required",
  },
  {
    capability: "contacts.update",
    risk: "write",
    rest: { operationId: "updateContact" },
    mcp: { tool: "contacts.update" },
    parity: "required",
  },
  {
    capability: "contacts.marketing.update",
    risk: "write",
    rest: { operationId: "updateContactMarketing" },
    mcp: { tool: "contacts.marketing.update" },
    parity: "required",
  },
  {
    capability: "contacts.delete",
    risk: "destructive",
    rest: { operationId: "deleteContact" },
    mcp: { tool: "contacts.delete" },
    parity: "required",
  },
  {
    capability: "contacts.segments.list",
    risk: "read",
    rest: { operationId: "listContactSegments" },
    mcp: { tool: "contacts.segments.list" },
    parity: "required",
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
      reason:
        "MCP calls are bound to one school; the platform plan catalog is an account checkout surface.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "billing.entitlement",
    rest: { operationId: "getEntitlement" },
    parity: "exempt",
    exemption: {
      reason:
        "MCP calls are bound to one school; account billing entitlement stays REST.",
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
        "MCP calls are bound to one school; listing the account's schools stays REST.",
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
    capability: "school.team.list",
    rest: { operationId: "listSchoolTeam" },
    parity: "exempt",
    exemption: {
      reason: "Team administration remains a browser-only school settings workflow.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.team.member.remove",
    rest: { operationId: "removeSchoolTeamMember" },
    parity: "exempt",
    exemption: {
      reason: "Team administration remains a browser-only school settings workflow.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.team.member.update",
    rest: { operationId: "updateSchoolTeamMember" },
    parity: "exempt",
    exemption: {
      reason: "Team administration remains a browser-only school settings workflow.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.team.leave",
    rest: { operationId: "leaveSchoolTeam" },
    parity: "exempt",
    exemption: {
      reason: "Team administration remains a browser-only school settings workflow.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.team.ownership.transfer",
    rest: { operationId: "transferSchoolOwnership" },
    parity: "exempt",
    exemption: {
      reason: "Team administration remains a browser-only school settings workflow.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.team.invitation.create",
    rest: { operationId: "createSchoolTeamInvitation" },
    parity: "exempt",
    exemption: {
      reason:
        "Invitation delivery is a browser and email workflow, not an MCP capability.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.team.invitation.resend",
    rest: { operationId: "resendSchoolTeamInvitation" },
    parity: "exempt",
    exemption: {
      reason:
        "Invitation delivery is a browser and email workflow, not an MCP capability.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.team.invitation.revoke",
    rest: { operationId: "revokeSchoolTeamInvitation" },
    parity: "exempt",
    exemption: {
      reason:
        "Invitation delivery is a browser and email workflow, not an MCP capability.",
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
    capability: "invitation.preview",
    rest: { operationId: "previewTeamInvitation" },
    parity: "exempt",
    exemption: {
      reason:
        "Invitation preview binds an authenticated browser identity and remains REST-only.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "invitation.acceptWithId",
    rest: { operationId: "acceptTeamInvitation" },
    parity: "exempt",
    exemption: {
      reason:
        "Invitation acceptance binds an authenticated browser identity and remains REST-only.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "invitation.reject",
    rest: { operationId: "rejectTeamInvitation" },
    parity: "exempt",
    exemption: {
      reason: "Invitation decisions are browser-only team membership workflows.",
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
    capability: "learner.membership.create",
    rest: { operationId: "createLearnerMembership" },
    parity: "exempt",
    exemption: {
      reason:
        "Learner self-enrollment runs under a learner session, which MCP never carries.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.profile.update",
    rest: { operationId: "updateLearnerProfile" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser profile operations are not MCP tools.",
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
] as const;

type ParityRisk = "read" | "write" | "destructive";

/** The generic MCP tool that serves each risk class of contract operation. */
export const MCP_API_TOOLS = {
  read: "api.read",
  write: "api.write",
  destructive: "api.delete",
} as const satisfies Record<ParityRisk, string>;

/** GET reads, DELETE destroys, everything else writes. */
export function mcpApiRisk(method: string): ParityRisk {
  const upper = method.toUpperCase();
  if (upper === "GET") return "read";
  if (upper === "DELETE") return "destructive";
  return "write";
}

export type McpParityManifestEntry =
  | {
      capability: string;
      risk: ParityRisk;
      rest: { operationId: string };
      mcp: { tool: string };
      parity: "required";
    }
  | {
      capability: string;
      rest?: { operationId: string };
      mcp?: { tool: string };
      parity: "exempt";
      exemption: { reason: string; owner: string; reviewBy: string };
    };

/**
 * REST and MCP have parity by default: a contract operation without an
 * override is required over MCP through the `api.*` tool for its risk. Keeping
 * an operation off MCP takes an explicit exemption with a reason.
 */
export function buildMcpParityManifest(
  routes: Record<string, { method: string }>,
): readonly McpParityManifestEntry[] {
  const overrides = mcpParityOverrides as readonly McpParityManifestEntry[];
  const documented = new Set(
    overrides.flatMap((entry) => (entry.rest ? [entry.rest.operationId] : [])),
  );
  const generic = Object.entries(routes)
    .filter(([operationId]) => !documented.has(operationId))
    .map(([operationId, route]): McpParityManifestEntry => {
      const risk = mcpApiRisk(route.method);
      return {
        capability: operationId,
        risk,
        rest: { operationId },
        mcp: { tool: MCP_API_TOOLS[risk] },
        parity: "required",
      };
    });
  return [...overrides, ...generic];
}
