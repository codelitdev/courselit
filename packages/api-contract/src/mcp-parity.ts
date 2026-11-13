const communityParityExemptions = [
  ["listLearnerCommunities", "learner.communities.list"],
  ["listLearnerFeed", "learner.communities.feed.list"],
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
  ["listStaffNotificationPreferences", "admin.notifications.preferences.list"],
  ["updateStaffNotificationPreference", "admin.notifications.preferences.update"],
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
  ["searchLearnerGifs", "learner.gifs.search"],
] as const;

/**
 * Operations with a dedicated MCP tool, and operations kept off MCP with the
 * reason why. Every other contract operation gets a tool of its own (see
 * `buildMcpParityManifest`).
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
    capability: "public.captcha.config",
    rest: { operationId: "getCaptchaConfig" },
    parity: "exempt",
    exemption: {
      reason:
        "The captcha site key is for browsers rendering public forms; agents authenticate with credentials instead.",
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
    capability: "learner.purchases.list",
    rest: { operationId: "listLearnerPurchases" },
    parity: "exempt",
    exemption: {
      reason:
        "A learner's own purchase history is a learner-session browser surface and is not an MCP tool.",
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
    capability: "school.subdomain.check",
    rest: { operationId: "checkSchoolSubdomain" },
    parity: "exempt",
    exemption: {
      reason:
        "Address availability is part of the browser sign-up flow and has no MCP equivalent.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.billing.checkout",
    rest: { operationId: "startSchoolBillingCheckout" },
    parity: "exempt",
    exemption: {
      reason:
        "Starting a CourseLit plan checkout is a browser billing flow and stays off MCP.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.billing.plan.get",
    rest: { operationId: "getSchoolBillingPlan" },
    parity: "exempt",
    exemption: {
      reason:
        "Viewing the CourseLit plan is a browser billing screen and stays off MCP.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.billing.plan.cancel",
    rest: { operationId: "cancelSchoolBillingPlan" },
    parity: "exempt",
    exemption: {
      reason:
        "Cancelling a CourseLit plan runs on a single-use grant in the owner's browser and stays off MCP.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.billing.plan.resume",
    rest: { operationId: "resumeSchoolBillingPlan" },
    parity: "exempt",
    exemption: {
      reason:
        "Resuming a CourseLit plan runs on a single-use grant in the owner's browser and stays off MCP.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.onboarding.get",
    rest: { operationId: "getSchoolOnboarding" },
    parity: "exempt",
    exemption: {
      reason:
        "Setup wizard progress is browser-session state and has no MCP equivalent.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "school.onboarding.update",
    rest: { operationId: "updateSchoolOnboarding" },
    parity: "exempt",
    exemption: {
      reason:
        "Setup wizard progress is browser-session state and has no MCP equivalent.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "ai-connection.list",
    rest: { operationId: "listAiConnections" },
    parity: "exempt",
    exemption: {
      reason:
        "Managing the user's own AI assistant credentials stays REST-only to avoid exposing credential management over MCP.",
      owner: "platform",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "ai-connection.disconnect",
    rest: { operationId: "disconnectAiConnection" },
    parity: "exempt",
    exemption: {
      reason:
        "Managing the user's own AI assistant credentials stays REST-only to avoid exposing credential management over MCP.",
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
    capability: "learner.requestEmailCode",
    rest: { operationId: "learnerRequestEmailCode" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.verifyEmailCode",
    rest: { operationId: "learnerVerifyEmailCode" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.startGoogleSignIn",
    rest: { operationId: "learnerStartGoogleSignIn" },
    parity: "exempt",
    exemption: {
      reason: "Learner browser session operations are not MCP tools.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
  {
    capability: "learner.consumeAuthTicket",
    rest: { operationId: "consumeSchoolAuthTicket" },
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
  {
    capability: "learner.products.subscription.cancel",
    rest: { operationId: "cancelLearnerProductSubscription" },
    parity: "exempt",
    exemption: {
      reason:
        "Learners cancel their own subscription from the browser with a learner session; school credentials cannot act as the learner.",
      owner: "courselit",
      reviewBy: "2027-09-01",
    },
  },
] as const;

type ParityRisk = "read" | "write" | "destructive";

/**
 * Operations that are not deletions but cannot be undone, publish to the
 * public, email real people, or move money or access. Their MCP tools are
 * `destructive`, so a client must pass `confirm: true`, which makes the model
 * ask the user first.
 */
export const MCP_HIGH_IMPACT_OPERATIONS: ReadonlySet<string> = new Set([
  "removeProductCustomerAccess",
  "cancelProductCustomerSubscription",
  "grantLearnerMembership",
  "archivePlan",
  "archiveCommunityPlan",
  "publishSchoolWebsitePage",
  "publishSchoolWebsiteBlog",
  "unpublishSchoolWebsiteBlog",
  "discardSchoolWebsitePage",
  "discardSchoolWebsiteBlog",
  "startMailSequence",
  "renameContactTag",
  "deleteContactTag",
  "updateSchoolCodeInjection",
  "updateSchoolPaymentSettings",
]);

/** `listWebsitePages` -> `list_website_pages`: one snake_case tool per operation. */
export function mcpToolName(operationId: string): string {
  return operationId.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/** GET reads, DELETE and high-impact operations are destructive, the rest write. */
export function mcpOperationRisk(operationId: string, method: string): ParityRisk {
  const upper = method.toUpperCase();
  if (upper === "GET") return "read";
  if (upper === "DELETE" || MCP_HIGH_IMPACT_OPERATIONS.has(operationId)) {
    return "destructive";
  }
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
 * override is required over MCP as its own tool, named by `mcpToolName`.
 * Keeping an operation off MCP takes an explicit exemption with a reason.
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
      return {
        capability: operationId,
        risk: mcpOperationRisk(operationId, route.method),
        rest: { operationId },
        mcp: { tool: mcpToolName(operationId) },
        parity: "required",
      };
    });
  return [...overrides, ...generic];
}
