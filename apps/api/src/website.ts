import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import type { MediaRef } from "@courselit/api-contract";
import { and, desc, eq, isNotNull, isNull, ne, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { SharedWidgetsRow, WebsiteWidgetRow } from "./db/schema/index.js";
import { normalizeMediaRef, syncMediaReferencesForContent } from "./media.js";
import type { AppDb } from "./types.js";

type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

export const WEBSITE_PAGE_PUBLIC_ID_PREFIX = "pg";
export const WEBSITE_THEME_PUBLIC_ID_PREFIX = "thm";
export const BLOG_POST_PUBLIC_ID_PREFIX = "blg";

const SHARED_WIDGET_NAMES = ["header", "footer"] as const;
type SharedWidgetName = (typeof SHARED_WIDGET_NAMES)[number];

/** Themes bundled with the page builder; custom themes use their public id. */
const BUILT_IN_THEME_IDS = new Set([
  "classic",
  "studio",
  "midnight",
  "editorial",
  "neobrutalism",
]);

/** Storefront routes that an ordinary page must never shadow. */
const RESERVED_PAGE_SLUGS = new Set([
  "blog",
  "products",
  "communities",
  "join",
  "login",
  "logout",
  "checkout",
  "dashboard",
  "course",
  "p",
]);

const MAX_SLUG_LENGTH = 200;
const EMPTY_RICH_TEXT = { type: "doc", content: [] } as const;

export type WebsiteContentStatus = "draft" | "published" | "published_with_changes";

// ---------------------------------------------------------------------------
// Default content
// ---------------------------------------------------------------------------

function richTextDocument(
  text: string,
  marks?: Array<{ type: string }>,
): Record<string, unknown> {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text, ...(marks ? { marks } : {}) }],
      },
    ],
  };
}

const bodyWidget = (
  widgetId: string,
  name: string,
  settings: Record<string, unknown> = {},
): WebsiteWidgetRow => ({
  widgetId,
  name,
  deletable: true,
  moveable: true,
  shared: false,
  settings,
});

export const DEFAULT_SHARED_WIDGETS: SharedWidgetsRow = {
  header: {
    widgetId: "shared-header",
    name: "header",
    deletable: false,
    moveable: false,
    shared: true,
    settings: {
      // Without an explicit padding the header inherits the theme's
      // section padding and renders much taller than a nav bar.
      verticalPadding: "py-4",
      logoText: "CourseLit",
      logoImage: "/icon.svg",
      ctaLabel: "Join",
      ctaHref: "/join",
      links: [
        { id: "courselit-header-products", label: "Products", href: "/products" },
        { id: "courselit-header-blog", label: "Blog", href: "/blog" },
      ],
    },
  },
  footer: {
    widgetId: "shared-footer",
    name: "footer",
    deletable: false,
    moveable: false,
    shared: true,
    settings: {
      logoText: "CourseLit",
      tagline: "Build, Sell & Market Your Courses And Digital Downloads",
      copyrightText: "© CourseLit. All rights reserved.",
      columns: [
        {
          id: "courselit-footer-resources",
          title: "Resources",
          links: [{ id: "courselit-footer-blog", label: "Blog", href: "/blog" }],
        },
        {
          id: "courselit-footer-legal",
          title: "Legal",
          links: [
            { id: "courselit-footer-terms", label: "Terms of use", href: "/terms" },
            {
              id: "courselit-footer-privacy",
              label: "Privacy policy",
              href: "/privacy",
            },
          ],
        },
      ],
    },
  },
};

export const HOME_PAGE_TEMPLATE: readonly WebsiteWidgetRow[] = [
  bodyWidget("courselit-home-intro", "rich-text", {
    text: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is the default page created for you by CourseLit. Customize this further from the ",
            },
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "Website → Pages → Homepage → Edit",
            },
            { type: "text", text: "." },
          ],
        },
      ],
    },
    alignment: "left",
    verticalPadding: "py-1",
  }),
  bodyWidget("courselit-home-hero", "hero", {
    title: "Your Eye Catching Hero Statement Goes Here",
    description: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "You can write " },
            {
              type: "text",
              marks: [{ type: "bold" }, { type: "underline" }],
              text: "rich text",
            },
            {
              type: "text",
              text: " here and also show images/videos/youtube videos alongside text, as shown here.",
            },
          ],
        },
      ],
    },
    buttonAction: "/products",
    buttonCaption: "Ask user to take action",
    secondaryButtonCaption: "",
    secondaryButtonAction: "",
    youtubeLink: "https://www.youtube.com/watch?v=7OP2bU9RWVE",
    alignment: "right",
    contentAlignment: "left",
    mediaRadius: 2,
    layout: "normal",
  }),
  bodyWidget("courselit-home-features", "grid", {
    title: "Showcase your features",
    description: richTextDocument(
      "Use this optional text to tell visitors what makes your school special.",
    ),
    headerAlignment: "center",
    items: [1, 2, 3].map((number) => ({
      title: `Feature ${number}`,
      description:
        "Describe a benefit of your courses, community, or learning experience.",
      buttonCaption: `Explore feature ${number}`,
      buttonAction: "/products",
    })),
    columns: 3,
  }),
  bodyWidget("courselit-home-faq", "faq", {
    title: "Frequently Asked Questions",
    headerAlignment: "center",
    verticalPadding: "py-8",
    layout: "list",
    items: [1, 2, 3].map((number) => ({
      id: `courselit-home-faq-${number}`,
      question: `Question ${number}`,
      answer: "Add a clear answer to a common question your visitors may have.",
    })),
  }),
  bodyWidget("courselit-home-newsletter", "newsletter-signup", {
    title: "Sign up for my newsletter",
    subtitle: "Get the latest articles, news, and updates.",
    btnText: "Subscribe",
    alignment: "left",
  }),
  bodyWidget("courselit-home-more-title", "rich-text", {
    text: richTextDocument("There's more!", [{ type: "bold" }]),
    alignment: "center",
    verticalPadding: "py-0",
  }),
  bodyWidget("courselit-home-more-copy", "rich-text", {
    text: richTextDocument(
      "There are many more blocks for you to use in the page builder. Start building!",
    ),
    alignment: "center",
    verticalPadding: "py-1",
  }),
];

/** System pages every school starts with. Their slugs are fixed. */
const SYSTEM_PAGES: ReadonlyArray<{
  slug: string;
  name: string;
  title: string;
  body: readonly WebsiteWidgetRow[];
}> = [
  { slug: "", name: "Homepage", title: "", body: HOME_PAGE_TEMPLATE },
  { slug: "terms", name: "Terms of Service", title: "Terms of Service", body: [] },
  { slug: "privacy", name: "Privacy policy", title: "Privacy policy", body: [] },
];

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function isSharedWidgetName(name: string): name is SharedWidgetName {
  return SHARED_WIDGET_NAMES.includes(name as SharedWidgetName);
}

function placeholder(name: SharedWidgetName, widgetId: string): WebsiteWidgetRow {
  return { widgetId, name, deletable: false, moveable: false, shared: true };
}

function pageLayout(
  clock: Clock,
  body: readonly WebsiteWidgetRow[] = [],
): WebsiteWidgetRow[] {
  return [
    placeholder("header", uuidv7(clock)),
    ...body.map((widget) => ({ ...widget })),
    placeholder("footer", uuidv7(clock)),
  ];
}

/** Canonicalizes a stored layout: exactly one header first and one footer
 * last. Existing placeholder ids are kept so builder selection is stable. */
function repairLayout(layout: WebsiteWidgetRow[]): WebsiteWidgetRow[] {
  const header = layout.find((widget) => widget.name === "header");
  const footer = layout.find((widget) => widget.name === "footer");
  return [
    placeholder("header", header?.widgetId ?? "header"),
    ...layout.filter((widget) => !isSharedWidgetName(widget.name)),
    placeholder("footer", footer?.widgetId ?? "footer"),
  ];
}

/** Fills header/footer placeholders from the school's shared widgets. */
function hydrateLayout(
  layout: WebsiteWidgetRow[],
  sharedWidgets: SharedWidgetsRow,
): WebsiteWidgetRow[] {
  return repairLayout(layout).map((widget) => {
    if (!isSharedWidgetName(widget.name)) return widget;
    const shared = sharedWidgets[widget.name];
    return {
      ...shared,
      widgetId: widget.widgetId,
      name: widget.name,
      deletable: false,
      moveable: false,
      shared: true,
      settings: shared.settings ?? {},
    };
  });
}

/** Splits a layout submitted by the builder into the page-local placeholder
 * layout and the school's shared header/footer settings. */
function splitSubmittedLayout(
  layout: WebsiteWidgetRow[],
  currentSharedWidgets: SharedWidgetsRow,
): Result<{ storedLayout: WebsiteWidgetRow[]; sharedWidgets: SharedWidgetsRow }> {
  const headers = layout.filter((widget) => widget.name === "header");
  const footers = layout.filter((widget) => widget.name === "footer");
  if (headers.length !== 1 || footers.length !== 1) {
    return invalid("page_requires_header_and_footer");
  }
  const header = headers[0]!;
  const footer = footers[0]!;
  return {
    ok: true,
    value: {
      storedLayout: [
        placeholder("header", header.widgetId),
        ...layout.filter((widget) => !isSharedWidgetName(widget.name)),
        placeholder("footer", footer.widgetId),
      ],
      sharedWidgets: {
        header: {
          ...currentSharedWidgets.header,
          name: "header",
          deletable: false,
          moveable: false,
          shared: true,
          settings: header.settings ?? {},
        },
        footer: {
          ...currentSharedWidgets.footer,
          name: "footer",
          deletable: false,
          moveable: false,
          shared: true,
          settings: footer.settings ?? {},
        },
      },
    },
  };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Draft/publish status is derived from the row, never stored. */
export function derivePageStatus(
  page: typeof schema.websitePages.$inferSelect,
): WebsiteContentStatus {
  if (!page.publishedAt) return "draft";
  const hasChanges =
    !sameJson(page.layout, page.draftLayout) ||
    page.title !== page.draftTitle ||
    page.description !== page.draftDescription ||
    !sameJson(page.socialImage, page.draftSocialImage) ||
    (page.robotsAllowed ?? null) !== (page.draftRobotsAllowed ?? null);
  return hasChanges ? "published_with_changes" : "published";
}

export function deriveBlogStatus(
  post: typeof schema.blogPosts.$inferSelect,
): WebsiteContentStatus {
  if (!post.publishedAt) return "draft";
  const hasChanges =
    post.title !== post.draftTitle ||
    !sameJson(post.content, post.draftContent) ||
    post.excerpt !== post.draftExcerpt ||
    !sameJson(post.featuredImage, post.draftFeaturedImage) ||
    !sameJson(post.meta ?? {}, post.draftMeta ?? {});
  return hasChanges ? "published_with_changes" : "published";
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

function invalid(reason: string): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("validation_failed", { safeDetails: { reason } }),
  };
}

function conflict(reason: string): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("conflict", { safeDetails: { reason } }),
  };
}

function notFound(): { ok: false; error: PlatformError } {
  return { ok: false, error: createPlatformError("not_found") };
}

/** Pages, products, and communities share the storefront's top-level URL
 * space, so a page slug must not be used by any of them. */
async function pageSlugTaken(
  db: AppDb,
  schoolId: string,
  slug: string,
  excludePageId?: string,
): Promise<boolean> {
  if (RESERVED_PAGE_SLUGS.has(slug)) return true;
  const [page, product, community] = await Promise.all([
    db
      .select({ id: schema.websitePages.id })
      .from(schema.websitePages)
      .where(
        and(
          eq(schema.websitePages.schoolId, schoolId),
          eq(schema.websitePages.slug, slug),
          ...(excludePageId ? [ne(schema.websitePages.id, excludePageId)] : []),
        ),
      )
      .limit(1),
    db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(and(eq(schema.products.schoolId, schoolId), eq(schema.products.slug, slug)))
      .limit(1),
    db
      .select({ id: schema.communities.id })
      .from(schema.communities)
      .where(
        and(eq(schema.communities.schoolId, schoolId), eq(schema.communities.slug, slug)),
      )
      .limit(1),
  ]);
  return page.length > 0 || product.length > 0 || community.length > 0;
}

async function blogSlugTaken(
  db: AppDb,
  schoolId: string,
  slug: string,
  excludePostId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: schema.blogPosts.id })
    .from(schema.blogPosts)
    .where(
      and(
        eq(schema.blogPosts.schoolId, schoolId),
        eq(schema.blogPosts.slug, slug),
        ...(excludePostId ? [ne(schema.blogPosts.id, excludePostId)] : []),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  let candidate = base;
  let attempt = 1;
  while (await isTaken(candidate)) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
  return candidate;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Settings and shared widgets
// ---------------------------------------------------------------------------

async function loadSettings(
  db: AppDb,
  schoolId: string,
  clock: Clock,
): Promise<typeof schema.websiteSettings.$inferSelect> {
  const [existing] = await db
    .select()
    .from(schema.websiteSettings)
    .where(eq(schema.websiteSettings.schoolId, schoolId))
    .limit(1);
  if (existing) return existing;
  // Like main, the site title starts out as the school's name.
  const [school] = await db
    .select({ name: schema.schools.name })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  const now = clock.now();
  await db
    .insert(schema.websiteSettings)
    .values({
      schoolId,
      title: school?.name ?? null,
      sharedWidgets: DEFAULT_SHARED_WIDGETS,
      draftSharedWidgets: DEFAULT_SHARED_WIDGETS,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  const [created] = await db
    .select()
    .from(schema.websiteSettings)
    .where(eq(schema.websiteSettings.schoolId, schoolId))
    .limit(1);
  return created!;
}

async function syncBrandingMediaReferences(
  db: AppDb,
  settings: typeof schema.websiteSettings.$inferSelect,
  clock: Clock,
): Promise<void> {
  await syncMediaReferencesForContent(
    db,
    {
      schoolId: settings.schoolId,
      resourceType: "school_branding",
      resourceInternalId: settings.schoolId,
      resourcePublicId: settings.schoolId,
      values: [settings.logo, settings.sharedWidgets, settings.draftSharedWidgets],
    },
    clock,
  );
}

export type WebsiteBrandingDto = {
  title: string | null;
  subtitle: string | null;
  logo: MediaRef | null;
  themeId: string | null;
};

function toBrandingDto(
  settings: typeof schema.websiteSettings.$inferSelect,
): WebsiteBrandingDto {
  return {
    title: settings.title,
    subtitle: settings.subtitle,
    logo: normalizeMediaRef(settings.logo),
    themeId: settings.themeId,
  };
}

/** Creates the school's website settings and system pages. Runs inside the
 * school creation transaction. */
export async function provisionWebsite(
  db: AppDb,
  input: { schoolId: string },
  clock: Clock,
): Promise<void> {
  const now = clock.now();
  await db.insert(schema.websiteSettings).values({
    schoolId: input.schoolId,
    sharedWidgets: DEFAULT_SHARED_WIDGETS,
    draftSharedWidgets: DEFAULT_SHARED_WIDGETS,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(schema.websitePages).values(
    SYSTEM_PAGES.map((page) => {
      const layout = pageLayout(clock, page.body);
      return {
        id: uuidv7(clock),
        publicId: createPublicId(WEBSITE_PAGE_PUBLIC_ID_PREFIX, clock),
        schoolId: input.schoolId,
        name: page.name,
        slug: page.slug,
        deletable: false,
        layout,
        title: page.title,
        description: "",
        publishedAt: now,
        draftLayout: layout,
        draftTitle: page.title,
        draftDescription: "",
        createdAt: now,
        updatedAt: now,
      };
    }),
  );
}

export async function getWebsiteBranding(
  db: AppDb,
  schoolId: string,
  clock: Clock,
): Promise<WebsiteBrandingDto> {
  return toBrandingDto(await loadSettings(db, schoolId, clock));
}

export async function updateWebsiteBranding(
  db: AppDb,
  schoolId: string,
  patch: Partial<WebsiteBrandingDto>,
  clock: Clock,
): Promise<Result<WebsiteBrandingDto>> {
  if (patch.themeId && !BUILT_IN_THEME_IDS.has(patch.themeId)) {
    const [theme] = await db
      .select({ id: schema.websiteThemes.id })
      .from(schema.websiteThemes)
      .where(
        and(
          eq(schema.websiteThemes.schoolId, schoolId),
          eq(schema.websiteThemes.publicId, patch.themeId),
        ),
      )
      .limit(1);
    if (!theme) return invalid("theme_not_found");
  }
  return db.transaction(async (tx) => {
    await loadSettings(tx as AppDb, schoolId, clock);
    const [updated] = await tx
      .update(schema.websiteSettings)
      .set({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
        ...(patch.logo !== undefined ? { logo: normalizeMediaRef(patch.logo) } : {}),
        ...(patch.themeId !== undefined ? { themeId: patch.themeId } : {}),
        updatedAt: clock.now(),
      })
      .where(eq(schema.websiteSettings.schoolId, schoolId))
      .returning();
    await syncBrandingMediaReferences(tx as AppDb, updated!, clock);
    return { ok: true as const, value: toBrandingDto(updated!) };
  });
}

export type PublicWebsiteSettingsDto = WebsiteBrandingDto & {
  theme: Record<string, unknown> | null;
};

export async function getPublicWebsiteSettings(
  db: AppDb,
  schoolId: string,
  clock: Clock,
): Promise<PublicWebsiteSettingsDto> {
  const settings = await loadSettings(db, schoolId, clock);
  let theme: Record<string, unknown> | null = null;
  if (settings.themeId && !BUILT_IN_THEME_IDS.has(settings.themeId)) {
    const [row] = await db
      .select({ style: schema.websiteThemes.style })
      .from(schema.websiteThemes)
      .where(
        and(
          eq(schema.websiteThemes.schoolId, schoolId),
          eq(schema.websiteThemes.publicId, settings.themeId),
        ),
      )
      .limit(1);
    theme = row?.style ?? null;
  }
  return { ...toBrandingDto(settings), theme };
}

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export type WebsiteThemeDto = {
  themeId: string;
  name: string;
  style: Record<string, unknown>;
  createdAt: string | null;
  updatedAt: string | null;
};

function toThemeDto(row: typeof schema.websiteThemes.$inferSelect): WebsiteThemeDto {
  return {
    themeId: row.publicId,
    name: row.name,
    style: row.style,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listWebsiteThemes(
  db: AppDb,
  schoolId: string,
): Promise<WebsiteThemeDto[]> {
  const rows = await db
    .select()
    .from(schema.websiteThemes)
    .where(eq(schema.websiteThemes.schoolId, schoolId))
    .orderBy(desc(schema.websiteThemes.updatedAt));
  return rows.map(toThemeDto);
}

export async function createWebsiteTheme(
  db: AppDb,
  schoolId: string,
  input: { name: string; style: Record<string, unknown> },
  clock: Clock,
): Promise<WebsiteThemeDto> {
  const now = clock.now();
  const [row] = await db
    .insert(schema.websiteThemes)
    .values({
      id: uuidv7(clock),
      publicId: createPublicId(WEBSITE_THEME_PUBLIC_ID_PREFIX, clock),
      schoolId,
      name: input.name,
      style: input.style,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return toThemeDto(row!);
}

export async function updateWebsiteTheme(
  db: AppDb,
  schoolId: string,
  themeId: string,
  patch: { name?: string; style?: Record<string, unknown> },
  clock: Clock,
): Promise<Result<WebsiteThemeDto>> {
  const [row] = await db
    .update(schema.websiteThemes)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.style !== undefined ? { style: patch.style } : {}),
      updatedAt: clock.now(),
    })
    .where(
      and(
        eq(schema.websiteThemes.schoolId, schoolId),
        eq(schema.websiteThemes.publicId, themeId),
      ),
    )
    .returning();
  return row ? { ok: true, value: toThemeDto(row) } : notFound();
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export type WebsiteContentSummaryDto = {
  id: string;
  name: string;
  kind: "page" | "blog";
  slug: string;
  status: WebsiteContentStatus;
  featuredImage?: MediaRef | null;
  excerpt?: string | null;
  updatedAt?: string | null;
};

export type WebsitePageDto = WebsiteContentSummaryDto & {
  pageId: string;
  deletable: boolean;
  publishedAt: string | null;
  layout: WebsiteWidgetRow[];
  title: string | null;
  description: string | null;
  socialImage: MediaRef | null;
  robotsAllowed: boolean | null;
  draftLayout: WebsiteWidgetRow[];
  draftTitle: string | null;
  draftDescription: string | null;
  draftSocialImage: MediaRef | null;
  draftRobotsAllowed: boolean | null;
  createdAt: string;
  salesResourceType?: "product" | "community";
  salesResourceId?: string;
  salesResourceKind?: "course" | "download" | null;
};

type PageRow = typeof schema.websitePages.$inferSelect;

function toPageSummary(row: PageRow): WebsiteContentSummaryDto {
  return {
    id: row.publicId,
    name: row.name,
    kind: "page",
    slug: row.slug,
    status: derivePageStatus(row),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function toPageDto(
  db: AppDb,
  row: PageRow,
  settings: typeof schema.websiteSettings.$inferSelect,
): Promise<WebsitePageDto> {
  let salesResource: Pick<
    WebsitePageDto,
    "salesResourceType" | "salesResourceId" | "salesResourceKind"
  > = {};
  if (row.productId) {
    const [product] = await db
      .select({ publicId: schema.products.publicId, kind: schema.products.kind })
      .from(schema.products)
      .where(eq(schema.products.id, row.productId))
      .limit(1);
    if (product) {
      salesResource = {
        salesResourceType: "product",
        salesResourceId: product.publicId,
        salesResourceKind: product.kind,
      };
    }
  } else if (row.communityId) {
    const [community] = await db
      .select({ publicId: schema.communities.publicId })
      .from(schema.communities)
      .where(eq(schema.communities.id, row.communityId))
      .limit(1);
    if (community) {
      salesResource = {
        salesResourceType: "community",
        salesResourceId: community.publicId,
        salesResourceKind: null,
      };
    }
  }
  return {
    ...toPageSummary(row),
    pageId: row.publicId,
    deletable: row.deletable,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    layout: hydrateLayout(row.layout, settings.sharedWidgets),
    title: row.title,
    description: row.description,
    socialImage: normalizeMediaRef(row.socialImage),
    robotsAllowed: row.robotsAllowed,
    draftLayout: hydrateLayout(row.draftLayout, settings.draftSharedWidgets),
    draftTitle: row.draftTitle,
    draftDescription: row.draftDescription,
    draftSocialImage: normalizeMediaRef(row.draftSocialImage),
    draftRobotsAllowed: row.draftRobotsAllowed,
    createdAt: row.createdAt.toISOString(),
    ...salesResource,
  };
}

async function findPage(
  db: AppDb,
  schoolId: string,
  pageId: string,
): Promise<PageRow | null> {
  const [row] = await db
    .select()
    .from(schema.websitePages)
    .where(
      and(
        eq(schema.websitePages.schoolId, schoolId),
        eq(schema.websitePages.publicId, pageId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function syncPageMediaReferences(
  db: AppDb,
  page: PageRow,
  clock: Clock,
): Promise<void> {
  await syncMediaReferencesForContent(
    db,
    {
      schoolId: page.schoolId,
      resourceType: "website_page",
      resourceInternalId: page.id,
      resourcePublicId: page.publicId,
      values: [page.layout, page.draftLayout, page.socialImage, page.draftSocialImage],
    },
    clock,
  );
}

/** Ordinary pages only. Sales pages are edited from their product/community. */
export async function listWebsitePages(
  db: AppDb,
  schoolId: string,
): Promise<WebsiteContentSummaryDto[]> {
  const rows = await db
    .select()
    .from(schema.websitePages)
    .where(
      and(
        eq(schema.websitePages.schoolId, schoolId),
        isNull(schema.websitePages.productId),
        isNull(schema.websitePages.communityId),
      ),
    )
    .orderBy(desc(schema.websitePages.updatedAt));
  return rows.map(toPageSummary);
}

export async function createWebsitePage(
  db: AppDb,
  schoolId: string,
  input: { name: string },
  clock: Clock,
): Promise<Result<WebsiteContentSummaryDto>> {
  const base = slugify(input.name) || "page";
  const slug = await uniqueSlug(base, (candidate) =>
    pageSlugTaken(db, schoolId, candidate),
  );
  const now = clock.now();
  const layout = pageLayout(clock);
  try {
    const [row] = await db
      .insert(schema.websitePages)
      .values({
        id: uuidv7(clock),
        publicId: createPublicId(WEBSITE_PAGE_PUBLIC_ID_PREFIX, clock),
        schoolId,
        name: input.name,
        slug,
        deletable: true,
        layout,
        draftLayout: layout,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return { ok: true, value: toPageSummary(row!) };
  } catch (error) {
    if (isUniqueViolation(error)) return conflict("slug_taken");
    throw error;
  }
}

export async function getWebsitePage(
  db: AppDb,
  schoolId: string,
  pageId: string,
  clock: Clock,
): Promise<Result<WebsitePageDto>> {
  const row = await findPage(db, schoolId, pageId);
  if (!row) return notFound();
  const settings = await loadSettings(db, schoolId, clock);
  return { ok: true, value: await toPageDto(db, row, settings) };
}

export type UpdateWebsitePageInput = Partial<{
  name: string;
  slug: string;
  layout: WebsiteWidgetRow[];
  title: string;
  description: string;
  socialImage: Record<string, unknown> | null;
  robotsAllowed: boolean;
}>;

/** Writes builder and SEO fields to the draft columns. Name and slug changes
 * apply immediately; everything else waits for publish. */
export async function updateWebsitePage(
  db: AppDb,
  schoolId: string,
  pageId: string,
  patch: UpdateWebsitePageInput,
  clock: Clock,
): Promise<Result<WebsitePageDto>> {
  const existing = await findPage(db, schoolId, pageId);
  if (!existing) return notFound();

  let slug: string | undefined;
  if (patch.slug !== undefined) {
    if (!existing.deletable) return invalid("page_slug_fixed");
    slug = slugify(patch.slug);
    if (!slug) return invalid("invalid_slug");
    if (slug !== existing.slug && (await pageSlugTaken(db, schoolId, slug, existing.id))) {
      return conflict("slug_taken");
    }
  }

  try {
    return await db.transaction(async (tx) => {
      const settings = await loadSettings(tx as AppDb, schoolId, clock);
      let storedLayout: WebsiteWidgetRow[] | undefined;
      let nextSettings = settings;
      if (patch.layout !== undefined) {
        const split = splitSubmittedLayout(patch.layout, settings.draftSharedWidgets);
        if (!split.ok) return split;
        storedLayout = split.value.storedLayout;
        const [updatedSettings] = await tx
          .update(schema.websiteSettings)
          .set({ draftSharedWidgets: split.value.sharedWidgets, updatedAt: clock.now() })
          .where(eq(schema.websiteSettings.schoolId, schoolId))
          .returning();
        nextSettings = updatedSettings!;
        await syncBrandingMediaReferences(tx as AppDb, nextSettings, clock);
      }
      const [row] = await tx
        .update(schema.websitePages)
        .set({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(storedLayout ? { draftLayout: storedLayout } : {}),
          ...(patch.title !== undefined ? { draftTitle: patch.title } : {}),
          ...(patch.description !== undefined
            ? { draftDescription: patch.description }
            : {}),
          ...(patch.socialImage !== undefined
            ? { draftSocialImage: normalizeMediaRef(patch.socialImage) }
            : {}),
          ...(patch.robotsAllowed !== undefined
            ? { draftRobotsAllowed: patch.robotsAllowed }
            : {}),
          updatedAt: clock.now(),
        })
        .where(eq(schema.websitePages.id, existing.id))
        .returning();
      await syncPageMediaReferences(tx as AppDb, row!, clock);
      return { ok: true as const, value: await toPageDto(tx as AppDb, row!, nextSettings) };
    });
  } catch (error) {
    if (slug !== undefined && isUniqueViolation(error)) return conflict("slug_taken");
    throw error;
  }
}

/** Promotes the page draft and the school's draft shared widgets. */
export async function publishWebsitePage(
  db: AppDb,
  schoolId: string,
  pageId: string,
  clock: Clock,
): Promise<Result<WebsitePageDto>> {
  const existing = await findPage(db, schoolId, pageId);
  if (!existing) return notFound();
  return db.transaction(async (tx) => {
    const settings = await loadSettings(tx as AppDb, schoolId, clock);
    const now = clock.now();
    const [nextSettings] = await tx
      .update(schema.websiteSettings)
      .set({ sharedWidgets: settings.draftSharedWidgets, updatedAt: now })
      .where(eq(schema.websiteSettings.schoolId, schoolId))
      .returning();
    const [row] = await tx
      .update(schema.websitePages)
      .set({
        layout: existing.draftLayout,
        title: existing.draftTitle,
        description: existing.draftDescription,
        socialImage: existing.draftSocialImage,
        robotsAllowed: existing.draftRobotsAllowed,
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.websitePages.id, existing.id))
      .returning();
    await syncBrandingMediaReferences(tx as AppDb, nextSettings!, clock);
    await syncPageMediaReferences(tx as AppDb, row!, clock);
    return { ok: true as const, value: await toPageDto(tx as AppDb, row!, nextSettings!) };
  });
}

/** Reverts the page draft and draft shared widgets to the published state. */
export async function discardWebsitePageDraft(
  db: AppDb,
  schoolId: string,
  pageId: string,
  clock: Clock,
): Promise<Result<WebsitePageDto>> {
  const existing = await findPage(db, schoolId, pageId);
  if (!existing) return notFound();
  return db.transaction(async (tx) => {
    const settings = await loadSettings(tx as AppDb, schoolId, clock);
    const now = clock.now();
    const [nextSettings] = await tx
      .update(schema.websiteSettings)
      .set({ draftSharedWidgets: settings.sharedWidgets, updatedAt: now })
      .where(eq(schema.websiteSettings.schoolId, schoolId))
      .returning();
    const [row] = await tx
      .update(schema.websitePages)
      .set({
        draftLayout: existing.layout,
        draftTitle: existing.title,
        draftDescription: existing.description,
        draftSocialImage: existing.socialImage,
        draftRobotsAllowed: existing.robotsAllowed,
        updatedAt: now,
      })
      .where(eq(schema.websitePages.id, existing.id))
      .returning();
    await syncBrandingMediaReferences(tx as AppDb, nextSettings!, clock);
    await syncPageMediaReferences(tx as AppDb, row!, clock);
    return { ok: true as const, value: await toPageDto(tx as AppDb, row!, nextSettings!) };
  });
}

export type PublicWebsitePageDto = {
  pageId: string;
  name: string;
  slug: string;
  layout: WebsiteWidgetRow[];
  title: string | null;
  description: string | null;
  socialImage: MediaRef | null;
  robotsAllowed: boolean | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

/** Published-only read for storefront rendering. A sales page is only public
 * while its product is published or its community is active. */
export async function getPublishedWebsitePage(
  db: AppDb,
  schoolId: string,
  slug: string,
  clock: Clock,
): Promise<PublicWebsitePageDto | null> {
  const [row] = await db
    .select({ page: schema.websitePages })
    .from(schema.websitePages)
    .leftJoin(schema.products, eq(schema.products.id, schema.websitePages.productId))
    .leftJoin(
      schema.communities,
      eq(schema.communities.id, schema.websitePages.communityId),
    )
    .where(
      and(
        eq(schema.websitePages.schoolId, schoolId),
        eq(schema.websitePages.slug, slug),
        isNotNull(schema.websitePages.publishedAt),
        or(
          isNull(schema.websitePages.productId),
          eq(schema.products.status, "published"),
        ),
        or(
          isNull(schema.websitePages.communityId),
          isNull(schema.communities.deletedAt),
        ),
      ),
    )
    .limit(1);
  if (!row) return null;
  const settings = await loadSettings(db, schoolId, clock);
  const page = row.page;
  return {
    pageId: page.publicId,
    name: page.name,
    slug: page.slug,
    layout: hydrateLayout(page.layout, settings.sharedWidgets),
    title: page.title,
    description: page.description,
    socialImage: normalizeMediaRef(page.socialImage),
    robotsAllowed: page.robotsAllowed,
    publishedAt: page.publishedAt?.toISOString() ?? null,
    updatedAt: page.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Sales pages
// ---------------------------------------------------------------------------

export type SalesPageResourceType = "product" | "community";

export type SalesPageDto = {
  resourceType: SalesPageResourceType;
  resourceId: string;
  slug: string;
  pageId: string | null;
};

function salesPageBody(input: {
  resourceType: SalesPageResourceType;
  resourcePublicId: string;
  productKind?: "course" | "download";
}): WebsiteWidgetRow[] {
  const id = input.resourcePublicId;
  if (input.resourceType === "community") {
    return [
      {
        widgetId: `${id}-sales-banner`,
        name: "courselit-community",
        deletable: false,
        moveable: true,
        shared: false,
        settings: { textPosition: "left", textAlignment: "left" },
      },
    ];
  }
  return [
    {
      widgetId: `${id}-sales-banner`,
      name: "courselit-product",
      deletable: false,
      moveable: true,
      shared: false,
      settings: { textPosition: "left", textAlignment: "left" },
    },
    ...(input.productKind === "course"
      ? [
          {
            widgetId: `${id}-sales-curriculum`,
            name: "courselit-product-curriculum",
            deletable: false,
            moveable: true,
            shared: false,
            settings: {
              title: "Curriculum",
              headerAlignment: "center",
              openByDefault: false,
            },
          },
        ]
      : []),
  ];
}

/** Creates a resource's published sales page, or keeps an existing one's
 * name and slug in sync with the resource. Existing layouts are never
 * overwritten. Runs inside the resource's create/update transaction. */
export async function ensureSalesPage(
  db: AppDb,
  input: {
    schoolId: string;
    resourceType: SalesPageResourceType;
    resourceId: string;
    resourcePublicId: string;
    name: string;
    description: string;
    slug: string;
    productKind?: "course" | "download";
  },
  clock: Clock,
): Promise<void> {
  const ownerColumn =
    input.resourceType === "product"
      ? schema.websitePages.productId
      : schema.websitePages.communityId;
  const [existing] = await db
    .select()
    .from(schema.websitePages)
    .where(eq(ownerColumn, input.resourceId))
    .limit(1);
  const now = clock.now();
  const name = `${input.name} sales page`;
  if (existing) {
    if (existing.name !== name || existing.slug !== input.slug) {
      await db
        .update(schema.websitePages)
        .set({ name, slug: input.slug, updatedAt: now })
        .where(eq(schema.websitePages.id, existing.id));
    }
    return;
  }
  const layout = pageLayout(clock, salesPageBody(input));
  await db.insert(schema.websitePages).values({
    id: uuidv7(clock),
    publicId: createPublicId(WEBSITE_PAGE_PUBLIC_ID_PREFIX, clock),
    schoolId: input.schoolId,
    ...(input.resourceType === "product"
      ? { productId: input.resourceId }
      : { communityId: input.resourceId }),
    name,
    slug: input.slug,
    deletable: false,
    layout,
    title: input.name,
    description: input.description,
    robotsAllowed: true,
    publishedAt: now,
    draftLayout: layout,
    draftTitle: input.name,
    draftDescription: input.description,
    draftRobotsAllowed: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function getSalesPage(
  db: AppDb,
  schoolId: string,
  resourceType: SalesPageResourceType,
  resourcePublicId: string,
): Promise<SalesPageDto | null> {
  const resource =
    resourceType === "product"
      ? (
          await db
            .select({
              publicId: schema.products.publicId,
              slug: schema.products.slug,
              pageId: schema.websitePages.publicId,
            })
            .from(schema.products)
            .leftJoin(
              schema.websitePages,
              eq(schema.websitePages.productId, schema.products.id),
            )
            .where(
              and(
                eq(schema.products.schoolId, schoolId),
                eq(schema.products.publicId, resourcePublicId),
              ),
            )
            .limit(1)
        )[0]
      : (
          await db
            .select({
              publicId: schema.communities.publicId,
              slug: schema.communities.slug,
              pageId: schema.websitePages.publicId,
            })
            .from(schema.communities)
            .leftJoin(
              schema.websitePages,
              eq(schema.websitePages.communityId, schema.communities.id),
            )
            .where(
              and(
                eq(schema.communities.schoolId, schoolId),
                eq(schema.communities.publicId, resourcePublicId),
                isNull(schema.communities.deletedAt),
              ),
            )
            .limit(1)
        )[0];
  if (!resource) return null;
  return {
    resourceType,
    resourceId: resource.publicId,
    slug: resource.slug,
    pageId: resource.pageId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

type BlogRow = typeof schema.blogPosts.$inferSelect;

export type BlogPostDto = WebsiteContentSummaryDto & {
  blogId: string;
  publishedAt: string | null;
  title: string | null;
  content: Record<string, unknown> | null;
  meta: Record<string, unknown>;
  draftTitle: string;
  draftContent: Record<string, unknown>;
  draftExcerpt: string | null;
  draftFeaturedImage: MediaRef | null;
  draftMeta: Record<string, unknown>;
  createdAt: string;
};

function toBlogSummary(row: BlogRow): WebsiteContentSummaryDto {
  const featuredImage = normalizeMediaRef(row.draftFeaturedImage ?? row.featuredImage);
  const excerpt = row.draftExcerpt ?? row.excerpt ?? null;
  return {
    id: row.publicId,
    name: row.draftTitle || row.title || "Untitled blog",
    kind: "blog",
    slug: row.slug,
    status: deriveBlogStatus(row),
    featuredImage,
    excerpt,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toBlogDto(row: BlogRow): BlogPostDto {
  return {
    ...toBlogSummary(row),
    blogId: row.publicId,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    title: row.title,
    content: row.content,
    meta: row.meta,
    draftTitle: row.draftTitle,
    draftContent: row.draftContent,
    draftExcerpt: row.draftExcerpt,
    draftFeaturedImage: normalizeMediaRef(row.draftFeaturedImage),
    draftMeta: row.draftMeta,
    createdAt: row.createdAt.toISOString(),
  };
}

async function findBlogPost(
  db: AppDb,
  schoolId: string,
  blogId: string,
): Promise<BlogRow | null> {
  const [row] = await db
    .select()
    .from(schema.blogPosts)
    .where(and(eq(schema.blogPosts.schoolId, schoolId), eq(schema.blogPosts.publicId, blogId)))
    .limit(1);
  return row ?? null;
}

async function syncBlogMediaReferences(
  db: AppDb,
  post: BlogRow,
  clock: Clock,
): Promise<void> {
  await syncMediaReferencesForContent(
    db,
    {
      schoolId: post.schoolId,
      resourceType: "blog_artwork",
      resourceInternalId: post.id,
      resourcePublicId: post.publicId,
      values: [post.content, post.draftContent, post.featuredImage, post.draftFeaturedImage],
    },
    clock,
  );
}

export async function listBlogPosts(
  db: AppDb,
  schoolId: string,
): Promise<WebsiteContentSummaryDto[]> {
  const rows = await db
    .select()
    .from(schema.blogPosts)
    .where(eq(schema.blogPosts.schoolId, schoolId))
    .orderBy(desc(schema.blogPosts.updatedAt));
  return rows.map(toBlogSummary);
}

export async function createBlogPost(
  db: AppDb,
  schoolId: string,
  input: { title: string; authorUserId: string },
  clock: Clock,
): Promise<Result<WebsiteContentSummaryDto>> {
  const [author] = await db
    .select({ id: schema.schoolAccounts.id })
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        eq(schema.schoolAccounts.userId, input.authorUserId),
      ),
    )
    .limit(1);
  const base = slugify(input.title) || "post";
  const slug = await uniqueSlug(base, (candidate) =>
    blogSlugTaken(db, schoolId, candidate),
  );
  const now = clock.now();
  try {
    const [row] = await db
      .insert(schema.blogPosts)
      .values({
        id: uuidv7(clock),
        publicId: createPublicId(BLOG_POST_PUBLIC_ID_PREFIX, clock),
        schoolId,
        authorSchoolAccountId: author?.id ?? null,
        slug,
        draftTitle: input.title,
        draftContent: { ...EMPTY_RICH_TEXT, content: [] },
        draftMeta: { tags: [] },
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return { ok: true, value: toBlogSummary(row!) };
  } catch (error) {
    if (isUniqueViolation(error)) return conflict("slug_taken");
    throw error;
  }
}

export async function getBlogPost(
  db: AppDb,
  schoolId: string,
  blogId: string,
): Promise<Result<BlogPostDto>> {
  const row = await findBlogPost(db, schoolId, blogId);
  return row ? { ok: true, value: toBlogDto(row) } : notFound();
}

export type UpdateBlogPostInput = Partial<{
  slug: string;
  title: string;
  content: Record<string, unknown>;
  excerpt: string;
  featuredImage: MediaRef | null;
  meta: Record<string, unknown>;
}>;

/** Writes to the draft columns. The slug applies immediately; `meta` is
 * shallow-merged so callers can patch a single field. */
export async function updateBlogPost(
  db: AppDb,
  schoolId: string,
  blogId: string,
  patch: UpdateBlogPostInput,
  clock: Clock,
): Promise<Result<BlogPostDto>> {
  const existing = await findBlogPost(db, schoolId, blogId);
  if (!existing) return notFound();
  let slug: string | undefined;
  if (patch.slug !== undefined) {
    slug = slugify(patch.slug);
    if (!slug) return invalid("invalid_slug");
    if (slug !== existing.slug && (await blogSlugTaken(db, schoolId, slug, existing.id))) {
      return conflict("slug_taken");
    }
  }
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(schema.blogPosts)
        .set({
          ...(slug !== undefined ? { slug } : {}),
          ...(patch.title !== undefined ? { draftTitle: patch.title } : {}),
          ...(patch.content !== undefined ? { draftContent: patch.content } : {}),
          ...(patch.excerpt !== undefined ? { draftExcerpt: patch.excerpt } : {}),
          ...(patch.featuredImage !== undefined
            ? { draftFeaturedImage: normalizeMediaRef(patch.featuredImage) }
            : {}),
          ...(patch.meta !== undefined
            ? { draftMeta: { ...existing.draftMeta, ...patch.meta } }
            : {}),
          updatedAt: clock.now(),
        })
        .where(eq(schema.blogPosts.id, existing.id))
        .returning();
      await syncBlogMediaReferences(tx as AppDb, row!, clock);
      return { ok: true as const, value: toBlogDto(row!) };
    });
  } catch (error) {
    if (slug !== undefined && isUniqueViolation(error)) return conflict("slug_taken");
    throw error;
  }
}

export async function publishBlogPost(
  db: AppDb,
  schoolId: string,
  blogId: string,
  clock: Clock,
): Promise<Result<BlogPostDto>> {
  const existing = await findBlogPost(db, schoolId, blogId);
  if (!existing) return notFound();
  return db.transaction(async (tx) => {
    const now = clock.now();
    const [row] = await tx
      .update(schema.blogPosts)
      .set({
        title: existing.draftTitle,
        content: existing.draftContent,
        excerpt: existing.draftExcerpt,
        featuredImage: existing.draftFeaturedImage,
        meta: existing.draftMeta,
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.blogPosts.id, existing.id))
      .returning();
    await syncBlogMediaReferences(tx as AppDb, row!, clock);
    return { ok: true as const, value: toBlogDto(row!) };
  });
}

export async function discardBlogPostDraft(
  db: AppDb,
  schoolId: string,
  blogId: string,
  clock: Clock,
): Promise<Result<BlogPostDto>> {
  const existing = await findBlogPost(db, schoolId, blogId);
  if (!existing) return notFound();
  if (!existing.publishedAt) return { ok: true, value: toBlogDto(existing) };
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.blogPosts)
      .set({
        draftTitle: existing.title ?? existing.draftTitle,
        draftContent: existing.content ?? { ...EMPTY_RICH_TEXT, content: [] },
        draftExcerpt: existing.excerpt,
        draftFeaturedImage: existing.featuredImage,
        draftMeta: existing.meta,
        updatedAt: clock.now(),
      })
      .where(eq(schema.blogPosts.id, existing.id))
      .returning();
    await syncBlogMediaReferences(tx as AppDb, row!, clock);
    return { ok: true as const, value: toBlogDto(row!) };
  });
}

export type PublicBlogPostDto = {
  blogId: string;
  slug: string;
  title: string | null;
  content: Record<string, unknown> | null;
  excerpt: string | null;
  featuredImage: MediaRef | null;
  meta: Record<string, unknown>;
  author: { name: string; imageUrl: string | null } | null;
  createdAt: string;
  publishedAt: string | null;
  updatedAt: string;
};

const publicBlogColumns = {
  post: schema.blogPosts,
  authorName: schema.schoolAccounts.displayName,
  authorAvatar: schema.schoolAccounts.avatar,
};

function toPublicBlogDto(row: {
  post: BlogRow;
  authorName: string | null;
  authorAvatar: MediaRef | null;
}): PublicBlogPostDto {
  const post = row.post;
  return {
    blogId: post.publicId,
    slug: post.slug,
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    featuredImage: normalizeMediaRef(post.featuredImage),
    meta: post.meta,
    author: row.authorName
      ? { name: row.authorName, imageUrl: row.authorAvatar?.url ?? null }
      : null,
    createdAt: post.createdAt.toISOString(),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function listPublishedBlogPosts(
  db: AppDb,
  schoolId: string,
): Promise<{ items: PublicBlogPostDto[]; total: number }> {
  const rows = await db
    .select(publicBlogColumns)
    .from(schema.blogPosts)
    .leftJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.blogPosts.authorSchoolAccountId),
    )
    .where(
      and(eq(schema.blogPosts.schoolId, schoolId), isNotNull(schema.blogPosts.publishedAt)),
    )
    .orderBy(desc(schema.blogPosts.publishedAt));
  return { items: rows.map(toPublicBlogDto), total: rows.length };
}

export async function getPublishedBlogPost(
  db: AppDb,
  schoolId: string,
  slug: string,
): Promise<PublicBlogPostDto | null> {
  const [row] = await db
    .select(publicBlogColumns)
    .from(schema.blogPosts)
    .leftJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.blogPosts.authorSchoolAccountId),
    )
    .where(
      and(
        eq(schema.blogPosts.schoolId, schoolId),
        eq(schema.blogPosts.slug, slug),
        isNotNull(schema.blogPosts.publishedAt),
      ),
    )
    .limit(1);
  return row ? toPublicBlogDto(row) : null;
}
