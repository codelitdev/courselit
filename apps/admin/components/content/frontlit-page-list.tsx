"use client";

import type { MediaRef } from "@courselit/api-contract";
import { FileText, Plus } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { CourseLitLoading } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { FeaturedCard } from "@/components/featured-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";

type FrontLitContent = {
  id: string;
  name: string;
  kind: "page" | "blog";
  slug: string;
  status: "draft" | "published" | "published_with_changes";
  featuredImage?: MediaRef | null;
  excerpt?: string | null;
  updatedAt?: string | null;
};

function imageUrl(image: MediaRef | null | undefined): string | null {
  return image?.thumbnailUrl ?? image?.url ?? null;
}

function formatUpdatedAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)}`;
}

function contentStatusLabel(status: FrontLitContent["status"]): string {
  if (status === "published_with_changes") return "Published · changes";
  return status === "published" ? "Published" : "Draft";
}

export function FrontLitPageList({ onlyBlogs = false }: { onlyBlogs?: boolean }) {
  const [pages, setPages] = useState<FrontLitContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createFormRef = useRef({ name: "" });
  const editorReturnPath = onlyBlogs ? "/website/blogs" : "/website/pages";

  useEffect(() => {
    let active = true;
    const endpoint = onlyBlogs
      ? "/api/v1/school/website/blogs"
      : "/api/v1/school/website/pages";
    void fetch(endpoint, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 409
              ? "Website content is still being connected for this school."
              : "Unable to load pages.",
          );
        }
        return (await response.json()) as { items?: FrontLitContent[] };
      })
      .then((pagesBody) => {
        if (!active) return;
        setPages(pagesBody.items ?? []);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load pages.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onlyBlogs]);

  const visiblePages = useMemo(
    () => (onlyBlogs ? pages.filter((page) => page.kind === "blog") : pages),
    [onlyBlogs, pages],
  );

  function openCreateDialog() {
    createFormRef.current.name = "";
    setCreateName("");
    setCreateError(null);
    setCreateOpen(true);
  }

  async function createPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = createFormRef.current.name.trim();
    if (!name) {
      setCreateError(`Enter a ${onlyBlogs ? "blog" : "page"} name.`);
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch(
        onlyBlogs ? "/api/v1/school/website/blogs" : "/api/v1/school/website/pages",
        {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(onlyBlogs ? { title: name } : { name }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          body?.message || `Unable to create the ${onlyBlogs ? "blog" : "page"}.`,
        );
      }
      const page = (await response.json()) as FrontLitContent;
      setPages((current) => [page, ...current]);
      setCreateOpen(false);
      setCreateName("");
      createFormRef.current.name = "";
    } catch (caught: unknown) {
      setCreateError(
        caught instanceof Error
          ? caught.message
          : `Unable to create the ${onlyBlogs ? "blog" : "page"}.`,
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title={onlyBlogs ? "Blogs" : "Pages"}
          description={
            onlyBlogs
              ? "Blog posts created by this school."
              : "Pages created by this school."
          }
          action={
            <Button type="button" onClick={openCreateDialog}>
              <Plus className="size-4" />
              {onlyBlogs ? "New blog" : "New page"}
            </Button>
          }
        />
        {loading ? <CourseLitLoading className="justify-start" /> : null}
        {error ? (
          <section className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Try again
            </Button>
          </section>
        ) : null}
        {!loading && !error && visiblePages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={onlyBlogs ? "No Blogs Found" : "No Pages Found"}
            description={
              onlyBlogs
                ? "You have not added any blogs yet."
                : "You have not added any pages yet."
            }
            action={
              <Button onClick={openCreateDialog}>
                <Plus className="size-4" />
                {onlyBlogs ? "New blog" : "New page"}
              </Button>
            }
          />
        ) : null}
        {!loading && !error && visiblePages.length > 0 ? (
          <section
            className="grid gap-x-4 gap-y-3 md:grid-cols-2 lg:grid-cols-3"
            aria-label={onlyBlogs ? "Blogs" : "Pages"}
          >
            {visiblePages.map((page) => (
              <FeaturedCard
                key={page.id}
                href={`${onlyBlogs ? "/website/blogs" : "/pages"}/${encodeURIComponent(page.id)}/edit?redirectTo=${encodeURIComponent(editorReturnPath)}`}
                title={page.name}
                imageUrl={imageUrl(page.featuredImage)}
                imageAlt={page.name}
              >
                {page.excerpt ? (
                  <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                    {page.excerpt}
                  </p>
                ) : (
                  <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                    No description
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
                    <FileText className="size-3.5" />
                    {page.kind === "blog" ? "Blog" : "Page"}
                  </span>
                  <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                    {contentStatusLabel(page.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="truncate">/{page.slug}</span>
                  <span className="shrink-0">
                    {formatUpdatedAt(page.updatedAt) ?? "Not updated yet"}
                  </span>
                </div>
              </FeaturedCard>
            ))}
          </section>
        ) : null}
      </main>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={createPage}>
            <DialogHeader>
              <DialogTitle>{onlyBlogs ? "New blog" : "New page"}</DialogTitle>
              <DialogDescription>
                {onlyBlogs
                  ? "Create a blog page for your school."
                  : "Create a page for your school website."}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-2">
              <Label htmlFor="frontlit-page-name">Name</Label>
              <Input
                id="frontlit-page-name"
                value={createName}
                onChange={(event) => {
                  createFormRef.current.name = event.target.value;
                  setCreateName(event.target.value);
                }}
                placeholder={onlyBlogs ? "My first blog" : "About us"}
                autoFocus
                disabled={creating}
              />
              {createError ? (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              ) : null}
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !createName.trim()}>
                {creating ? "Creating…" : onlyBlogs ? "Create blog" : "Create page"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AuthGate>
  );
}
