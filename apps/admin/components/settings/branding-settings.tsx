"use client";

import type { MediaRef } from "@courselit/api-contract";
import { type FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { MediaField } from "@/components/products/media-upload-button";
import type { School } from "@/components/products/product-types";
import { Button } from "@/components/ui/codelit/button";
import { Checkbox } from "@/components/ui/codelit/checkbox";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import type { CourseLitMedia } from "@/lib/course-media-uploader";
import { getCourseLitMedia } from "@/lib/course-media-uploader";

type WebsiteBrandingSettings = {
  title?: string | null;
  subtitle?: string | null;
  logo?: MediaRef | null;
};

function logoReference(media: CourseLitMedia | null): MediaRef | null {
  if (!media) return null;
  return {
    mediaId: media.id,
    url: media.url,
    thumbnailUrl: media.thumbnailUrl ?? undefined,
    alt: media.alt?.trim() || media.altText.trim() || undefined,
  };
}

export function BrandingSettings() {
  const [school, setSchool] = useState<School | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [savedTitle, setSavedTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [savedSubtitle, setSavedSubtitle] = useState("");
  const [hideCourseLitBranding, setHideCourseLitBranding] = useState(false);
  const [logo, setLogo] = useState<CourseLitMedia | null>(null);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);

  const brandingChanged =
    title.trim() !== savedTitle || subtitle.trim() !== savedSubtitle;

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: School[] }) => {
        if (!active) return;
        const items = body.items ?? [];
        const selected = items.find((item) => item.selected) ?? items[0];
        if (!selected) return;
        setSchool(selected);
        setSchoolId(selected.id);
        setTitle(selected.name);
        setSavedTitle(selected.name.trim());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!school) return;
    let active = true;
    void fetch("/api/v1/school/website/branding", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": school.id },
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as WebsiteBrandingSettings;
      })
      .then(async (settings) => {
        if (!active || !settings) return;
        const nextTitle = settings.title ?? school.name;
        const nextSubtitle = settings.subtitle ?? "";
        setTitle(nextTitle);
        setSavedTitle(nextTitle.trim());
        setSubtitle(nextSubtitle);
        setSavedSubtitle(nextSubtitle.trim());

        const mediaId = settings.logo?.mediaId;
        if (!mediaId) {
          setLogo(null);
          return;
        }
        const selectedLogo = await getCourseLitMedia(school.id, mediaId);
        if (active) {
          setLogo(selectedLogo?.mimeType.startsWith("image/") ? selectedLogo : null);
        }
      })
      .catch(() => {
        // Keep the school defaults usable when the website service is unavailable.
      });
    return () => {
      active = false;
    };
  }, [school]);

  async function saveBranding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId || brandingSaving || !title.trim() || !brandingChanged) return;
    setBrandingSaving(true);
    try {
      const response = await fetch("/api/v1/school/website/branding", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | WebsiteBrandingSettings
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          body && "message" in body && body.message
            ? body.message
            : "Unable to save branding.",
        );
      }
      const savedSettings = body as WebsiteBrandingSettings | null;
      const nextTitle = savedSettings?.title ?? title.trim();
      const nextSubtitle = savedSettings?.subtitle ?? subtitle.trim();
      setTitle(nextTitle);
      setSavedTitle(nextTitle.trim());
      setSubtitle(nextSubtitle);
      setSavedSubtitle(nextSubtitle.trim());
      toast.success("Branding saved.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to save branding.",
      );
    } finally {
      setBrandingSaving(false);
    }
  }

  async function saveLogo(nextLogo: CourseLitMedia | null) {
    if (!schoolId || logoSaving) return;
    setLogoSaving(true);
    try {
      const response = await fetch("/api/v1/school/website/branding", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({ logo: logoReference(nextLogo) }),
      });
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to save the logo.");
      }
      setLogo(nextLogo);
      toast.success(nextLogo ? "Logo saved." : "Logo removed.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to save the logo.",
      );
      throw caught;
    } finally {
      setLogoSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <form className="w-full space-y-6" onSubmit={(event) => void saveBranding(event)}>
        <div className="space-y-1.5">
          <Label htmlFor="branding-title">Title</Label>
          <Input
            id="branding-title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="branding-subtitle">Subtitle</Label>
          <Input
            id="branding-subtitle"
            value={subtitle}
            onChange={(event) => setSubtitle(event.target.value)}
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Remove CourseLit branding</p>
            <p className="text-sm text-muted-foreground">
              Hide &quot;Powered by CourseLit&quot; on your CourseLit courses and site.
            </p>
          </div>
          <Checkbox
            checked={hideCourseLitBranding}
            onCheckedChange={(value) => setHideCourseLitBranding(value === true)}
            aria-label="Remove CourseLit branding"
          />
        </div>
        <Button
          type="submit"
          disabled={!schoolId || brandingSaving || !title.trim() || !brandingChanged}
        >
          {brandingSaving ? "Saving…" : "Save"}
        </Button>
      </form>

      <div className="w-full space-y-1.5">
        <Label>Logo</Label>
        {school ? (
          <MediaField
            school={school}
            purpose="school_branding"
            media={logo}
            onChange={saveLogo}
            accept="image/*"
            accessPolicy="public"
            allowUnsplash={false}
            disabled={logoSaving}
          />
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            Select image
          </Button>
        )}
      </div>
    </div>
  );
}
