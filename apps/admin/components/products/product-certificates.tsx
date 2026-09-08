"use client";

import { ChevronDown, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import { Switch } from "@/components/ui/codelit/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  type CourseLitMedia,
  getCourseLitMedia,
  listCourseLitMedia,
} from "@/lib/course-media-uploader";
import { MediaField } from "./media-upload-button";
import type { Product, School } from "./product-types";

type CertificateTemplate = {
  id: string;
  productId: string;
  title: string;
  subtitle: string;
  description: string;
  signatureName: string;
  signatureDesignation: string;
  signatureImageId: string | null;
  logoId: string | null;
};

const emptyTemplate = (productId: string): CertificateTemplate => ({
  id: "",
  productId,
  title: "",
  subtitle: "",
  description: "",
  signatureName: "",
  signatureDesignation: "",
  signatureImageId: null,
  logoId: null,
});

export function ProductCertificates({
  school,
  productId,
  productTitle,
  enabled,
  onToggle,
}: {
  school: School;
  productId: string;
  productTitle: string;
  enabled: Product["certificate"];
  onToggle: (enabled: boolean) => void;
}) {
  const [template, setTemplate] = useState(() => emptyTemplate(productId));
  const [images, setImages] = useState<CourseLitMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      fetch(`/api/v1/products/${encodeURIComponent(productId)}/certificate-template`, {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": school.id },
      }).then(async (response) => {
        if (!response.ok) throw new Error("Unable to load the certificate template.");
        return (await response.json()) as CertificateTemplate | null;
      }),
      listCourseLitMedia(school.id),
    ])
      .then(([loadedTemplate, media]) => {
        if (!active) return;
        setTemplate(loadedTemplate ?? emptyTemplate(productId));
        setImages(media.filter((item) => item.mimeType.startsWith("image/")));
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load certificate settings.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, productId, school.id]);

  useEffect(() => {
    const selectedIds = [template.signatureImageId, template.logoId].filter(
      (id): id is string => Boolean(id),
    );
    const missingIds = selectedIds.filter(
      (id) => !images.some((image) => image.id === id),
    );
    if (loading || missingIds.length === 0) return;

    let active = true;
    void Promise.all(
      missingIds.map(async (id) => {
        return getCourseLitMedia(school.id, id);
      }),
    )
      .then((selectedImages) => {
        if (!active) return;
        const validImages = selectedImages.filter(
          (image): image is CourseLitMedia =>
            image?.mimeType.startsWith("image/") === true,
        );
        if (validImages.length === 0) return;
        setImages((current) => {
          const currentIds = new Set(current.map((image) => image.id));
          return [
            ...validImages.filter((image) => !currentIds.has(image.id)),
            ...current,
          ];
        });
      })
      .catch(() => {
        // A deleted or cross-school asset should not make certificate settings unusable.
      });

    return () => {
      active = false;
    };
  }, [images, loading, school.id, template.logoId, template.signatureImageId]);

  async function persistTemplate(nextTemplate: CertificateTemplate) {
    if (saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/v1/products/${encodeURIComponent(productId)}/certificate-template`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-school-id": school.id,
          },
          body: JSON.stringify({
            title: nextTemplate.title.trim(),
            subtitle: nextTemplate.subtitle.trim(),
            description: nextTemplate.description,
            signatureName: nextTemplate.signatureName.trim(),
            signatureDesignation: nextTemplate.signatureDesignation.trim(),
            signatureImageId: nextTemplate.signatureImageId,
            logoId: nextTemplate.logoId,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | CertificateTemplate
        | { message?: string }
        | null;
      if (!response.ok || !body || typeof body !== "object") {
        throw new Error(
          body && "message" in body && typeof body.message === "string" && body.message
            ? body.message
            : "Unable to save the certificate template.",
        );
      }
      setTemplate(body as CertificateTemplate);
      setNotice("Certificate template saved.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save the certificate template.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await persistTemplate(template);
  }

  const previewDescription = template.description || "for completing the course.";
  const previewDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(new Date());

  return (
    <section className="card stack">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Certificates</h2>
          <p className="mt-1 font-semibold">Issue certificates</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enable certificate for this course.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {enabled ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-4" /> Preview
            </Button>
          ) : null}
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => onToggle(checked === true)}
            disabled={loading || saving}
            aria-label="Issue certificates"
          />
        </div>
      </div>
      {enabled ? (
        <Collapsible
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          className="border-t pt-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Certificate Template</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Customize the content and branding for issued certificates.
              </p>
            </div>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="group size-9 p-0"
                aria-label="Toggle certificate template"
              >
                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="stack pt-5">
            <form onSubmit={(event) => void saveTemplate(event)} className="stack">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading template…</p>
              ) : null}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="certificate-title">Certificate Title</Label>
                  <Input
                    id="certificate-title"
                    value={template.title}
                    onChange={(event) =>
                      setTemplate((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Certificate of Completion"
                    disabled={loading || saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="certificate-subtitle">Certificate Subtitle</Label>
                  <Input
                    id="certificate-subtitle"
                    value={template.subtitle}
                    onChange={(event) =>
                      setTemplate((current) => ({
                        ...current,
                        subtitle: event.target.value,
                      }))
                    }
                    placeholder="This certificate is awarded to"
                    disabled={loading || saving}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="certificate-description">
                    Certificate Description
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {template.description.length}/400 characters
                  </span>
                </div>
                <Input
                  id="certificate-description"
                  maxLength={400}
                  value={template.description}
                  onChange={(event) =>
                    setTemplate((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="for completing the course"
                  disabled={loading || saving}
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="certificate-signature-name">Signature Name</Label>
                  <Input
                    id="certificate-signature-name"
                    value={template.signatureName}
                    onChange={(event) =>
                      setTemplate((current) => ({
                        ...current,
                        signatureName: event.target.value,
                      }))
                    }
                    placeholder="Instructor Name"
                    disabled={loading || saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="certificate-signature-designation">
                    Signature Designation
                  </Label>
                  <Input
                    id="certificate-signature-designation"
                    value={template.signatureDesignation}
                    onChange={(event) =>
                      setTemplate((current) => ({
                        ...current,
                        signatureDesignation: event.target.value,
                      }))
                    }
                    placeholder="Course Instructor"
                    disabled={loading || saving}
                  />
                </div>
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p role="status" className="text-sm text-primary">
                  {notice}
                </p>
              ) : null}
              <Button type="submit" disabled={loading || saving} className="w-fit">
                {saving ? "Saving…" : "Save certificate template"}
              </Button>
            </form>
            <div className="space-y-6 border-t pt-6">
              {(["signatureImageId", "logoId"] as const).map((field) => (
                <div className="field block" key={field}>
                  <label htmlFor={`certificate-${field}`}>
                    {field === "signatureImageId" ? "Signature image" : "Logo"}
                  </label>
                  <MediaField
                    school={school}
                    purpose="certificate_template"
                    media={images.find((image) => image.id === template[field]) ?? null}
                    onChange={async (item) => {
                      if (item) {
                        setImages((current) => [
                          item,
                          ...current.filter((image) => image.id !== item.id),
                        ]);
                      }
                      const nextTemplate = { ...template, [field]: item?.id ?? null };
                      setTemplate(nextTemplate);
                      await persistTemplate(nextTemplate);
                    }}
                    disabled={loading || saving}
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[95vh] w-[96vw] !max-w-[1200px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Certificate preview</DialogTitle>
            <DialogDescription>
              This preview uses the current template values and sample learner data.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto rounded-md bg-muted p-3 sm:p-6">
            <article className="relative mx-auto flex aspect-[11/8.5] min-h-[480px] w-full max-w-[1056px] flex-col overflow-hidden bg-white p-[7%] text-center text-slate-800 shadow-xl">
              <div className="pointer-events-none absolute inset-[3%] rounded border border-slate-300" />
              {template.logoId ? (
                <img
                  className="relative z-10 mx-auto mb-4 max-h-20 max-w-20 object-contain"
                  src={
                    images.find((image) => image.id === template.logoId)?.canonicalUrl
                  }
                  alt="School logo"
                />
              ) : null}
              <h1 className="relative z-10 text-[clamp(1.5rem,4vw,2.5rem)] font-bold tracking-wide">
                {template.title || "Certificate of Completion"}
              </h1>
              <div className="relative z-10 mx-auto mb-6 mt-3 h-0.5 w-24 bg-slate-900" />
              <p className="relative z-10 text-base sm:text-lg">
                {template.subtitle || "This certificate is awarded to"}
              </p>
              <h2 className="relative z-10 mt-4 text-[clamp(1.25rem,3.5vw,2.2rem)] font-bold tracking-wide">
                Student Name
              </h2>
              <p className="relative z-10 mx-auto mt-4 max-w-md text-base leading-relaxed">
                {previewDescription}
              </p>
              <h3 className="relative z-10 mt-4 text-lg font-bold">{productTitle}</h3>
              <div className="absolute left-[7%] right-[7%] top-[64%] z-10 grid grid-cols-2 gap-8 text-center text-sm">
                <div>
                  {template.signatureImageId ? (
                    <img
                      className="mx-auto mb-1 max-h-10 max-w-24 object-contain"
                      src={
                        images.find((image) => image.id === template.signatureImageId)
                          ?.canonicalUrl
                      }
                      alt="Signature"
                    />
                  ) : null}
                  <div className="mx-auto h-0.5 w-24 bg-slate-900" />
                  <p className="mt-2">{template.signatureName || "Instructor"}</p>
                  {template.signatureDesignation ? (
                    <p className="text-xs text-slate-500">
                      {template.signatureDesignation}
                    </p>
                  ) : null}
                </div>
                <div>
                  <div className="mx-auto h-0.5 w-24 bg-slate-900" />
                  <p className="mt-2">Date of Completion</p>
                  <p className="text-xs text-slate-500">{previewDate}</p>
                </div>
              </div>
              <p className="absolute bottom-[7%] left-[7%] right-[7%] z-10 border-t border-slate-300 pt-2 text-[10px] text-slate-500">
                ID: N/A
              </p>
            </article>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
