"use client";

import type { MediaRef } from "@courselit/api-contract";
import type { TextEditorContent } from "@frontlit/text-editor";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { CourseLitLoading } from "@/components/loading";
import { BlogFeaturedImage } from "@/components/content/blog-featured-image";
import { WritingEditorDocumentHeader } from "@/components/content/writing-editor-document-header";
import { WritingEditorShell } from "@/components/content/writing-editor-shell";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { RichTextEditor } from "@/components/products/rich-text-editor";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import { Textarea } from "@/components/ui/codelit/textarea";
import {
  type FrontLitBlog,
  frontLitRequest,
  resolveEditorRedirect,
} from "@/lib/frontlit-content";

type BlogDraft = {
  title: string;
  slug: string;
  excerpt: string;
  tags: string;
};

type School = {
  id: string;
  selected?: boolean;
};

function tagsFromMeta(meta: Record<string, unknown>): string {
  return Array.isArray(meta.tags)
    ? meta.tags.filter((tag): tag is string => typeof tag === "string").join(", ")
    : "";
}

export function FrontLitBlogEditor({ blogId }: { blogId: string }) {
  const searchParams = useSearchParams();
  const redirectTo = resolveEditorRedirect(
    searchParams.get("redirectTo"),
    "/website/blogs",
  );
  const [blog, setBlog] = useState<FrontLitBlog | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [draft, setDraft] = useState<BlogDraft>({
    title: "",
    slug: "",
    excerpt: "",
    tags: "",
  });
  const draftRef = useRef<BlogDraft>(draft);
  const metaRef = useRef<Record<string, unknown>>({});
  const timersRef = useRef<
    Partial<Record<keyof BlogDraft, ReturnType<typeof setTimeout>>>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useSetBreadcrumb([
    { label: "Blogs", href: "/blogs" },
    { label: blog?.draftTitle || "Edit blog" },
  ]);

  useEffect(() => {
    setSettingsOpen(window.matchMedia("(min-width: 768px)").matches);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([
      frontLitRequest<FrontLitBlog>(
        `/api/v1/school/website/blogs/${encodeURIComponent(blogId)}`,
      ),
      fetch("/api/v1/schools", { credentials: "include", cache: "no-store" }).then(
        async (response) => {
          if (!response.ok) throw new Error("Unable to load the active school.");
          return (await response.json()) as { items?: School[] };
        },
      ),
    ])
      .then(([loaded, schoolsBody]) => {
        if (!active) return;
        const selectedSchool =
          schoolsBody.items?.find((item) => item.selected) ?? schoolsBody.items?.[0];
        if (!selectedSchool) throw new Error("Create a school before editing a blog.");
        const nextDraft = {
          title: loaded.draftTitle,
          slug: loaded.slug,
          excerpt: loaded.draftExcerpt ?? "",
          tags: tagsFromMeta(loaded.draftMeta),
        };
        metaRef.current = loaded.draftMeta;
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        setBlog(loaded);
        setSchool(selectedSchool);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load blog.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      for (const timer of Object.values(timersRef.current)) {
        if (timer) clearTimeout(timer);
      }
    };
  }, [blogId]);

  function setDraftValue(field: keyof BlogDraft, value: string) {
    const nextDraft = { ...draftRef.current, [field]: value };
    draftRef.current = nextDraft;
    setDraft(nextDraft);
  }

  async function savePatch(patch: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const updated = await frontLitRequest<FrontLitBlog>(
        `/api/v1/school/website/blogs/${encodeURIComponent(blogId)}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      );
      setBlog(updated);
      metaRef.current = updated.draftMeta;
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to save blog.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFeaturedImageChange(value: MediaRef | null) {
    await savePatch({ featuredImage: value });
  }

  function scheduleSave(field: keyof BlogDraft) {
    const existing = timersRef.current[field];
    if (existing) clearTimeout(existing);
    timersRef.current[field] = setTimeout(() => {
      const current = draftRef.current;
      if (field === "title") void savePatch({ title: current.title });
      if (field === "excerpt") void savePatch({ excerpt: current.excerpt });
      if (field === "tags") {
        void savePatch({
          meta: {
            ...metaRef.current,
            tags: current.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          },
        });
      }
    }, 600);
  }

  async function handleSlugSave() {
    const nextSlug = draftRef.current.slug.trim().replace(/^\/+|\/+$/g, "");
    if (!nextSlug || nextSlug === blog?.slug) return;
    await savePatch({ slug: nextSlug });
  }

  async function handleContentChange(content: unknown) {
    if (!content || typeof content !== "object" || !("type" in content)) return;
    if ((content as { type?: unknown }).type !== "doc") return;
    await savePatch({ content: content as TextEditorContent });
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    try {
      const published = await frontLitRequest<FrontLitBlog>(
        `/api/v1/school/website/blogs/${encodeURIComponent(blogId)}/publish`,
        { method: "POST" },
      );
      setBlog(published);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to publish blog.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    for (const timer of Object.values(timersRef.current)) {
      if (timer) clearTimeout(timer);
    }
    setPublishing(true);
    setError(null);
    try {
      const reverted = await frontLitRequest<FrontLitBlog>(
        `/api/v1/school/website/blogs/${encodeURIComponent(blogId)}/discard-draft`,
        { method: "POST" },
      );
      const nextDraft = {
        title: reverted.draftTitle,
        slug: reverted.slug,
        excerpt: reverted.draftExcerpt ?? "",
        tags: tagsFromMeta(reverted.draftMeta),
      };
      metaRef.current = reverted.draftMeta;
      draftRef.current = nextDraft;
      setDraft(nextDraft);
      setBlog(reverted);
      setResetKey((key) => key + 1);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Unable to discard changes.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <AuthGate>
      {blog ? (
        <WritingEditorShell
          backHref={redirectTo}
          backLabel="Blogs"
          contextLabel="Blog"
          title={draft.title || "Untitled blog"}
          status={blog.status}
          updatedAt={blog.updatedAt}
          saving={saving}
          publishing={publishing}
          settingsOpen={settingsOpen}
          onSettingsOpenChange={setSettingsOpen}
          onPublish={() => void handlePublish()}
          onDiscardDraft={() => void handleDiscard()}
          settings={
            <div className="space-y-7">
              <div>
                <Label htmlFor="frontlit-blog-slug">Slug</Label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/blog/</span>
                  <Input
                    id="frontlit-blog-slug"
                    value={draft.slug}
                    onChange={(event) => setDraftValue("slug", event.target.value)}
                    onBlur={() => void handleSlugSave()}
                    disabled={saving || publishing}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Changing this updates the public URL immediately.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="frontlit-blog-excerpt">Excerpt</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {draft.excerpt.length} characters
                  </span>
                </div>
                <Textarea
                  id="frontlit-blog-excerpt"
                  value={draft.excerpt}
                  onChange={(event) => {
                    setDraftValue("excerpt", event.target.value);
                    scheduleSave("excerpt");
                  }}
                  placeholder="A short description for blog listings."
                  className="mt-1 min-h-28"
                  disabled={saving || publishing}
                />
              </div>

              <div>
                <Label htmlFor="frontlit-blog-tags">Tags</Label>
                <Input
                  id="frontlit-blog-tags"
                  value={draft.tags}
                  onChange={(event) => {
                    setDraftValue("tags", event.target.value);
                    scheduleSave("tags");
                  }}
                  placeholder="Product, engineering, launch"
                  className="mt-1"
                  disabled={saving || publishing}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Separate tags with commas.
                </p>
              </div>

              {school ? (
                <BlogFeaturedImage
                  school={school}
                  value={blog.draftFeaturedImage}
                  disabled={saving || publishing}
                  onChange={(value) => void handleFeaturedImageChange(value)}
                />
              ) : null}

              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold">Publishing</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Your title, excerpt, tags, and article content go live together when
                  you publish changes.
                </p>
              </div>
            </div>
          }
        >
          <div className="flex h-full min-h-0 flex-col">
            {error ? (
              <p
                className="shrink-0 border-b border-destructive/30 bg-destructive/10 px-6 py-2 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {school ? (
              <RichTextEditor
                key={resetKey}
                school={school}
                purpose="blog_artwork"
                initialContent={blog.draftContent}
                onChange={(content) => void handleContentChange(content)}
                placeholder="Start writing…"
                className="h-full min-h-0 gap-0 overflow-x-hidden overflow-y-auto border-0"
                contentClassName="max-w-[46rem]"
                editorClassName="writing-editor-content min-h-[420px]"
                beforeContent={
                  <WritingEditorDocumentHeader
                    title={draft.title}
                    description={draft.excerpt}
                    onTitleChange={(value) => {
                      setDraftValue("title", value);
                      scheduleSave("title");
                    }}
                    onDescriptionChange={(value) => {
                      setDraftValue("excerpt", value);
                      scheduleSave("excerpt");
                    }}
                  />
                }
              />
            ) : null}
          </div>
        </WritingEditorShell>
      ) : (
        <main
          data-full-screen-editor
          className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-background"
        >
          <div className="px-6 text-center">
            {loading ? (
              <CourseLitLoading label="Loading blog…" />
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </main>
      )}
    </AuthGate>
  );
}
