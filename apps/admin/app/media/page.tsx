"use client";

import { MediaUploadDialog, type SelectedMedia } from "@frontlit/media-uploader";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/codelit/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import {
  type CourseLitMedia,
  listCourseLitMedia,
  type MediaAccessPolicy,
  type MediaUploadPurpose,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import { AuthGate } from "../../components/auth-gate";

type School = { id: string; name: string; selected?: boolean };

export default function MediaPage() {
  const [school, setSchool] = useState<School | null>(null);
  const [items, setItems] = useState<CourseLitMedia[]>([]);
  const [search, setSearch] = useState("");
  const [purpose, setPurpose] = useState<MediaUploadPurpose>("product_artwork");
  const [accessPolicy, setAccessPolicy] = useState<MediaAccessPolicy>("private");
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const adapters = useCourseLitMediaUploader({
    schoolId: school?.id ?? "",
    purpose,
    accessPolicy,
  });

  async function load(selected: School, nextSearch = search) {
    try {
      setItems(await listCourseLitMedia(selected.id, nextSearch));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load media.");
    }
  }

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected =
          body.items?.find((item) => item.selected) ?? body.items?.[0] ?? null;
        setSchool(selected);
        if (selected) {
          try {
            setItems(await listCourseLitMedia(selected.id));
          } catch (caught) {
            setError(
              caught instanceof Error ? caught.message : "Unable to load media.",
            );
          }
        }
      })
      .catch(() => setError("Unable to load the media library."));
    // The initial request intentionally runs once for the selected school.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addSelectedMedia(selected: SelectedMedia<CourseLitMedia>) {
    if (!selected.media) {
      setError("Only uploaded media can be added to the media library.");
      return;
    }
    const media = selected.media;
    setItems((current) => [media, ...current.filter((item) => item.id !== media.id)]);
    setError(null);
  }

  async function update(item: CourseLitMedia) {
    const altText = window.prompt("Alt text", item.altText);
    if (altText === null || !school) return;
    const response = await fetch(`/api/v1/media/${item.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        "x-school-id": school.id,
      },
      credentials: "include",
      body: JSON.stringify({ altText }),
    });
    if (!response.ok) {
      setError("Unable to update media metadata.");
      return;
    }
    const updated = (await response.json()) as CourseLitMedia;
    setItems((current) =>
      current.map((entry) =>
        entry.id === updated.id
          ? { ...updated, url: updated.canonicalUrl, alt: updated.altText || null }
          : entry,
      ),
    );
  }

  async function remove(item: CourseLitMedia) {
    if (!school || item.usageCount > 0 || !window.confirm(`Delete ${item.fileName}?`))
      return;
    const response = await fetch(`/api/v1/media/${item.id}`, {
      method: "DELETE",
      headers: { "x-school-id": school.id },
      credentials: "include",
    });
    if (!response.ok) {
      setError("Only unused media can be deleted.");
      return;
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
  }

  return (
    <AuthGate>
      <main className="page-shell">
        <PageHeader
          title="Media library"
          description="Upload once, reuse safely, and see where assets are used."
        />

        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1 text-sm">
              <span className="font-medium">Purpose</span>
              <Select
                value={purpose}
                onValueChange={(value) => setPurpose(value as MediaUploadPurpose)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product_artwork">Product artwork</SelectItem>
                  <SelectItem value="blog_artwork">Blog artwork</SelectItem>
                  <SelectItem value="lesson_media">Lesson media</SelectItem>
                  <SelectItem value="downloadable_file">Downloadable file</SelectItem>
                  <SelectItem value="school_branding">School branding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1 text-sm">
              <span className="font-medium">Access</span>
              <Select
                value={accessPolicy}
                onValueChange={(value) => setAccessPolicy(value as MediaAccessPolicy)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {school ? (
              <MediaUploadDialog<CourseLitMedia>
                {...adapters}
                open={uploadOpen}
                onOpenChange={setUploadOpen}
                title="Upload media"
                allowExistingMedia={false}
                allowUnsplash={false}
                maxUploadBytes={1_000_000_000}
                onSelect={addSelectedMedia}
              >
                <Button type="button" onClick={() => setError(null)}>
                  Upload media
                </Button>
              </MediaUploadDialog>
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search file names or types"
              className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
            />
            <Button variant="outline" onClick={() => school && void load(school)}>
              Search
            </Button>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </section>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            No media in this school yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-xl border bg-card"
              >
                {item.thumbnailUrl ? (
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.altText}
                    width={640}
                    height={360}
                    unoptimized
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
                    {item.mimeType}
                  </div>
                )}
                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="truncate font-medium" title={item.fileName}>
                      {item.fileName}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {item.mimeType} · {item.usageCount} reference
                      {item.usageCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void update(item)}
                    >
                      Edit alt text
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={item.usageCount > 0}
                      onClick={() => void remove(item)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </AuthGate>
  );
}
