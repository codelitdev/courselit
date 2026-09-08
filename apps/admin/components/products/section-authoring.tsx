"use client";

import { HelpCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { Resources } from "@/components/resources";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Switch } from "@/components/ui/codelit/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/codelit/tooltip";
import { Separator } from "@/components/ui/separator";
import type { Product, School, Section } from "./product-types";

type AuthoringMode = "new" | "edit";
type DripType = "relative-date" | "exact-date";

const SECONDS_PER_DAY = 86_400;

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function SectionAuthoring({
  productId,
  sectionId,
  mode,
}: {
  productId: string;
  sectionId?: string;
  mode: AuthoringMode;
}) {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [dripEnabled, setDripEnabled] = useState(false);
  const [dripType, setDripType] = useState<DripType | undefined>();
  const [dripDelayDays, setDripDelayDays] = useState("");
  const [dripAt, setDripAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const productRoot = `/products/${encodeURIComponent(productId)}`;
  const heading = mode === "new" ? "New Section" : "Edit Section";

  const breadcrumbItems = useMemo(
    () => [
      { label: "Products", href: "/products" },
      { label: product?.title ?? "Product", href: productRoot },
      { label: "Content", href: `${productRoot}/content` },
      { label: heading },
    ],
    [product?.title, productRoot, heading],
  );

  useSetBreadcrumb(breadcrumbItems);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/schools", {
      credentials: "include",
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) throw new Error("Create a school before managing products.");
        const response = await fetch(
          `/api/v1/products/${encodeURIComponent(productId)}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { "x-school-id": selected.id },
          },
        );
        if (!response.ok) throw new Error("Unable to load the product.");
        const detail = (await response.json()) as Product & { sections: Section[] };
        if (!active) return;
        setSchool(selected);
        setProduct(detail);
        if (mode === "edit") {
          const section = detail.sections.find((item) => item.id === sectionId);
          if (!section) throw new Error("This section no longer exists.");
          setName(section.title);
          setDripEnabled(section.dripEnabled);
          setDripType(section.dripType ?? undefined);
          setDripDelayDays(
            section.dripDelaySeconds === null
              ? ""
              : String(Math.round(section.dripDelaySeconds / SECONDS_PER_DAY)),
          );
          setDripAt(toDatetimeLocal(section.dripAt));
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Unable to load section.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, productId, sectionId]);

  function validate(): Record<string, string> {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.sectionName = "Section name is required";

    if (dripEnabled && !dripType) {
      nextErrors.dripType = "Please select a release type";
    }
    if (dripType === "relative-date") {
      const days = Number(dripDelayDays);
      if (!Number.isInteger(days) || days < 1) {
        nextErrors.releaseDays = "Enter the number of days after the previous section";
      }
    }
    if (dripType === "exact-date" && !dripAt) {
      nextErrors.releaseDate =
        "Release date is required when scheduled release is enabled";
    }
    return nextErrors;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!school || saving) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    setError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const body = {
      title: name.trim(),
      dripEnabled,
      dripType: dripType ?? null,
      dripDelaySeconds:
        dripType === "relative-date" ? Number(dripDelayDays) * SECONDS_PER_DAY : null,
      dripAt:
        dripType === "exact-date" && dripAt ? new Date(dripAt).toISOString() : null,
    };
    try {
      const response = await fetch(
        mode === "new"
          ? `/api/v1/products/${encodeURIComponent(productId)}/sections`
          : `/api/v1/sections/${encodeURIComponent(sectionId!)}`,
        {
          method: mode === "new" ? "POST" : "PATCH",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-school-id": school.id,
          },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const responseBody = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(responseBody?.message ?? "Unable to save the section.");
      }
      router.replace(`${productRoot}/content`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save the section.",
      );
      setSaving(false);
    }
  }

  const currentLocalTime = new Date(
    Date.now() - new Date().getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 16);

  return (
    <AuthGate>
      <div className="w-full space-y-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">{heading}</h1>
          <p className="mt-2 text-muted-foreground">
            {mode === "new"
              ? "Add a new section to your course"
              : "Update section details"}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading section…</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <form onSubmit={save} className="space-y-8">
            <div className="space-y-4">
              <Label htmlFor="section-name">Section Name</Label>
              <Input
                id="section-name"
                data-error="sectionName"
                autoFocus
                required
                maxLength={200}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter section name"
                aria-invalid={Boolean(errors.sectionName)}
              />
              {errors.sectionName ? (
                <p className="text-sm text-destructive">{errors.sectionName}</p>
              ) : null}
            </div>

            <Separator />

            {product?.kind === "course" ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Content Release</h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Content release help"
                          className="text-muted-foreground"
                        >
                          <HelpCircle className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Control when this section becomes available to students
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="scheduled-release">Scheduled Release</Label>
                    <p className="text-sm text-muted-foreground">
                      Release content gradually to your students
                    </p>
                  </div>
                  <Switch
                    id="scheduled-release"
                    checked={dripEnabled}
                    onCheckedChange={setDripEnabled}
                  />
                </div>

                {dripEnabled ? (
                  <div className="animate-in fade-in-50 space-y-6 rounded-lg border p-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="release-type">Release Type</Label>
                        <Select
                          value={dripType}
                          onValueChange={(value) => {
                            setDripType(value as DripType);
                            setErrors((current) => ({
                              ...current,
                              dripType: "",
                              releaseDays: "",
                              releaseDate: "",
                            }));
                          }}
                        >
                          <SelectTrigger
                            id="release-type"
                            data-error="dripType"
                            aria-invalid={Boolean(errors.dripType)}
                          >
                            <SelectValue placeholder="Select release type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="exact-date">
                              Release on specific date
                            </SelectItem>
                            <SelectItem value="relative-date">
                              Release days after previous section
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.dripType ? (
                          <p className="text-sm text-destructive">{errors.dripType}</p>
                        ) : null}
                      </div>

                      {dripType === "exact-date" ? (
                        <div className="space-y-2">
                          <Label htmlFor="release-date">Release Date &amp; Time</Label>
                          <Input
                            id="release-date"
                            data-error="releaseDate"
                            type="datetime-local"
                            min={currentLocalTime}
                            value={dripAt}
                            onChange={(event) => setDripAt(event.target.value)}
                            aria-invalid={Boolean(errors.releaseDate)}
                          />
                          {errors.releaseDate ? (
                            <p className="text-sm text-destructive">
                              {errors.releaseDate}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {dripType === "relative-date" ? (
                        <div className="space-y-2">
                          <Label htmlFor="release-days">
                            Days after previous section
                          </Label>
                          <div className="flex max-w-[220px] items-center gap-2">
                            <Input
                              id="release-days"
                              data-error="releaseDays"
                              type="number"
                              min="1"
                              step="1"
                              value={dripDelayDays}
                              onChange={(event) => setDripDelayDays(event.target.value)}
                              placeholder="0"
                              aria-invalid={Boolean(errors.releaseDays)}
                            />
                            <span className="whitespace-nowrap text-sm text-muted-foreground">
                              days
                            </span>
                          </div>
                          {errors.releaseDays ? (
                            <p className="text-sm text-destructive">
                              {errors.releaseDays}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <Separator />

                    <p className="text-sm text-muted-foreground">
                      Students will see this section after its release schedule is met.
                      Email notifications will be added later.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <Button asChild variant="outline">
                <Link href={`${productRoot}/content`}>Cancel</Link>
              </Button>
              <Button type="submit" disabled={!name.trim() || saving}>
                <Save className="size-4" />
                {saving ? "Saving…" : mode === "new" ? "Continue" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : null}
        <Resources
          links={[
            {
              href: "https://docs.courselit.app/courses/section/#drip-a-section",
              text: "Drip content",
            },
          ]}
        />
      </div>
    </AuthGate>
  );
}
