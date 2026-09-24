"use client";

import {
  BANNER_BLOCK,
  type CourseLitCommunityPreview,
  type CourseLitProductPreview,
  normalizeCourseLitSiteLayout,
  PRODUCT_CURRICULUM_BLOCK,
  registerCourseLitBlocks,
} from "@courselit/page-blocks";
import { COURSELIT_SYSTEM_THEMES } from "@courselit/page-blocks/theme";
import { PageBuilder, type PageBuilderState } from "@frontlit/page-builder/builder";
import type {
  Theme as BuilderTheme,
  WidgetInstance,
} from "@frontlit/page-builder/models";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { CourseLitLoading } from "@/components/loading";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  contentStatusLabel,
  type FrontLitPage,
  type FrontLitSettings,
  type FrontLitTheme,
  type FrontLitWidget,
  frontLitRequest,
  resolveEditorRedirect,
} from "@/lib/frontlit-content";
import {
  persistCustomThemes,
  resolveEditorTheme,
  themeSnapshot,
} from "@/lib/frontlit-theme";

registerCourseLitBlocks();

function normalizeSalesLayout(
  layout: WidgetInstance[] | null | undefined,
  resourceType: "product" | "community" | null,
  productKind: "course" | "download" | null,
): WidgetInstance[] {
  const safeLayout = Array.isArray(layout) ? layout : [];
  if (!resourceType) return safeLayout;
  const normalized = safeLayout.map((instance) => {
    const isLegacySalesSlot =
      instance.name === "data-slot" &&
      instance.settings?.slot === "courselit.sales-page-content";
    const isLegacySalesBanner = [
      "banner",
      "courselit-product-banner",
      "courselit-community-banner",
    ].includes(instance.name);
    if (!isLegacySalesSlot && !isLegacySalesBanner) return instance;
    const legacyTextPosition = instance.settings?.alignment;
    const legacyTextAlignment = instance.settings?.textAlignment;
    return {
      ...instance,
      name: BANNER_BLOCK,
      settings: {
        ...instance.settings,
        ...(typeof legacyTextPosition === "string" &&
        ["left", "right", "top", "bottom"].includes(legacyTextPosition) &&
        instance.settings?.textPosition === undefined
          ? { textPosition: legacyTextPosition }
          : {}),
        ...(typeof legacyTextAlignment === "string" &&
        ["left", "center", "right"].includes(legacyTextAlignment)
          ? { textAlignment: legacyTextAlignment }
          : {}),
        ...(isLegacySalesSlot ? { textPosition: "left", textAlignment: "left" } : {}),
      },
    };
  });

  if (
    resourceType === "product" &&
    productKind === "course" &&
    !normalized.some((instance) => instance.name === PRODUCT_CURRICULUM_BLOCK)
  ) {
    const footerIndex = normalized.findIndex((instance) => instance.name === "footer");
    const curriculum: WidgetInstance = {
      widgetId: "courselit-sales-curriculum",
      name: PRODUCT_CURRICULUM_BLOCK,
      deletable: false,
      moveable: true,
      shared: false,
      settings: {
        title: "Curriculum",
        headerAlignment: "center",
        openByDefault: false,
      },
    };
    if (footerIndex === -1) return [...normalized, curriculum];
    return [
      ...normalized.slice(0, footerIndex),
      curriculum,
      ...normalized.slice(footerIndex),
    ];
  }
  return normalized;
}

export function FrontLitPageEditor({ pageId }: { pageId: string }) {
  const searchParams = useSearchParams();
  const redirectTo = resolveEditorRedirect(
    searchParams.get("redirectTo"),
    "/website/pages",
  );
  const requestedSalesResourceType = searchParams.get("resourceType");
  const requestedSalesResourceId = searchParams.get("resourceId");
  const [page, setPage] = useState<FrontLitPage | null>(null);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [initialTheme, setInitialTheme] = useState<BuilderTheme | undefined>(undefined);
  const [customThemes, setCustomThemes] = useState<BuilderTheme[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [salesPreview, setSalesPreview] = useState<
    | { resourceType: "product"; resource: CourseLitProductPreview }
    | { resourceType: "community"; resource: CourseLitCommunityPreview }
    | null
  >(null);
  const salesResourceType =
    requestedSalesResourceType === "product" ||
    requestedSalesResourceType === "community"
      ? requestedSalesResourceType
      : (page?.salesResourceType ?? null);
  const salesResourceId = requestedSalesResourceId ?? page?.salesResourceId ?? null;
  const salesPageSlug = page?.slug ?? null;
  const isLikelySalesPage =
    page?.name.trim().toLowerCase().endsWith(" sales page") ?? false;
  const themeAliasesRef = useRef(new Map<string, string>());
  const knownThemeIdsRef = useRef(new Set<string>());
  const themeSnapshotsRef = useRef(new Map<string, string>());
  const appliedThemeIdRef = useRef<string | null>(null);
  const appliedThemeSnapshotRef = useRef<string | null>(null);

  useSetBreadcrumb([
    { label: "Pages", href: redirectTo },
    { label: page?.name ?? "Edit page" },
  ]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      frontLitRequest<FrontLitPage>(
        `/api/v1/school/website/pages/${encodeURIComponent(pageId)}`,
      ),
      frontLitRequest<{ items: FrontLitTheme[] }>(
        "/api/v1/school/website/branding/themes",
      ),
      frontLitRequest<FrontLitSettings>("/api/v1/school/website/branding"),
    ])
      .then(([loaded, savedThemes, settings]) => {
        if (!active) return;
        const mappedThemes = savedThemes.items.map(
          (theme): BuilderTheme => ({
            id: theme.themeId,
            name: theme.name,
            theme: theme.style as unknown as BuilderTheme["theme"],
          }),
        );
        themeAliasesRef.current = new Map();
        knownThemeIdsRef.current = new Set(
          savedThemes.items.map((theme) => theme.themeId),
        );
        themeSnapshotsRef.current = new Map(
          mappedThemes.map((theme) => [theme.id, themeSnapshot(theme)]),
        );
        const activeThemeId = settings.themeId ?? "classic";
        const activeTheme = resolveEditorTheme(activeThemeId, savedThemes.items);
        appliedThemeIdRef.current = settings.themeId;
        appliedThemeSnapshotRef.current = activeTheme
          ? themeSnapshot(activeTheme)
          : null;
        setInitialTheme(activeTheme);
        setCustomThemes(mappedThemes);
        setPage(loaded);
        setSlug(loaded.slug);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load page.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pageId]);

  useEffect(() => {
    const inferredResourceId =
      !salesResourceType && isLikelySalesPage ? salesPageSlug : null;
    if (
      (salesResourceType !== "product" &&
        salesResourceType !== "community" &&
        !inferredResourceId) ||
      (!salesResourceId && !inferredResourceId)
    ) {
      setSalesPreview(null);
      return;
    }
    let active = true;
    const loadPlans = (path: string) =>
      frontLitRequest<{ items: CourseLitProductPreview["plans"] }>(path)
        .then((response) => response.items ?? [])
        .catch(() => []);
    const loadProduct = (id: string) =>
      Promise.all([
        frontLitRequest<CourseLitProductPreview>(
          `/api/v1/products/${encodeURIComponent(id)}`,
        ),
        loadPlans(`/api/v1/storefront/products/${encodeURIComponent(id)}/plans`),
      ]).then(([product, plans]) => ({
        resourceType: "product" as const,
        resource: { ...product, plans },
      }));
    const loadCommunity = (id: string) =>
      Promise.all([
        frontLitRequest<CourseLitCommunityPreview>(
          `/api/v1/communities/${encodeURIComponent(id)}`,
        ),
        loadPlans(`/api/v1/communities/${encodeURIComponent(id)}/plans`),
      ]).then(([community, plans]) => ({
        resourceType: "community" as const,
        resource: { ...community, plans },
      }));
    const load =
      salesResourceType === "product"
        ? loadProduct(salesResourceId!)
        : salesResourceType === "community"
          ? loadCommunity(salesResourceId!)
          : loadProduct(inferredResourceId!).catch(() =>
              loadCommunity(inferredResourceId!),
            );
    void load
      .then((preview) => {
        if (active) setSalesPreview(preview);
      })
      .catch(() => {
        if (active) setSalesPreview(null);
      });
    return () => {
      active = false;
    };
  }, [isLikelySalesPage, salesPageSlug, salesResourceId, salesResourceType]);

  async function handleChange(state: PageBuilderState) {
    setSaving(true);
    setError(null);
    try {
      await persistCustomThemes(state.customThemes, {
        aliases: themeAliasesRef.current,
        knownIds: knownThemeIdsRef.current,
        snapshots: themeSnapshotsRef.current,
        create: (input) =>
          frontLitRequest<FrontLitTheme>("/api/v1/school/website/branding/themes", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        update: (themeId, patch) =>
          frontLitRequest<FrontLitTheme>(
            `/api/v1/school/website/branding/themes/${encodeURIComponent(themeId)}`,
            { method: "PATCH", body: JSON.stringify(patch) },
          ),
      });
      const selectedThemeId =
        themeAliasesRef.current.get(state.theme.id) ?? state.theme.id;
      const selectedThemeSnapshot = themeSnapshot(state.theme);
      if (
        appliedThemeIdRef.current !== selectedThemeId ||
        appliedThemeSnapshotRef.current !== selectedThemeSnapshot
      ) {
        await frontLitRequest<FrontLitSettings>("/api/v1/school/website/branding", {
          method: "PATCH",
          body: JSON.stringify({ themeId: selectedThemeId }),
        });
        appliedThemeIdRef.current = selectedThemeId;
        appliedThemeSnapshotRef.current = selectedThemeSnapshot;
      }

      // Older FrontLit API images reject an explicit null socialImage even
      // though the current contract permits it. Omit an unset value so a
      // theme change is not blocked by an unrelated SEO field.
      const pagePatch: {
        layout: FrontLitWidget[];
        title?: string;
        description?: string;
        socialImage?: PageBuilderState["seo"]["socialImage"];
        robotsAllowed?: boolean;
      } = {
        layout: normalizeCourseLitSiteLayout(state.layout) as FrontLitWidget[],
      };
      if (state.seo.title != null) pagePatch.title = state.seo.title;
      if (state.seo.description != null) pagePatch.description = state.seo.description;
      if (state.seo.socialImage != null) {
        pagePatch.socialImage = state.seo.socialImage;
      }
      if (state.seo.robotsAllowed != null) {
        pagePatch.robotsAllowed = state.seo.robotsAllowed;
      }
      const updated = await frontLitRequest<FrontLitPage>(
        `/api/v1/school/website/pages/${encodeURIComponent(pageId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(pagePatch),
        },
      );
      setPage(updated);
      setNotice("Draft saved.");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to save page.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSlugSave() {
    const nextSlug = slug.trim().replace(/^\/+|\/+$/g, "");
    if (!nextSlug || nextSlug === page?.slug) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await frontLitRequest<FrontLitPage>(
        `/api/v1/school/website/pages/${encodeURIComponent(pageId)}`,
        { method: "PATCH", body: JSON.stringify({ slug: nextSlug }) },
      );
      setPage(updated);
      setSlug(updated.slug);
      setNotice("Draft saved.");
    } catch (caught: unknown) {
      setSlug(page?.slug ?? "");
      setError(caught instanceof Error ? caught.message : "Unable to save page URL.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const published = await frontLitRequest<FrontLitPage>(
        `/api/v1/school/website/pages/${encodeURIComponent(pageId)}/publish`,
        { method: "POST" },
      );
      setPage(published);
      setNotice("Page published.");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to publish page.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const reverted = await frontLitRequest<FrontLitPage>(
        `/api/v1/school/website/pages/${encodeURIComponent(pageId)}/discard-draft`,
        { method: "POST" },
      );
      setPage(reverted);
      setSlug(reverted.slug);
      setResetKey((key) => key + 1);
      setNotice("Unpublished changes discarded.");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to discard changes.");
    } finally {
      setPublishing(false);
    }
  }

  const hasDraftChanges = page?.status !== "published";

  return (
    <AuthGate>
      <div
        data-full-screen-editor
        className="flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background"
      >
        <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href={redirectTo}>
                <ArrowLeft className="size-4" />
                Pages
              </Link>
            </Button>
            <span aria-hidden className="h-7 w-px bg-border" />
            <h1 className="truncate text-sm font-semibold">
              {page?.name ?? "Edit page"}
            </h1>
          </div>
          {page ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-2 lg:flex">
                <Label htmlFor="frontlit-page-slug" className="sr-only">
                  Page URL
                </Label>
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="frontlit-page-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  onBlur={() => void handleSlugSave()}
                  disabled={!page.deletable || saving || publishing}
                  className="h-8 w-44"
                />
              </div>
              <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                {contentStatusLabel(page.status)}
              </span>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {saving ? "Saving…" : (notice ?? "")}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleDiscard()}
                disabled={publishing || saving || !hasDraftChanges}
              >
                Discard changes
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handlePublish()}
                disabled={publishing || saving || !hasDraftChanges}
              >
                <Save className="size-4" />
                {publishing ? "Publishing…" : "Publish changes"}
              </Button>
            </div>
          ) : null}
        </header>

        {loading || error ? (
          <div className="shrink-0 px-4 py-3">
            {loading ? (
              <CourseLitLoading label="Loading page…" className="justify-start" />
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}
        {page ? (
          <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            <PageBuilder
              key={`${resetKey}-${salesPreview ? `ready-${salesPreview.resourceType}-${salesPreview.resourceType === "product" ? salesPreview.resource.kind : "community"}` : `pending-${salesResourceType ?? "none"}`}`}
              initialLayout={normalizeCourseLitSiteLayout(
                normalizeSalesLayout(
                  page.draftLayout ?? page.layout,
                  salesPreview?.resourceType ?? salesResourceType,
                  page.salesResourceKind ??
                    (salesPreview?.resourceType === "product"
                      ? salesPreview.resource.kind
                      : null),
                ),
              )}
              initialTheme={initialTheme}
              themes={{ system: COURSELIT_SYSTEM_THEMES, custom: customThemes ?? [] }}
              pageData={{
                pageType: "custom",
                ...(salesPreview
                  ? {
                      courseLitSalesData: {
                        resourceType: salesPreview.resourceType,
                        ...(salesPreview.resourceType === "product"
                          ? { product: salesPreview.resource }
                          : { community: salesPreview.resource }),
                      },
                    }
                  : {}),
              }}
              initialSeo={{
                title: page.draftTitle ?? undefined,
                description: page.draftDescription ?? undefined,
                socialImage:
                  page.draftSocialImage as unknown as PageBuilderState["seo"]["socialImage"],
                robotsAllowed: page.draftRobotsAllowed ?? undefined,
              }}
              allowThemeEditing
              onChange={(state) => void handleChange(state)}
            />
          </div>
        ) : null}
      </div>
    </AuthGate>
  );
}
