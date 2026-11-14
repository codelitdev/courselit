/**
 * What each generated MCP tool tells the model. Every contract operation that
 * has no hand-written tool needs an entry here (a test enforces it), so a new
 * REST operation cannot reach MCP without a description a person wrote.
 *
 * Keep them to what the model needs to choose and call the tool: what it does,
 * which ids it takes and where to get them, and any side effect.
 */
export const OPERATION_DESCRIPTIONS: Readonly<Record<string, string>> = {
  // Communities
  listCommunities: "Lists the school's communities.",
  createCommunity: "Creates a community.",
  getCommunity:
    "Reads one community by communityId (from list_communities), including its settings and categories.",
  getSchoolCommunity:
    "Reads the school's main community, if it has one, without needing its id.",
  updateCommunity:
    "Changes a community's name, description, privacy or other settings.",
  deleteCommunity:
    "Permanently deletes a community and everything in it: posts, comments and memberships. Confirm with the user first.",
  addCommunityCategory: "Adds a discussion category to a community.",
  deleteCommunityCategory:
    "Removes a discussion category from a community. Confirm with the user first.",
  listCommunityMembers:
    "Lists a community's members with their roles and membership status.",
  inviteCommunityMember:
    "Invites a person to a community by email. They receive an invitation.",
  updateCommunityMembership:
    "Changes a member's role or status in a community (for example to ban or restore them). Needs the membershipId from list_community_members.",
  listCommunityPosts: "Lists the posts in a community, newest first.",
  createCommunityPost: "Publishes a post in a community as the connected user.",
  updateCommunityPost: "Edits a community post's title, body or category.",
  deleteCommunityPost:
    "Permanently deletes a community post and its comments. Confirm with the user first.",
  listCommunityComments: "Lists the comments on a community post.",
  createCommunityComment:
    "Adds a comment (or a reply, when a parent comment is given) to a community post.",
  updateCommunityComment: "Edits a community comment's text.",
  deleteCommunityComment:
    "Permanently deletes a community comment. Confirm with the user first.",
  toggleCommunityReaction:
    "Adds the connected user's reaction to a post or comment, or removes it if it is already there.",
  toggleCommunityPostSubscription:
    "Subscribes the connected user to notifications for a post, or unsubscribes them if they already are.",
  createCommunityReport:
    "Reports a post or comment to the community's moderators.",
  listCommunityReports: "Lists the reports moderators have received for a community.",
  listProductDiscussionReports:
    "Lists the reports learners have made about posts, comments and replies in a course's discussion.",
  updateCommunityReport:
    "Resolves or dismisses a moderation report. Needs the reportId from list_community_reports or list_product_discussion_reports.",

  // Spaces
  listSpaces: "Lists the school's spaces, in their display order.",
  createSpace: "Creates a space.",
  getSpace: "Reads one space by spaceId.",
  updateSpace: "Changes a space's name, description or visibility.",
  orderSpaces:
    "Sets the display order of the school's spaces. Pass every spaceId in the order wanted.",
  deleteSpace:
    "Permanently deletes a space and its posts. Confirm with the user first.",

  // Sales pages and analytics
  getSalesPage:
    "Reads the sales page for a product or community: resourceType is 'product' or 'community', resourceId is its id.",
  getProductAnalytics:
    "Reads enrolment, completion and revenue figures for one product.",
  getSchoolOverview:
    "Reads the school's headline numbers: customers, products, revenue and recent activity.",

  // Contacts and segments
  createContact: "Adds a contact (a person on the school's mailing list) by email.",
  filterPreviewContacts:
    "Counts and previews the contacts that match a set of filters without saving a segment. Use it to check a filter before create_contact_segment.",
  createContactSegment:
    "Saves a named segment: a set of filters that always matches the contacts who fit them.",
  getContactSegment: "Reads one contact segment and its filters by segmentId.",
  updateContactSegment: "Renames a segment or changes its filters.",
  deleteContactSegment:
    "Deletes a segment. The contacts in it are not deleted. Confirm with the user first.",
  getContactSegmentMembers: "Lists the contacts currently in a segment.",
  listContactTags:
    "Lists every tag carried by at least one contact, with how many contacts carry it.",
  getContactTagReferences:
    "Shows the segments, broadcasts, sequences and signup forms that use a tag, and how many contacts carry it. Check this before delete_contact_tag.",
  renameContactTag:
    "Renames a tag on every contact and in the segments, sequences and signup forms that use it. Renaming to an existing tag merges the two. Confirm with the user first.",
  deleteContactTag:
    "Removes a tag from every contact. Segments, sequences and signup forms that name it are left untouched. Check get_contact_tag_references first and confirm with the user first.",
  grantLearnerMembership:
    "Gives a contact access to a product or community without a payment. Confirm with the user first.",

  // Certificates
  getProductCertificateTemplate:
    "Reads the certificate template a product awards on completion.",
  upsertProductCertificateTemplate:
    "Sets which certificate template a product awards, creating the link if it does not exist.",
  listCertificateTemplates: "Lists the school's certificate templates.",
  createCertificateTemplate: "Creates a certificate template.",
  updateCertificateTemplate: "Changes a certificate template's design or text.",

  // Pricing plans
  listPlans: "Lists a product's pricing plans, including archived ones.",
  createPlan:
    "Creates a pricing plan for a product: free, one-time, subscription or payment plan.",
  updatePlan: "Changes a product plan's name, price or terms.",
  setDefaultPlan:
    "Makes a plan the one shown first on a product's checkout.",
  archivePlan:
    "Stops selling a product plan. Existing customers keep access. Confirm with the user first.",
  listCommunityPlans: "Lists a community's pricing plans, including archived ones.",
  createCommunityPlan:
    "Creates a pricing plan for a community: free, one-time or subscription.",
  updateCommunityPlan: "Changes a community plan's name, price or terms.",
  setDefaultCommunityPlan:
    "Makes a plan the one shown first on a community's checkout.",
  archiveCommunityPlan:
    "Stops selling a community plan. Existing members keep access. Confirm with the user first.",

  // Customers
  listProductCustomers: "Lists the customers enrolled in a product.",
  getProductCustomerProgress:
    "Reads one customer's lesson-by-lesson progress through a product.",
  cancelProductCustomerSubscription:
    "Cancels a customer's subscription to a product so they are not charged again. Confirm with the user first.",
  removeProductCustomerAccess:
    "Removes a customer's access to a product. Confirm with the user first.",
  createPreviewGrant:
    "Creates a short-lived link that lets someone preview an unpublished product as a learner would see it.",

  // Course content
  listSections: "Lists a product's sections in order, with the lessons in each.",
  createSection: "Adds a section to a product.",
  updateSection: "Renames a section or changes its settings.",
  deleteSection:
    "Deletes a section and its lessons. Confirm with the user first.",
  reorderSections:
    "Sets the order of a product's sections. Pass every sectionId in the order wanted.",
  createLesson:
    "Adds a lesson to a product, of any type: text, video, audio, PDF, file, embed, quiz or SCORM. For several text lessons at once, prefer apply_course_outline.",
  updateLesson: "Changes a lesson's title, content, type settings or published state.",
  deleteLesson: "Deletes a lesson. Confirm with the user first.",
  reorderLessons:
    "Sets the order of lessons within a product's sections. Pass the lessonIds in the order wanted.",
  getSectionDripEmail:
    "Reads the email sent to learners when a drip-scheduled section unlocks.",
  updateSectionDripEmail:
    "Sets or changes the email sent to learners when a drip-scheduled section unlocks.",
  searchUnsplash:
    "Searches Unsplash for stock photos. Results can be used as an image URL, but are not added to the media library.",

  // School settings
  getSchoolPaymentSettings:
    "Reads the school's payment settings: the payment provider, its saved keys (secrets are not returned) and whether its payment webhook is connected.",
  updateSchoolPaymentSettings:
    "Changes the school's payment provider or its keys. Saving a provider's keys also registers the payment webhook on that account. This changes how customers pay. Confirm with the user first.",
  getSchoolPlanFeatures:
    "Lists the features the school's CourseLit plan includes (for example scorm or audit_log), to explain why an action is refused.",
  listSchoolAuditEvents:
    "Lists the school's audit log, newest first: who changed what and when. Needs the Business plan. Billing events are not included.",
  getSchoolCodeInjection:
    "Reads the custom code added to the head and body of every public page.",
  updateSchoolCodeInjection:
    "Changes the custom code added to every public page. It runs for all visitors. Confirm with the user first.",
  updateSchool: "Changes the school's name or other profile details.",
  listSchoolHosts: "Lists the custom domains attached to the school and their verification status.",
  createSchoolHost: "Attaches a custom domain to the school and returns the DNS records to add.",
  verifySchoolHost:
    "Checks the DNS records for a custom domain and marks it verified when they are right.",
  deleteSchoolHost:
    "Detaches a custom domain from the school. Confirm with the user first.",
  getSchoolLoginMethods:
    "Reads which sign-in methods the school's learners can use (email codes, Google, single sign-on) and which are on right now.",
  updateSchoolLoginMethods:
    "Turns learner sign-in with email codes or Google on or off. Turning a method off signs out learners who used it. At least one method always stays on. This changes how learners sign in. Confirm with the user first.",
  listSsoConnections:
    "Lists the school's single sign-on connections with their status, verified email domains and the values to enter at the identity provider. Secrets are never returned.",
  getSsoConnection:
    "Reads one single sign-on connection: status, identity provider settings, domains and the DNS record to publish for each, and whether it was tested and the plan allows it. Secrets are never returned.",

  // Website
  listSchoolWebsitePages: "Lists the school website's pages with their publish status.",
  createSchoolWebsitePage: "Creates a draft page on the school website.",
  getSchoolWebsitePage:
    "Reads one website page, including its draft and published content.",
  updateSchoolWebsitePage:
    "Changes a website page's draft: title, slug, SEO or layout. Nothing goes live until publish_school_website_page.",
  deleteSchoolWebsitePage:
    "Permanently deletes a website page. Confirm with the user first.",
  publishSchoolWebsitePage:
    "Publishes a page's draft so visitors see it. Confirm with the user first.",
  discardSchoolWebsitePage:
    "Throws away a page's unpublished draft and goes back to the published version. Confirm with the user first.",
  getSchoolWebsiteBranding:
    "Reads the website's branding: site title, tagline, logo and the active theme.",
  updateSchoolWebsiteBranding:
    "Changes the website's title, tagline, logo or active theme.",
  listSchoolWebsiteBrandingThemes: "Lists the school's custom website themes.",
  createSchoolWebsiteBrandingTheme: "Creates a custom website theme.",
  updateSchoolWebsiteBrandingTheme: "Changes a custom website theme's colours and styles.",
  listSchoolWebsiteBlogs: "Lists the school's blog posts with their publish status.",
  createSchoolWebsiteBlog: "Creates a draft blog post.",
  getSchoolWebsiteBlog: "Reads one blog post, including its draft and published content.",
  updateSchoolWebsiteBlog:
    "Changes a blog post's draft: title, slug, body or SEO. Nothing goes live until publish_school_website_blog.",
  deleteSchoolWebsiteBlog:
    "Permanently deletes a blog post. Confirm with the user first.",
  publishSchoolWebsiteBlog:
    "Publishes a blog post's draft so visitors see it. Confirm with the user first.",
  unpublishSchoolWebsiteBlog:
    "Takes a published blog post off the site; its writing stays as a draft to publish again later. Confirm with the user first.",
  discardSchoolWebsiteBlog:
    "Throws away a blog post's unpublished draft and goes back to the published version. Confirm with the user first.",

  // Email
  getMailingSettings: "Reads the school's email settings: sender name, reply-to and mailing address.",
  updateMailingSettings: "Changes the school's email sender name, reply-to or mailing address.",
  getSchoolEmailDelivery:
    "Reads whether the school's email is set up to send, and what is still missing.",
  listMailSequences: "Lists the school's email sequences with their status.",
  createMailSequence: "Creates a draft email sequence.",
  getMailSequence: "Reads one email sequence and its emails by sequenceId.",
  updateMailSequence: "Renames an email sequence or changes its settings.",
  deleteMailSequence:
    "Permanently deletes an email sequence. Confirm with the user first.",
  getMailSequenceStats:
    "Reads a sequence's delivery numbers: sent, opened, clicked and unsubscribed.",
  listMailSequenceSubscribers:
    "Lists the contacts (name and email) who have received a sequence, a page at a time.",
  startMailSequence:
    "Starts a sequence, which begins emailing real contacts. Confirm with the user first.",
  pauseMailSequence: "Pauses a running sequence. Emails already sent are not recalled.",
  createMailSequenceEmail: "Adds an email to a sequence.",
  updateMailSequenceEmail: "Changes an email in a sequence: subject, body or delay.",
  deleteMailSequenceEmail:
    "Removes an email from a sequence. Confirm with the user first.",
  sendMailSequenceTestEmail:
    "Sends one sequence email to a test address so it can be checked before the sequence starts.",
  listSystemMailTemplates:
    "Lists the built-in emails the school sends automatically, such as sign-in codes and receipts.",
  listMailTemplates: "Lists the school's saved email templates.",
  createMailTemplate: "Saves a new email template.",
  duplicateMailTemplate: "Copies an email template under a new name.",
  getMailTemplate: "Reads one email template by templateId.",
  updateMailTemplate: "Changes an email template's name or content.",
  deleteMailTemplate:
    "Permanently deletes an email template. Confirm with the user first.",
};
