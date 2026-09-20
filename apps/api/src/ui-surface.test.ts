import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

function read(relative: string) {
  return readFileSync(path.join(import.meta.dir, "../../", relative), "utf8");
}

describe("admin and learner surfaces", () => {
  it("posts school, invitation, and course/lesson fields the API accepts", () => {
    const home = read("admin/app/page.tsx");
    const account = read("admin/app/account/page.tsx");
    const schools = read("admin/app/schools/page.tsx");
    const sidebar = read("admin/components/layout/app-sidebar.tsx");
    const settings = read("admin/app/settings/page.tsx");
    const branding = read("admin/app/branding/page.tsx");
    const website = read("admin/app/website/page.tsx");
    const websitePages = read("admin/app/website/pages/page.tsx");
    const websiteBlogs = read("admin/app/website/blogs/page.tsx");
    const websitePageEditor = read("admin/app/website/pages/[pageId]/edit/page.tsx");
    const websiteBlogEditor = read("admin/app/website/blogs/[blogId]/edit/page.tsx");
    const websiteSettings = read("admin/app/website/settings/page.tsx");
    const mailSettings = read("admin/app/mails/settings/page.tsx");
    const teamSettings = read("admin/components/settings/team-settings.tsx");
    const brandingSettings = read("admin/components/settings/branding-settings.tsx");
    const codeInjectionSettings = read(
      "admin/components/website/code-injection-settings.tsx",
    );
    const shell = read("admin/components/layout/admin-shell.tsx");
    const adminNotificationsBell = read(
      "admin/components/notifications/notifications-bell.tsx",
    );
    const createSchool = read("admin/components/layout/create-school-form.tsx");
    const products = read("admin/app/products/page.tsx");
    const resources = read("admin/components/resources.tsx");
    const productWorkspace = read("admin/components/products/product-workspace.tsx");
    const lessonAuthoring = read("admin/components/products/lesson-authoring.tsx");
    const scormUpload = read("admin/components/products/scorm-lesson-upload.tsx");
    const sectionAuthoring = read("admin/components/products/section-authoring.tsx");
    const paymentPlanList = read("admin/components/products/payment-plan-list.tsx");
    const paymentPlanDialog = read("admin/components/products/payment-plan-dialog.tsx");
    const featuredImage = read("admin/components/products/product-featured-image.tsx");
    const certificates = read("admin/components/products/product-certificates.tsx");
    const analytics = read("admin/components/products/product-analytics.tsx");
    const mediaPicker = read("admin/components/products/media-picker.tsx");
    const mediaUploader = read("admin/lib/course-media-uploader.ts");
    const mediaLibrary = read("admin/app/media/page.tsx");
    const contentPages = read("admin/components/content/frontlit-page-list.tsx");
    const featuredCard = read("admin/components/featured-card.tsx");
    const pageEditor = read("admin/components/content/frontlit-page-editor.tsx");
    const blogEditor = read("admin/components/content/frontlit-blog-editor.tsx");
    const blogFeaturedImage = read("admin/components/content/blog-featured-image.tsx");
    const writingEditorShell = read(
      "admin/components/content/writing-editor-shell.tsx",
    );
    const writingEditorHeader = read(
      "admin/components/content/writing-editor-document-header.tsx",
    );
    const communities = read("admin/app/communities/page.tsx");
    const communityPage = read("admin/app/community/page.tsx");
    const spacesPage = read("admin/app/spaces/page.tsx");
    const spacesAdmin = read("admin/components/spaces/spaces-admin.tsx");
    const acceptInvitation = read("admin/app/invitations/accept/page.tsx");
    const teamInvitation = read("admin/app/team-invitations/[invitationId]/page.tsx");
    const teamInvitationLayout = read(
      "admin/app/team-invitations/[invitationId]/layout.tsx",
    );
    const communityWorkspace = read("admin/components/communities/community-admin.tsx");
    const communityFeaturedImage = read(
      "admin/components/communities/community-featured-image.tsx",
    );
    const communityPlansPage = read("admin/app/community/plans/page.tsx");
    const discussionReports = read(
      "admin/components/products/product-discussion-reports.tsx",
    );
    const learnerSidebar = read("learners/components/layout/learner-sidebar.tsx");
    const learnerDashboardLayout = read(
      "learners/components/dashboard/learner-dashboard-layout.tsx",
    );
    const learnerFeed = read("learners/components/dashboard/learner-feed.tsx");
    const learnerProducts = read("learners/components/dashboard/learner-products.tsx");
    const learnerCommunities = read("learners/app/communities/page.tsx");
    const publicCommunitiesCatalog = read(
      "learners/components/public-communities-catalog.tsx",
    );
    const learnerSpacePost = read(
      "learners/app/(loggedin)/dashboard/s/[spaceId]/[postId]/page.tsx",
    );
    const learnerCommunityComponent = read(
      "learners/components/communities/learner-community.tsx",
    );
    const learnerCommunityEditor = read(
      "learners/components/communities/learner-rich-text-editor.tsx",
    );
    const learnerPostComposer = read(
      "learners/components/communities/learner-post-composer-dialog.tsx",
    );
    const learnerNotifications = read(
      "learners/app/(loggedin)/dashboard/notifications/page.tsx",
    );
    const learnerNotificationsComponent = read(
      "learners/components/notifications/learner-notifications.tsx",
    );
    const learnerShell = read("learners/components/layout/learner-shell.tsx");
    const learnerNotificationsBell = read(
      "learners/components/notifications/learner-notifications-bell.tsx",
    );
    const learnerAccount = read("learners/app/(loggedin)/dashboard/account/page.tsx");
    const productRootPlaceholder = ["$", "{productRoot}"].join("");
    const publicProductPath = [
      "/product/",
      "$",
      "{encodeURIComponent(product.id)}",
    ].join("");
    const publicCommunityPath = [
      "/communities/",
      "$",
      "{encodeURIComponent(community.id)}",
    ].join("");
    const adminSurface = `${schools}\n${createSchool}`;
    expect(home).not.toContain("Create a school to get started");
    expect(home).not.toContain("CreateSchoolDialog");
    expect(account).toContain("@frontlit/media-uploader");
    expect(account).toContain('purpose: "learner_avatar"');
    expect(account).not.toContain('type="file"');
    expect(schools).toContain("New school");
    expect(sidebar).toContain("/settings");
    expect(sidebar).toContain('label: "Website"');
    expect(sidebar.indexOf('href: "/website/pages"')).toBeLessThan(
      sidebar.indexOf('href: "/website/blogs"'),
    );
    expect(sidebar.indexOf('href: "/website/blogs"')).toBeLessThan(
      sidebar.indexOf('href: "/website/settings"'),
    );
    expect(sidebar).toContain('href: "/website/settings"');
    expect(sidebar).toContain('href: "/settings?tab=api-keys"');
    expect(sidebar).toContain('href: "/settings?tab=team"');
    expect(sidebar).toContain('href: "/settings?tab=payment"');
    expect(sidebar).toContain('href: "/mails/settings"');
    expect(sidebar).not.toContain('{ href: "/settings?tab=mails", label: "Mails" }');
    expect(sidebar).toContain('href: "/media"');
    expect(sidebar).not.toContain('href: "/schools"');
    expect(sidebar).not.toContain('href: "/invitations/accept"');
    expect(settings).toContain('params.set("tab"');
    expect(branding).toContain('redirect("/website/settings?tab=branding")');
    expect(website).toContain('redirect("/website/pages")');
    expect(websitePages).toContain("<FrontLitPageList />");
    expect(websiteBlogs).toContain("<FrontLitPageList onlyBlogs />");
    expect(websitePageEditor).toContain("<FrontLitPageEditor");
    expect(websiteBlogEditor).toContain("<FrontLitBlogEditor");
    expect(websiteSettings).toContain('return <SettingsPage mode="website" />');
    expect(mailSettings).toContain('return <SettingsPage mode="mails" />');
    expect(teamSettings).toContain('"/api/v1/school/team"');
    expect(teamSettings).toContain('"/api/v1/invitations"');
    expect(teamSettings).toContain("PermissionPicker");
    expect(teamSettings).not.toContain("team-invite-role");
    expect(teamSettings).toContain("Pending");
    expect(teamSettings).toContain("Remove team member");
    expect(teamSettings).toContain("Edit permissions");
    expect(teamSettings).toContain("saveMemberPermissions");
    expect(teamSettings).toContain('method: "PATCH"');
    expect(teamSettings).toContain("resendInvitation");
    expect(acceptInvitation).toContain("window.location.search");
    expect(teamInvitation).toContain("/api/v1/team-invitations/preview");
    expect(teamInvitation).toContain('action === "accept"');
    expect(teamInvitation).toContain('action === "reject"');
    expect(teamInvitation).toContain("persistInvitationToken(invitationId");
    expect(teamInvitationLayout).toContain('content="no-referrer"');
    expect(brandingSettings).toContain('"/api/v1/school/website/branding"');
    expect(codeInjectionSettings).toContain('"/api/v1/school/code-injection"');
    expect(settings).toContain('"branding",');
    expect(settings).toContain('"payment", "team", "api-keys"] as const');
    expect(settings).toContain('"api-keys"] as const');
    expect(settings).toContain('value="team"');
    expect(settings).toContain('value="api-keys"');
    expect(settings).toContain('value="payment"');
    expect(settings).toContain("Payment");
    expect(settings).toContain("Code Injection");
    expect(settings).not.toContain('label: "Miscellaneous"');
    expect(settings).toContain("/api/v1/schools/");
    expect(settings).toContain('method: "PATCH"');
    expect(settings).toContain("Currency saved.");
    expect(settings).toContain("/api/v1/school/payment-settings");
    expect(settings).not.toContain("/api/v1/settings/payment");
    expect(shell).toContain('router.replace("/schools")');
    expect(adminSurface).toContain('name="subdomain"');
    expect(createSchool).toContain("/api/v1/billing/catalog");
    expect(createSchool).toContain("Continue to checkout");
    expect(createSchool).toContain("Create school");
    expect(home).not.toContain("/api/v1/invitations");
    expect(products).toContain("Products");
    expect(products).toContain("<FeaturedCard");
    expect(products).toContain("href={`/products/${product.id}`}");
    expect(contentPages).toContain("<FeaturedCard");
    expect(contentPages).toContain("page.featuredImage");
    expect(contentPages).toContain("page.excerpt");
    expect(contentPages).toContain("/edit");
    expect(contentPages).not.toContain("<Pencil");
    expect(contentPages).not.toContain(">Edit</");
    expect(contentPages).toContain("gap-y-3");
    expect(communityWorkspace).toContain("<FeaturedCard");
    expect(communityWorkspace).toContain('href="/community"');
    expect(communityWorkspace).toContain("item.featuredImage?.thumbnailUrl");
    expect(communityWorkspace).toContain("gap-y-3");
    expect(communityWorkspace).toContain("shareCommunity");
    expect(communityWorkspace).toContain(publicCommunityPath);
    expect(featuredCard).toContain("FALLBACK_IMAGE");
    expect(featuredCard).toContain("h-36 w-full");
    expect(featuredCard).toContain("flex h-full flex-col");
    expect(products).toContain("gap-y-3");
    expect(products).toContain("/products/new");
    expect(products).toContain("/api/v1/products");
    expect(products).toContain("ITEMS_PER_PAGE = 9");
    expect(products).toContain("currencySymbol");
    expect(read("admin/components/featured-card.tsx")).toContain(
      'const FALLBACK_IMAGE = "/courselit_backdrop_square.webp"',
    );
    expect(products).toContain("setLoading(true)");
    expect(products).toContain("No Products Found");
    expect(products).toContain("You have not added any products yet.");
    expect(products).toContain("customers");
    expect(products).toContain("https://docs.courselit.app/courses/introduction/");
    expect(products).toContain("https://docs.courselit.app/downloads/introduction/");
    expect(resources).toContain('target="_blank"');
    expect(productWorkspace).toContain("/api/v1/products/");
    expect(productWorkspace).toContain("lessonsBySection");
    expect(productWorkspace).toContain(
      'changePublishStatus(checked === true ? "published" : "draft")',
    );
    expect(productWorkspace).toContain("Digital download");
    expect(productWorkspace).toContain(
      'product.kind === "download" ? "Add File" : "Add Lesson"',
    );
    expect(productWorkspace).toContain('product.kind === "course" ?');
    expect(productWorkspace).toContain("Add a section to start organizing this");
    expect(productWorkspace).toContain(`href={\`${productRootPlaceholder}/content\`}`);
    expect(productWorkspace).toContain(`href={\`${productRootPlaceholder}/manage\`}`);
    expect(productWorkspace).toContain("function LessonTypeIcon");
    expect(productWorkspace).toContain(
      '<FileText className="size-4 text-muted-foreground" />',
    );
    expect(productWorkspace).toContain(
      '<Video className="size-4 text-muted-foreground" />',
    );
    expect(productWorkspace).toContain(
      '<HelpCircle className="size-4 text-muted-foreground" />',
    );
    expect(productWorkspace).toContain(
      '<Headphones className="size-4 text-muted-foreground" />',
    );
    expect(productWorkspace).toContain(
      '<FileImage className="size-4 text-muted-foreground" />',
    );
    expect(productWorkspace).toContain(
      '<File className="size-4 text-muted-foreground" />',
    );
    expect(productWorkspace).toContain(
      '<Tv className="size-4 text-muted-foreground" />',
    );
    expect(productWorkspace).toContain(
      '<Package className="size-4 text-muted-foreground" />',
    );
    expect(productWorkspace).toContain("Invite a customer");
    expect(productWorkspace).toContain("learnerUrl");
    expect(productWorkspace).toContain(publicProductPath);
    expect(productWorkspace).toContain("Edit page");
    expect(productWorkspace).toContain(
      '/pages/${encodeURIComponent(product.salesPage?.pageId ?? "")}/edit?redirectTo=',
    );
    expect(productWorkspace).toContain("/api/v1/memberships");
    expect(productWorkspace).toContain('aria-label="Share product"');
    expect(productWorkspace).toContain("NEXT_PUBLIC_LEARNER_ORIGIN");
    expect(productWorkspace).toContain(
      "Enable lesson-specific discussions for this course",
    );
    expect(productWorkspace).toContain("manage/discussions/reports");
    expect(productWorkspace).toContain("Lead Magnet");
    expect(productWorkspace).toContain("Danger zone");
    expect(productWorkspace).toContain("<Switch");
    expect(productWorkspace).toContain("Only accessible via direct link.");
    expect(productWorkspace).toContain(
      "Product must have exactly one free payment plan",
    );
    expect(productWorkspace).toContain("Type &quot;delete&quot; to confirm");
    expect(lessonAuthoring).toContain("LessonTypeCards");
    expect(lessonAuthoring).toContain('label="Preview"');
    expect(lessonAuthoring).toContain('label="Visibility"');
    expect(lessonAuthoring).toContain("@frontlit/text-editor");
    expect(lessonAuthoring).toContain("ResizeObserver");
    expect(lessonAuthoring).toContain('type: "embed-resize"');
    expect(lessonAuthoring).toContain("height={height}");
    expect(lessonAuthoring).toContain('method: "DELETE"');
    expect(lessonAuthoring).toContain("Save the lesson first");
    expect(scormUpload).toContain("scormResponseError");
    expect(scormUpload).toContain(
      `Invalid SCORM package: Entry point "\${entryPoint}" not found`,
    );
    expect(scormUpload).toContain("packageFileCount");
    expect(scormUpload).toContain("{packageFileCount ?? 0} files");
    expect(scormUpload).not.toContain("Private MediaLit asset");
    expect(sectionAuthoring).toContain("Content Release");
    expect(sectionAuthoring).toContain("Scheduled Release");
    expect(sectionAuthoring).toContain("dripDelaySeconds");
    expect(sectionAuthoring).toContain("Release days after previous section");
    expect(sectionAuthoring).toContain(
      "https://docs.courselit.app/courses/section/#drip-a-section",
    );
    expect(paymentPlanList).toContain("New Plan");
    expect(paymentPlanList).toContain('title = "Pricing"');
    expect(paymentPlanList).toContain("Manage your product's pricing plans");
    expect(paymentPlanList).toContain("Archive this payment plan?");
    expect(paymentPlanDialog).toContain("Edit payment plan");
    expect(paymentPlanDialog).toContain("EMI / installments");
    expect(paymentPlanDialog).toContain("One-time Amount");
    expect(paymentPlanDialog).toContain("Subscription Type");
    expect(paymentPlanDialog).toContain("Monthly Payments (All fields required)");
    expect(paymentPlanDialog).toContain("Total:");
    expect(paymentPlanDialog).toContain("getCurrencySymbol");
    expect(paymentPlanDialog).toContain(
      "Currency is managed centrally in School settings.",
    );
    expect(paymentPlanList).toContain("includedProducts.length");
    expect(productWorkspace).toContain("featuredImage");
    expect(productWorkspace).toContain(
      "The URL-friendly identifier for this product page.",
    );
    expect(featuredImage).toContain("Select featured image");
    expect(featuredImage).toContain("@frontlit/media-uploader");
    expect(certificates).toContain("Issue certificates");
    expect(certificates).toContain("<Switch");
    expect(certificates).toContain("Certificate preview");
    expect(certificates).toContain("signatureImageId");
    expect(certificates).toContain("maxLength={400}");
    expect(certificates).toContain("for completing the course.");
    expect(certificates).toContain("encodeURIComponent(productId)");
    expect(certificates).toContain("A deleted or cross-school asset");
    expect(mediaPicker).toContain('purpose: "lesson_media"');
    expect(mediaPicker).toContain('accessPolicy: "private"');
    expect(mediaPicker).toContain("selectedItem");
    expect(mediaPicker).toContain("getCourseLitMedia");
    expect(mediaPicker).toContain("filterCourseLitMediaAdapters");
    expect(mediaPicker).toContain("mediaMatchesAcceptedTypes");
    expect(mediaPicker).not.toContain("Open media library");
    expect(mediaPicker).not.toContain("disabled={loading || Boolean(value)}");
    expect(mediaPicker).toContain("onChange(null)");
    expect(mediaUploader).toContain("@frontlit/media-uploader");
    expect(mediaUploader).toContain("matchesMime");
    expect(mediaUploader).toContain("filterCourseLitMediaAdapters");
    expect(mediaLibrary).toContain("{item.thumbnailUrl ? (");
    expect(mediaLibrary).toContain("src={item.thumbnailUrl}");
    expect(mediaUploader).toContain("searchCourseLitUnsplash");
    expect(analytics).toContain("People who completed the course");
    expect(analytics).toContain("https://docs.courselit.app/courses/add-content/");
    expect(analytics).toContain(
      "Your product is empty. Add some content to make it look interesting.",
    );
    expect(analytics).toContain("Edit content");
    expect(productWorkspace).toContain("Analytics time range");
    expect(productWorkspace).toContain("formatUpdatedAt");
    expect(productWorkspace).toContain("<ProductAnalytics");
    expect(discussionReports).toContain("Reported content");
    expect(products).not.toContain('form.get("body")');
    expect(communities).toContain('redirect("/community")');
    expect(communityPage).toContain("CommunityAdmin");
    expect(spacesPage).toContain("SpacesAdmin");
    expect(spacesAdmin).toContain("<Dialog");
    expect(spacesAdmin).toContain("open={creating || Boolean(editing)}");
    expect(spacesAdmin).toContain(
      '<DialogTitle>{editing ? "Edit space" : "New space"}</DialogTitle>',
    );
    expect(spacesAdmin).toContain('fetch("/api/v1/community"');
    expect(spacesAdmin).toContain("Only specific members");
    expect(spacesAdmin).toContain("All members");
    expect(spacesAdmin).toContain("selectedCommunityPlanIds");
    expect(spacesAdmin).toContain("<DropdownMenuCheckboxItem");
    expect(spacesAdmin).toContain("Delete “{deleting?.name}”?");
    expect(spacesAdmin).toContain("Move existing posts to");
    expect(spacesAdmin).toContain("attached media will be preserved");
    expect(spacesAdmin).toContain('variant="destructive"');
    expect(communityWorkspace).toContain("Community");
    expect(communityWorkspace).toContain("/api/v1/community");
    expect(communityWorkspace).not.toContain("New community");
    expect(sidebar).toContain('label: "Community"');
    expect(sidebar).toContain('href: "/community"');
    expect(sidebar).toContain('label: "Spaces"');
    expect(sidebar).toContain('href: "/spaces"');
    expect(sidebar).not.toContain('label: "Communities"');
    expect(communityWorkspace).toContain("/api/v1/communities");
    expect(communityWorkspace).toContain("/api/v1/community-memberships/");
    expect(communityWorkspace).toContain("/api/v1/community-reports/");
    expect(communityWorkspace).toContain("CommunityOverview");
    expect(communityWorkspace).toContain("community.postsCount");
    expect(communityWorkspace).not.toContain("<ArrowLeft");
    expect(sectionAuthoring).not.toContain("<ArrowLeft");
    expect(lessonAuthoring).not.toContain("<ArrowLeft");
    expect(discussionReports).not.toContain("Product manage");
    expect(acceptInvitation).toContain("useSetBreadcrumb");
    expect(acceptInvitation).not.toContain("Back to dashboard");
    expect(communityWorkspace).toContain("Payment plans");
    expect(communityWorkspace).toContain("CommunityMediaPreview");
    expect(communityWorkspace).toContain("togglePostPin");
    expect(communityWorkspace).not.toContain("addCategory");
    expect(communityWorkspace).not.toContain("Delete category");
    expect(communityWorkspace).toContain('href="/spaces"');
    expect(communityWorkspace).toContain("featuredImage");
    expect(communityWorkspace).toContain("CommunityFeaturedImage");
    expect(communityWorkspace).toContain("RichTextEditor");
    expect(communityWorkspace).toContain('purpose="community_content"');
    expect(communityWorkspace).toContain("Optional announcement shown to learners");
    expect(communityWorkspace).toContain("community.banner");
    expect(communityWorkspace).toContain("CommunityDescription");
    expect(communityWorkspace).toContain("communityRichTextContent");
    expect(communityFeaturedImage).toContain('purpose: "community_artwork"');
    expect(communityFeaturedImage).toContain("@frontlit/media-uploader");
    expect(communityFeaturedImage).toContain("filterCourseLitMediaAdapters");
    expect(communityFeaturedImage).toContain("allowUnsplash");
    expect(communityFeaturedImage).toContain("toMediaRef");
    expect(communityFeaturedImage).not.toContain("fetch(selected.src)");
    expect(communityFeaturedImage).not.toContain("new File([blob]");
    expect(learnerCommunityEditor).toContain("annotateOwnedImages");
    expect(learnerCommunityEditor).toContain("selectedMediaByUrl");
    expect(learnerCommunityEditor).toContain("mediaId");
    expect(communityWorkspace).toContain("Load more posts");
    expect(communityWorkspace).toContain("Load more memberships");
    expect(communityWorkspace).toContain("Load more reports");
    expect(communityWorkspace).toContain("Post pinned.");
    expect(communityWorkspace).toContain("thumbnailUrl");
    expect(communityWorkspace).toContain(
      "The reported content is no longer available.",
    );
    expect(communityWorkspace).not.toContain("Start a discussion");
    expect(communityPlansPage).toContain('manageSection="plans"');
    const legacyDashboardLabel = ["My", "content"].join(" ");
    expect(communityWorkspace).not.toContain(legacyDashboardLabel);
    expect(sidebar).not.toContain(legacyDashboardLabel);
    expect(learnerSidebar).not.toContain(`label: "${legacyDashboardLabel}"`);
    expect(learnerSidebar).toContain('href: "/dashboard"');
    expect(learnerSidebar).toContain('label: "Home", icon: Home');
    expect(learnerSidebar).toContain("/dashboard/s/");
    expect(learnerSidebar).toContain('href: "/dashboard/products"');
    expect(learnerDashboardLayout).toContain(
      'headerTitle={isProducts ? "Products" : "Feed"}',
    );
    expect(learnerDashboardLayout).not.toContain("PlatformTabNav");
    expect(learnerDashboardLayout).not.toContain('ariaLabel="Learner content"');
    expect(learnerFeed).toContain("/api/v1/learner/feed");
    expect(learnerFeed).toContain("FeedComposer");
    expect(learnerFeed).toContain("feedResponseSchema");
    expect(learnerFeed).toContain("FeedAnnouncement banner={banner}");
    expect(learnerFeed).not.toContain("Space announcement");
    expect(learnerFeed).not.toContain("Pencil");
    expect(learnerProducts).toContain("/api/v1/learner/products");
    expect(learnerSidebar).not.toContain('href: "/communities"');
    expect(learnerSidebar).toContain('href="/dashboard/notifications"');
    expect(learnerSidebar).toContain('href="/dashboard/account"');
    expect(learnerAccount).toContain('useLearnerSession("/dashboard/account")');
    expect(learnerAccount).toContain("Notification settings");
    expect(learnerCommunities).toContain("notFound()");
    expect(publicCommunitiesCatalog).toContain("@frontlit/page-builder/primitives");
    expect(publicCommunitiesCatalog).toContain("/api/v1/public/communities");
    expect(learnerSpacePost).toContain("spaceId");
    expect(learnerSpacePost).toContain("<LearnerSpacePost");
    expect(learnerSpacePost).not.toContain("communityId");
    expect(learnerCommunityComponent).toContain("/api/v1/learner/communities");
    expect(learnerCommunityComponent).toContain("/api/v1/learner/community-posts/");
    expect(learnerCommunityComponent).toContain("/leave");
    expect(learnerCommunityComponent).toContain("Leave community");
    expect(learnerCommunityComponent).toContain("<LearnerPostComposerDialog");
    expect(learnerPostComposer).toContain('submitting ? "Posting…" : "Post"');
    expect(learnerCommunityComponent).toContain("Add a comment");
    expect(learnerCommunityComponent).toContain("@frontlit/media-uploader");
    expect(learnerCommunityComponent).toContain(
      "acceptedTypes={COMMUNITY_MEDIA_ACCEPTED_TYPES}",
    );
    expect(learnerCommunityComponent).toContain("reportComment");
    expect(learnerCommunityComponent).toContain("deleteComment");
    expect(learnerCommunityComponent).toContain("Deleted");
    expect(learnerCommunityComponent).toContain("comment.deletedAt");
    expect(learnerCommunityComponent).toContain("commentTargetId");
    expect(learnerCommunityComponent).toContain("scrollIntoView");
    expect(learnerCommunityComponent).toContain("id={comment.id}");
    expect(learnerCommunityComponent).toContain("toggleCommentReaction");
    expect(learnerCommunityComponent).toContain("reactionCount");
    expect(learnerCommunityComponent).toContain("commentsCount");
    expect(learnerCommunityComponent).toContain("Load more posts");
    expect(learnerCommunityComponent).toContain("Load more comments");
    expect(learnerCommunityComponent).toContain("Discussion categories");
    expect(learnerCommunityComponent).toContain("activeCategory");
    expect(learnerCommunityComponent).toContain("requestedPostId");
    expect(learnerCommunityComponent).toContain("displayedPosts");
    expect(learnerCommunityComponent).toContain("community.postsCount");
    expect(learnerCommunityComponent).toContain("postId?: string");
    expect(learnerCommunityComponent).toContain("LearnerSpacePost");
    expect(learnerCommunityComponent).toContain("/api/v1/learner/spaces/");
    expect(learnerCommunityComponent).toContain("community.featuredImage");
    expect(learnerCommunityComponent).toContain("community.banner");
    expect(learnerCommunityComponent).toContain("communityDescriptionHasContent");
    expect(learnerCommunityComponent).toContain("Community announcement");
    expect(learnerCommunityComponent).toContain("TextRenderer");
    expect(learnerCommunityComponent).toContain("LearnerRichTextEditor");
    expect(learnerCommunityComponent).toContain(
      'placeholder="Share something with the community…"',
    );
    expect(learnerCommunityComponent).toContain('"Add a comment…"');
    expect(learnerCommunityComponent).toContain('"Write a reply…"');
    expect(learnerCommunityComponent).toContain("showToolbar={false}");
    expect(learnerCommunityEditor).toContain("@frontlit/text-editor");
    expect(learnerCommunityEditor).toContain("@frontlit/media-uploader");
    expect(learnerCommunityEditor).toContain("useLearnerCommunityMediaUploader");
    expect(learnerNotifications).toContain("LearnerNotifications");
    expect(learnerNotificationsComponent).toContain("/api/v1/learner/notifications");
    expect(learnerNotificationsComponent).toContain(
      "/api/v1/learner/notification-preferences",
    );
    expect(learnerNotificationsComponent).toContain("Notification preferences");
    expect(learnerNotificationsComponent).toContain("Load more notifications");
    expect(learnerNotificationsComponent).toContain("aria-label={`Enable");
    expect(contentPages).toContain("contentStatusLabel");
    expect(contentPages).toContain("encodeURIComponent(page.id)}/edit?redirectTo=");
    expect(contentPages).toContain("encodeURIComponent(page.id)}/edit?redirectTo=");
    expect(contentPages).not.toContain("publishContent");
    expect(pageEditor).toContain("@frontlit/page-builder/builder");
    expect(pageEditor).toContain("/discard-draft");
    expect(pageEditor).toContain("/publish");
    expect(pageEditor).toContain("Publish changes");
    expect(pageEditor).toContain('"/api/v1/school/website/branding"');
    expect(pageEditor).toContain("const pagePatch:");
    expect(pageEditor).toContain("state.seo.socialImage != null");
    expect(pageEditor).not.toContain("socialImage: state.seo.socialImage ?? null");
    expect(shell).toContain("isFullScreenPageEditor");
    expect(shell).toContain("NotificationsBell");
    expect(adminNotificationsBell).toContain("/api/v1/notifications");
    expect(adminNotificationsBell).toContain("new EventSource");
    expect(adminNotificationsBell).toContain("/api/v1/notifications/stream");
    expect(adminNotificationsBell).toContain("bg-red-500");
    expect(learnerShell).toContain("LearnerNotificationsBell");
    expect(learnerNotificationsBell).toContain("/api/v1/learner/notifications");
    expect(learnerNotificationsBell).toContain("new EventSource");
    expect(learnerNotificationsBell).toContain("/api/v1/learner/notifications/stream");
    expect(learnerNotificationsBell).toContain("bg-red-500");
    expect(pageEditor).toContain("h-dvh min-h-0");
    expect(pageEditor).toContain("min-w-0");
    expect(pageEditor).toContain("overflow-hidden");
    expect(pageEditor).not.toContain('className="h-full min-h-0 w-full"');
    expect(shell).toContain("data-full-screen-editor");
    expect(shell).toContain("h-dvh min-h-0 w-full min-w-0 overflow-hidden");
    expect(blogEditor).toContain("@frontlit/text-editor");
    expect(blogEditor).toContain("RichTextEditor");
    expect(blogEditor).toContain('purpose="blog_artwork"');
    expect(blogEditor).toContain("BlogFeaturedImage");
    expect(blogEditor).toContain("draftFeaturedImage");
    expect(blogFeaturedImage).toContain("@frontlit/media-uploader");
    expect(blogFeaturedImage).toContain('purpose: "blog_artwork"');
    expect(blogFeaturedImage).toContain("Remove image");
    expect(blogFeaturedImage).toContain("filterCourseLitMediaAdapters");
    expect(blogEditor).toContain("h-full min-h-0");
    expect(blogEditor).toContain("beforeContent");
    expect(writingEditorShell).toContain("Document settings");
    expect(writingEditorShell).toContain("h-dvh min-h-0 w-full");
    expect(writingEditorShell).toContain("Publish changes");
    expect(writingEditorHeader).toContain("Add a short description");
    expect(blogEditor).toContain("/discard-draft");
    expect(blogEditor).toContain("/publish");
    const navUser = read("admin/components/layout/nav-user.tsx");
    expect(navUser).toContain('href="/account"');
    expect(navUser).toContain("Account");
  });

  it("keeps the learner app on learner and public API routes", () => {
    const login = read("learners/app/login/page.tsx");
    const home = read("learners/app/[[...slug]]/page.tsx");
    const publicPage = read("learners/components/public-site-page.tsx");
    const publicProductsPage = read("learners/app/products/page.tsx");
    const publicProductsCatalog = read(
      "learners/components/public-products-catalog.tsx",
    );
    const publicProductDetailPage = read("learners/app/product/[productId]/page.tsx");
    const publicProductDetail = read("learners/components/public-product-detail.tsx");
    const publicCheckout = read("learners/components/public-checkout-session.tsx");
    const publicProductBlocks = read("learners/components/product-page-blocks.tsx");
    const publicBlogArticlePage = read("learners/app/blog/[slug]/[id]/page.tsx");
    const publicBlogPage = read("learners/app/blog/page.tsx");
    const publicBlogByIdPage = read("learners/app/blog/[slug]/page.tsx");
    const publicCommunityDetailPage = read(
      "learners/app/communities/[communityId]/page.tsx",
    );
    const loggedInLayout = read("learners/app/(loggedin)/layout.tsx");
    const publicBlogArticle = read("learners/components/public-blog-article.tsx");
    const publicBlogFeed = read("learners/components/public-blog-feed.tsx");
    const sitePageRenderer = read("learners/components/site-page-renderer.tsx");
    const themeProvider = read("learners/app/layout.tsx");
    const dashboard = read("learners/app/(loggedin)/dashboard/page.tsx");
    const dashboardLayout = read("learners/app/(loggedin)/dashboard/layout.tsx");
    const dashboardFeed = dashboard;
    const dashboardSpaceFeed = read(
      "learners/app/(loggedin)/dashboard/s/[spaceId]/page.tsx",
    );
    const dashboardProducts = read(
      "learners/app/(loggedin)/dashboard/products/page.tsx",
    );
    const dashboardFeedComponent = read(
      "learners/components/dashboard/learner-feed.tsx",
    );
    const dashboardProductsComponent = read(
      "learners/components/dashboard/learner-products.tsx",
    );
    const dashboardLayoutComponent = read(
      "learners/components/dashboard/learner-dashboard-layout.tsx",
    );
    const learnerShell = read("learners/components/layout/learner-shell.tsx");
    const learnerSidebar = read("learners/components/ui/sidebar.tsx");
    const learnerMobileHook = read("learners/hooks/use-mobile.ts");
    const course = read(
      "learners/app/(loggedin)/dashboard/courses/[productId]/page.tsx",
    );
    const embedViewer = read("learners/components/embed-viewer.tsx");
    const lessonViewer = read("learners/components/lesson-viewer.tsx");
    const discussions = read("learners/components/course-discussions.tsx");
    const discussionEditor = read("learners/components/learner-discussion-editor.tsx");
    const courseIndex = read(
      "learners/app/(loggedin)/dashboard/courses/[productId]/discussions/page.tsx",
    );
    const proxy = read("learners/app/api/[...path]/route.ts");
    const surface = `${login}\n${home}\n${publicPage}\n${publicProductsPage}\n${publicProductsCatalog}\n${publicProductDetailPage}\n${publicProductDetail}\n${publicCheckout}\n${publicProductBlocks}\n${publicBlogArticlePage}\n${publicBlogArticle}\n${themeProvider}\n${sitePageRenderer}\n${dashboard}\n${dashboardLayout}\n${dashboardFeed}\n${dashboardSpaceFeed}\n${dashboardProducts}\n${dashboardFeedComponent}\n${dashboardProductsComponent}\n${dashboardLayoutComponent}\n${course}\n${discussions}\n${discussionEditor}\n${courseIndex}\n${proxy}`;
    expect(publicPage).toContain("SitePageRenderer");
    expect(publicPage).toContain("SitePageSection");
    expect(publicPage).toContain("loadDataSlots");
    expect(publicProductsPage).toContain('systemRoute="products"');
    expect(home).toContain("publicSystemRouteForSlug");
    expect(publicProductsCatalog).toContain("@frontlit/page-builder/primitives");
    expect(publicProductsCatalog).toContain("useSchoolThemeStyle");
    expect(publicProductsCatalog).toContain("/api/v1/public/products");
    expect(publicProductsCatalog).toContain("/p/");
    expect(publicProductDetailPage).toContain('systemRoute="product"');
    expect(publicProductDetail).toContain("@frontlit/page-builder/primitives");
    expect(publicProductDetail).toContain("/api/v1/storefront/products/");
    expect(publicProductDetail).toContain("/api/v1/storefront/checkout-sessions");
    expect(publicCheckout).toContain("/api/v1/learner/checkout-sessions/");
    expect(publicCheckout).toContain("Check status again");
    expect(publicCheckout).toContain("Payment verified successfully");
    expect(publicCheckout).toContain("session.checkoutId");
    expect(publicProductBlocks).toContain("ProductCurriculumBlock");
    expect(publicProductBlocks).toContain("Continue learning");
    expect(publicBlogArticlePage).toContain("getPublicArticleBySlug");
    expect(publicBlogArticlePage).toContain('systemRoute="blog"');
    expect(publicBlogPage).toContain('systemRoute="blog"');
    expect(publicBlogByIdPage).toContain("documentId === slug");
    expect(publicCommunityDetailPage).toContain('systemRoute="community"');
    expect(loggedInLayout).toContain("LoggedInRoute");
    expect(publicBlogArticle).toContain("@frontlit/text-editor");
    expect(publicBlogArticle).toContain("TextRenderer");
    expect(publicBlogArticlePage).toContain("openGraph");
    expect(home).toContain("metadataImageUrl");
    expect(home).toContain("page.socialImage");
    expect(home).toContain("page.robotsAllowed === null");
    expect(publicBlogFeed).toContain("PageCardImage");
    expect(publicBlogFeed).toContain("featuredImage");
    expect(themeProvider).toContain("getSettings(await requestHost())");
    expect(themeProvider).toContain("CodeInjector");
    expect(themeProvider).toContain("codeInjectionBody");
    expect(themeProvider).not.toContain("resolveFrontLitTeamId");
    expect(home).not.toContain('window.location.replace("/login")');
    expect(publicPage).not.toContain('window.location.replace("/login")');
    expect(surface).toContain("LEARNER_THEME_MODE_KEY");
    expect(surface).toContain("localStorage.setItem");
    expect(surface).toContain("onThemeModeChange");
    expect(dashboard).toContain("<LearnerFeed");
    expect(dashboardLayout).toContain("LearnerDashboardLayout");
    expect(dashboardLayoutComponent).toContain("isSpacePost");
    expect(dashboardFeed).toContain("LearnerFeed");
    expect(dashboardSpaceFeed).toContain("spaceId={spaceId}");
    expect(dashboardProducts).toContain("LearnerProducts");
    expect(dashboardFeedComponent).toContain("/api/v1/learner/feed");
    expect(dashboardFeedComponent).toContain("FeedComposer");
    expect(dashboardProductsComponent).toContain("/api/v1/learner/products");
    expect(dashboardProductsComponent).toContain("LearnerProductCard");
    expect(learnerShell).toContain("<SidebarProvider defaultOpen={true}>");
    expect(learnerShell).toContain("<SidebarTrigger");
    expect(learnerSidebar).toContain("style={{ width: sidebarGapWidth }}");
    expect(learnerSidebar).toContain("style={{ width: sidebarPanelWidth }}");
    expect(learnerSidebar).toContain('aria-expanded={state === "expanded"}');
    expect(learnerMobileHook).toContain("setIsMobile(mql.matches)");
    expect(dashboardProductsComponent).toContain("BadgeCheck");
    expect(dashboardProductsComponent).toContain("BookOpen");
    expect(dashboardProductsComponent).toContain("Digital download");
    expect(dashboardProductsComponent).toContain("Array.from({ length: 6 }");
    expect(dashboard).not.toContain('name="schoolId"');
    expect(login).not.toContain('name="schoolId"');
    expect(proxy).toContain("x-forwarded-host");
    expect(surface).toContain("/api/v1/learner/auth/sign-in");
    expect(surface).toContain("/api/v1/learner/auth/sign-up");
    expect(surface).toContain("/api/v1/products/");
    expect(surface).toContain("/api/v1/learner/memberships");
    expect(surface).toContain("/api/v1/learner/lessons/");
    expect(surface).toContain("/discussions");
    expect(surface).toContain("Post comment");
    expect(surface).toContain("Load more comments");
    expect(surface).toContain("Delete");
    expect(discussions).toContain("LearnerDiscussionEditor");
    expect(discussions).toContain("TextRenderer");
    expect(discussions).toContain("initialContent={commentDraft}");
    expect(discussions).toContain("initialContent={replyDraft}");
    expect(discussions).toContain('placeholder="Write a reply…"');
    expect(discussionEditor).toContain("@frontlit/text-editor");
    expect(discussionEditor).toContain("showToolbar={false}");
    expect(courseIndex).toContain("/api/v1/learner/products/");
    expect(courseIndex).toContain("/api/v1/preview/products/");
    expect(courseIndex).toContain("x-preview-token");
    expect(courseIndex).toContain('get("preview")');
    expect(course).toContain("previewToken ?");
    expect(course).toContain("encodeURIComponent(previewToken)");
    expect(embedViewer).toContain("SandboxedEmbed");
    expect(embedViewer).toContain("youtube.com/embed");
    expect(lessonViewer).toContain('type === "embed"');
    expect(surface).not.toContain("/api/auth/");
    expect(surface).not.toContain("/api/v1/schools");
    expect(surface).not.toContain("/v1/api-keys");
    expect(proxy).toContain('path[0] !== "v1"');
  });
});
