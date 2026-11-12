"use client";

import { BookOpen, Download } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { PageHeader } from "@/components/layout/page-header";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import type { School } from "@/components/products/product-types";
import { CardBody, CardHead, WorkspaceCard } from "@/components/products/product-ui";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  type DownloadAccess,
  type NewProductKind,
  newProductBody,
  newProductNextHint,
  productSlugPreview,
  storefrontLinkPrefix,
} from "@/lib/new-product";
import { hasSchoolPermission } from "@/lib/school-permissions";
import { cn } from "@/lib/utils";
import { AuthGate } from "../../../components/auth-gate";
import { PermissionMessage } from "../../../components/permission-message";

const KINDS: Array<{
  value: NewProductKind;
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    value: "course",
    title: "Course",
    description:
      "Lessons people work through at their own pace, grouped into sections.",
    icon: <BookOpen className="size-[22px]" />,
  },
  {
    value: "download",
    title: "Digital download",
    description:
      "Guides, templates, presets or ebooks people get straight away. Sell them or give them away for an email address.",
    icon: <Download className="size-[22px]" />,
  },
];

const ACCESS: Array<{ value: DownloadAccess; title: string; description: string }> = [
  {
    value: "sell",
    title: "Sell it",
    description: "People get the files after they pay or join a free plan.",
  },
  {
    value: "lead",
    title: "Lead magnet",
    description: "Free for an email address. Grows your mailing list.",
  },
];

/** The round marker on a choice card; filled when the card is picked. */
function ChoiceDot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-0.5 grid size-5 place-items-center rounded-full border-[1.5px]",
        on ? "border-primary" : "border-input",
      )}
    >
      {on ? <span className="size-2.5 rounded-full bg-primary" /> : null}
    </span>
  );
}

const choiceCard =
  "relative cursor-pointer border bg-card transition-[border-color,box-shadow] hover:border-muted-foreground has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring";
const choiceOn =
  "border-primary shadow-[0_0_0_3px_var(--primary-soft)] hover:border-primary";

export default function NewProductPage() {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [kind, setKind] = useState<NewProductKind>("course");
  const [access, setAccess] = useState<DownloadAccess>("sell");
  const [title, setTitle] = useState("");
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSetBreadcrumb([
    { label: "Products", href: "/products" },
    { label: "New product" },
  ]);

  useEffect(() => {
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: School[] }) => {
        setSchool(body.items?.find((item) => item.selected) ?? body.items?.[0] ?? null);
      })
      .catch(() => setError("Unable to load the active school."))
      .finally(() => setLoadingSchool(false));
  }, []);

  const isCourse = kind === "course";
  const hasTitle = Boolean(title.trim());
  const missingTitle = tried && !hasTitle;
  const slug = productSlugPreview(title) || "your-product";

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!hasTitle) {
      setTried(true);
      document.getElementById("product-title")?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (school) headers["x-school-id"] = school.id;
      const response = await fetch("/api/v1/products", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(newProductBody(kind, access, title)),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
          details?: { reason?: string };
        } | null;
        if (body?.details?.reason === "slug_taken") {
          throw new Error("A product with this title already exists.");
        }
        throw new Error(body?.message ?? "Unable to create the product.");
      }
      const product = (await response.json()) as { id: string };
      // Land on the Content (or Files) tab: what to add first.
      router.replace(`/products/${encodeURIComponent(product.id)}/content`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create the product.",
      );
      setLoading(false);
    }
  }

  return (
    <AuthGate>
      <div className="page-shell">
        {loadingSchool ? <CourseLitLoading label="Loading product setup…" /> : null}
        <PageHeader
          title="New product"
          description="Pick what you're making and give it a name. It starts as a draft; nobody can see it until you make it live."
        />

        {school && !hasSchoolPermission(school, "products:write") ? (
          <PermissionMessage permission="products:write" />
        ) : (
          <form onSubmit={create} noValidate className="flex min-w-0 flex-col gap-4">
            <WorkspaceCard aria-labelledby="new-product-kind">
              <CardHead
                title={<span id="new-product-kind">What are you making?</span>}
                description="You can't change this later, so pick the one that fits."
              />
              <CardBody className="space-y-4">
                <div
                  role="radiogroup"
                  aria-labelledby="new-product-kind"
                  className="grid gap-3 md:grid-cols-2"
                >
                  {KINDS.map((option) => {
                    const on = kind === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          choiceCard,
                          "grid grid-cols-[44px_minmax(0,1fr)_20px] items-start gap-3.5 rounded-xl p-[18px]",
                          on && choiceOn,
                        )}
                      >
                        <input
                          type="radio"
                          name="kind"
                          value={option.value}
                          checked={on}
                          onChange={() => {
                            setKind(option.value);
                            setAccess("sell");
                          }}
                          className="pointer-events-none absolute opacity-0"
                        />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "grid size-11 place-items-center rounded-[12px]",
                            on
                              ? "bg-[var(--primary-soft)] text-[var(--primary-ink)]"
                              : "bg-muted text-foreground",
                          )}
                        >
                          {option.icon}
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <b className="text-base font-bold">{option.title}</b>
                          <span className="text-sm leading-normal text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                        <ChoiceDot on={on} />
                      </label>
                    );
                  })}
                </div>
                <p className="text-[12.5px] text-muted-foreground">
                  Running a community? Set it up from{" "}
                  <Link
                    href="/community"
                    className="font-semibold text-[var(--primary-ink)] underline-offset-[3px] hover:underline"
                  >
                    Community
                  </Link>{" "}
                  instead.
                </p>
              </CardBody>
            </WorkspaceCard>

            {isCourse ? null : (
              <WorkspaceCard aria-labelledby="new-product-access">
                <CardHead
                  title={<span id="new-product-access">How people get it</span>}
                  description="You can switch this in Settings later."
                />
                <CardBody>
                  <div
                    role="radiogroup"
                    aria-labelledby="new-product-access"
                    className="grid gap-2.5 sm:grid-cols-2"
                  >
                    {ACCESS.map((option) => {
                      const on = access === option.value;
                      return (
                        <label
                          key={option.value}
                          className={cn(
                            choiceCard,
                            "grid grid-cols-[minmax(0,1fr)_20px] items-start gap-2.5 rounded-[var(--radius)] p-3.5",
                            on && choiceOn,
                          )}
                        >
                          <input
                            type="radio"
                            name="access"
                            value={option.value}
                            checked={on}
                            onChange={() => setAccess(option.value)}
                            className="pointer-events-none absolute opacity-0"
                          />
                          <span className="flex min-w-0 flex-col gap-1">
                            <b className="text-[14.5px] font-semibold">
                              {option.title}
                            </b>
                            <span className="text-[13px] leading-[1.45] text-muted-foreground">
                              {option.description}
                            </span>
                          </span>
                          <ChoiceDot on={on} />
                        </label>
                      );
                    })}
                  </div>
                </CardBody>
              </WorkspaceCard>
            )}

            <WorkspaceCard aria-labelledby="new-product-name">
              <CardHead
                title={<span id="new-product-name">Name</span>}
                description="Shown on your site and at checkout. You can change it later."
              />
              <CardBody>
                <div className="space-y-1.5">
                  <Label htmlFor="product-title">Title</Label>
                  <Input
                    id="product-title"
                    maxLength={200}
                    autoComplete="off"
                    value={title}
                    aria-invalid={missingTitle || undefined}
                    aria-describedby="product-title-hint"
                    className={cn(missingTitle && "border-destructive")}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setTried(false);
                    }}
                    placeholder={
                      isCourse
                        ? "e.g. Watercolour basics"
                        : "e.g. The six-colour palette guide"
                    }
                  />
                  <p
                    id="product-title-hint"
                    className={cn(
                      "text-[12.5px]",
                      missingTitle ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {missingTitle ? (
                      "Give it a name to continue."
                    ) : hasTitle ? (
                      <>
                        Link:{" "}
                        <span className="font-mono">
                          {storefrontLinkPrefix(school?.storefrontOrigin)}
                          {slug}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </CardBody>
            </WorkspaceCard>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <p className="min-w-0 flex-[1_1_260px] text-[12.5px] text-muted-foreground">
                {newProductNextHint(kind, access)}
              </p>
              <Button asChild variant="outline">
                <Link href="/products">Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={loading || loadingSchool}
                aria-label={loading ? "Creating draft" : undefined}
              >
                {loading ? <CourseLitLoadingIcon size={16} /> : "Create draft"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AuthGate>
  );
}
