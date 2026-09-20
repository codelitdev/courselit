"use client";

import type { WidgetProps } from "@frontlit/page-builder/models";
import {
  Badge,
  Header1,
  PageCard,
  Section,
  Text2,
} from "@frontlit/page-builder/primitives";
import { TextRenderer } from "@frontlit/text-editor";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemedSkeleton } from "../_shared/themed-skeleton";
import type { CourseLitProductPreview } from "../shared/types";
import { learnerHeaders, salesData, sectionTheme } from "../shared/utils";
import type { CurriculumSettings } from "./settings";

export default function CurriculumWidget({
  settings,
  state: { theme },
  pageData,
  nextTheme,
}: WidgetProps<CurriculumSettings>) {
  const data = salesData(pageData);
  const sourceProduct =
    data?.resourceType === "product" && data.product.kind === "course"
      ? data.product
      : null;
  const [product, setProduct] = useState<CourseLitProductPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const resolvedTheme = sectionTheme(theme.theme, settings);

  useEffect(() => {
    if (!sourceProduct) {
      setProduct(null);
      setLoading(false);
      return;
    }

    let active = true;
    setProduct(null);
    setLoading(true);
    void fetch(`/api/v1/products/${encodeURIComponent(sourceProduct.id)}`, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load curriculum.");
        return (await response.json()) as Partial<CourseLitProductPreview>;
      })
      .then((loaded) => {
        if (!active) return;
        setProduct({
          ...sourceProduct,
          ...loaded,
          sections: loaded.sections ?? sourceProduct.sections,
          lessons: loaded.lessons ?? sourceProduct.lessons,
          plans: sourceProduct.plans,
        });
      })
      .catch(() => {
        // The page data already contains a usable preview in the builder and
        // on the public sales page, so keep it as a graceful fallback.
        if (active) setProduct(sourceProduct);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [sourceProduct]);

  if (!sourceProduct) return null;

  const showSkeleton = loading || !product;
  const resolvedProduct = product ?? sourceProduct;
  const groups = resolvedProduct.sections.map((section) => ({
    ...section,
    lessons: resolvedProduct.lessons.filter(
      (lesson) => lesson.sectionId === section.id,
    ),
  }));
  const unsectioned = resolvedProduct.lessons.filter((lesson) => !lesson.sectionId);
  if (unsectioned.length > 0) {
    groups.push({
      id: "unsectioned",
      title: "Additional content",
      lessons: unsectioned,
    });
  }

  return (
    <Section
      theme={resolvedTheme}
      id={settings.cssId}
      background={settings.background}
      nextTheme={nextTheme}
    >
      <div className="flex w-full flex-col gap-6">
        <div
          className={
            settings.headerAlignment === "left"
              ? "flex flex-col gap-2"
              : "flex flex-col items-center gap-2 text-center"
          }
        >
          <Header1 theme={resolvedTheme}>
            {settings.title?.trim() || "Curriculum"}
          </Header1>
          {settings.description ? (
            <TextRenderer json={settings.description} theme={resolvedTheme} />
          ) : null}
        </div>
        {showSkeleton ? (
          <div
            className="flex flex-col gap-2"
            role="status"
            aria-label="Loading curriculum"
          >
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-center gap-2 border-b py-2">
                <ThemedSkeleton className="h-8 w-full" />
                <ThemedSkeleton className="h-6 w-24 shrink-0 rounded-full" />
                <ThemedSkeleton className="h-6 w-6 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        ) : groups.length > 0 ? (
          <PageCard theme={resolvedTheme} className="overflow-hidden p-0">
            {groups.map((group, index) => (
              <details
                key={group.id}
                open={
                  settings.openByDefault === true ||
                  (settings.openByDefault == null && index === 0)
                }
                className="group border-b last:border-b-0"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
                  <Text2
                    theme={resolvedTheme}
                    component="span"
                    className="min-w-0 flex-1 font-medium"
                  >
                    {group.title}
                  </Text2>
                  <Badge theme={resolvedTheme} variant="outline">
                    {group.lessons.length}{" "}
                    {group.lessons.length === 1 ? "lesson" : "lessons"}
                  </Badge>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border px-4 py-2">
                  {group.lessons.length > 0 ? (
                    group.lessons.map((lesson) => {
                      const lessonHref = `/course/${encodeURIComponent(resolvedProduct.slug || resolvedProduct.id)}/${encodeURIComponent(resolvedProduct.id)}/${encodeURIComponent(lesson.id)}`;
                      const content = (
                        <Text2
                          key={lesson.id}
                          theme={resolvedTheme}
                          component="span"
                          className="min-w-0 flex-1 truncate"
                        >
                          {lesson.title}
                        </Text2>
                      );
                      return lesson.requiresEnrollment ? (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-3 py-2 text-sm"
                        >
                          {content}
                        </div>
                      ) : (
                        <a
                          key={lesson.id}
                          href={lessonHref}
                          className="flex items-center gap-3 py-2 text-sm hover:underline"
                        >
                          {content}
                          <Badge
                            theme={resolvedTheme}
                            variant="outline"
                            className="shrink-0"
                          >
                            Preview
                          </Badge>
                        </a>
                      );
                    })
                  ) : (
                    <Text2 theme={resolvedTheme} className="py-2 text-muted-foreground">
                      No lessons in this section yet.
                    </Text2>
                  )}
                </div>
              </details>
            ))}
          </PageCard>
        ) : (
          <Text2 theme={resolvedTheme} className="text-center text-muted-foreground">
            The curriculum will appear here soon.
          </Text2>
        )}
      </div>
    </Section>
  );
}
