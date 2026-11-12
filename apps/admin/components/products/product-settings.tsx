"use client";

import type { Editor } from "@frontlit/text-editor";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ComponentProps,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { CommunityReports } from "@/components/communities/community-reports";
import { useUnsavedChangesWarning } from "@/components/mails/unsaved-changes";
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
import { Switch } from "@/components/ui/codelit/switch";
import type { ProductPhase } from "@/lib/product-publishing";
import { cn } from "@/lib/utils";
import {
  hasConfiguredPaymentProvider,
  type PaymentSettings,
} from "./payment-plan-dialog";
import { PaymentPlanList } from "./payment-plan-list";
import { ProductCertificates } from "./product-certificates";
import { ProductFeaturedImage } from "./product-featured-image";
import type { Product, School, StorefrontPlan } from "./product-types";
import { AccentBadge, CardBody, CardHead, Note, WorkspaceCard } from "./product-ui";
import {
  errorText,
  kindWord,
  type ProductDetail,
  type WorkspaceRequest,
} from "./product-workspace";
import { RichTextEditor } from "./rich-text-editor";

function editorContent(value: string): ComponentProps<typeof Editor>["initialContent"] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Legacy and newly-created plain-text descriptions are valid editor input.
  }
  return value;
}

// Module-level, so CommunityReports gets the same functions on every render.
function toastNotice(notice: string | null) {
  if (notice) toast.success(notice);
}
function toastError(error: string | null) {
  if (error) toast.error(error);
}

/** The settings card named in the URL hash, highlighted for a moment after arriving. */
function useHashHighlight() {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    if (!document.getElementById(id)) return;
    setHighlighted(id);
    // Wait for the description editor to lay out so the card does not move after scrolling.
    const scroll = window.setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
    const clear = window.setTimeout(() => setHighlighted(null), 2800);
    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(clear);
    };
  }, []);
  return highlighted;
}

/** Where a product's sales page lives, minus its slug: "school.example/p/". */
function linkPrefix(salesPageUrl: string | null) {
  if (!salesPageUrl) return "/p/";
  try {
    const url = new URL(salesPageUrl);
    return `${url.host}/p/`;
  } catch {
    return "/p/";
  }
}

export function ProductSettings({
  product,
  school,
  plans,
  setPlans,
  phase,
  request,
  refresh,
  salesPageUrl,
}: {
  product: ProductDetail;
  school: School;
  plans: StorefrontPlan[];
  setPlans: Dispatch<SetStateAction<StorefrontPlan[]>>;
  phase: ProductPhase;
  request: WorkspaceRequest;
  refresh: () => Promise<void>;
  salesPageUrl: string | null;
}) {
  const router = useRouter();
  const productId = product.id;
  const word = kindWord(product.kind);
  const isCourse = product.kind === "course";
  const highlighted = useHashHighlight();

  const [titleDraft, setTitleDraft] = useState(product.title);
  const [slugDraft, setSlugDraft] = useState(product.slug);
  const [descriptionDraft, setDescriptionDraft] = useState(product.description);
  const [descriptionVersion, setDescriptionVersion] = useState(0);
  const [savingDetails, setSavingDetails] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [paymentsConnected, setPaymentsConnected] = useState<boolean | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const detailsDirty =
    titleDraft.trim() !== product.title ||
    slugDraft.trim() !== product.slug ||
    descriptionDraft !== product.description;
  useUnsavedChangesWarning(detailsDirty);

  useEffect(() => {
    let active = true;
    void request<PaymentSettings>("/api/v1/school/payment-settings")
      .then((settings) => {
        if (active) setPaymentsConnected(hasConfiguredPaymentProvider(settings));
      })
      .catch(() => {
        if (active) setPaymentsConnected(null);
      });
    return () => {
      active = false;
    };
  }, [request]);

  const activePlans = plans.filter((plan) => plan.status === "active");
  const hasPaidPlan = activePlans.some((plan) => plan.kind !== "free");
  const hasExactlyOneFreePlan =
    activePlans.length === 1 && activePlans[0]?.kind === "free";

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detailsDirty || !titleDraft.trim() || !slugDraft.trim() || savingDetails)
      return;
    setSavingDetails(true);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: titleDraft.trim(),
          description: descriptionDraft,
          slug: slugDraft.trim(),
        }),
      });
      await refresh();
      setTitleDraft(titleDraft.trim());
      setSlugDraft(slugDraft.trim());
      toast.success("Details saved");
    } catch (caught) {
      toast.error(errorText(caught, "Unable to save the details."));
    } finally {
      setSavingDetails(false);
    }
  }

  function discardDetails() {
    setTitleDraft(product.title);
    setSlugDraft(product.slug);
    setDescriptionDraft(product.description);
    setDescriptionVersion((version) => version + 1);
  }

  /** Saves one setting right away, the way switches and radios do. */
  async function patch(
    key: string,
    body: Partial<
      Pick<
        Product,
        "privacy" | "leadMagnet" | "certificate" | "discussions" | "featuredImage"
      >
    >,
    done: string,
  ) {
    if (busy) return;
    setBusy(key);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await refresh();
      toast.success(done);
    } catch (caught) {
      toast.error(errorText(caught, "Unable to save the change."));
    } finally {
      setBusy(null);
    }
  }

  async function deleteProduct() {
    if (deleting || deleteConfirmation !== "delete") return;
    setDeleting(true);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      router.replace("/products");
    } catch (caught) {
      toast.error(errorText(caught, `Unable to delete the ${word}.`));
      setDeleting(false);
    }
  }

  const visibilityOptions = [
    {
      value: "public" as const,
      title: "Anyone",
      description: "Listed on your site's products page.",
    },
    {
      value: "unlisted" as const,
      title: "Only people with the link",
      description: "Hidden from your site. Share the link yourself.",
    },
  ];

  return (
    <div className="space-y-4">
      <WorkspaceCard id="set-details" highlighted={highlighted === "set-details"}>
        <form onSubmit={saveDetails}>
          <CardHead
            title="Details"
            description="Shown on the sales page and in search results."
          />
          <CardBody>
            <div className="field">
              <Label htmlFor="product-title">Name</Label>
              <Input
                id="product-title"
                required
                maxLength={200}
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
              />
            </div>
            <div className="field">
              <Label htmlFor="product-slug">Link</Label>
              <div className="flex h-9 items-center overflow-hidden rounded-[var(--radius)] border border-input bg-card focus-within:border-ring focus-within:shadow-[0_0_0_3px_var(--primary-soft)]">
                <span className="flex h-full items-center border-r bg-muted px-3 font-mono text-xs text-muted-foreground">
                  {linkPrefix(salesPageUrl)}
                </span>
                <input
                  id="product-slug"
                  data-slot="input"
                  required
                  maxLength={200}
                  value={slugDraft}
                  onChange={(event) => setSlugDraft(event.target.value)}
                  className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Changing it breaks links you&apos;ve already shared.
              </p>
            </div>
            <div className="field">
              <span>Description</span>
              <RichTextEditor
                key={descriptionVersion}
                school={school}
                purpose="product_content"
                initialContent={editorContent(descriptionDraft)}
                refresh={descriptionVersion}
                onChange={(document) => setDescriptionDraft(JSON.stringify(document))}
                placeholder="Tell people what they'll learn."
                className="rounded-md border bg-card"
                contentClassName="max-w-none"
                editorClassName="min-h-[120px]"
              />
            </div>
            <ProductFeaturedImage
              school={school}
              value={product.featuredImage}
              onChange={(featuredImage) =>
                void patch(
                  "image",
                  { featuredImage },
                  featuredImage ? "Featured image saved" : "Featured image removed",
                )
              }
            />
            {detailsDirty ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                <span className="mr-auto text-sm text-muted-foreground">
                  You have unsaved changes.
                </span>
                <Button type="button" variant="ghost" onClick={discardDetails}>
                  Discard
                </Button>
                <Button
                  type="submit"
                  disabled={!titleDraft.trim() || !slugDraft.trim() || savingDetails}
                >
                  {savingDetails ? "Saving…" : "Save details"}
                </Button>
              </div>
            ) : null}
          </CardBody>
        </form>
      </WorkspaceCard>

      {product.kind === "download" ? (
        <WorkspaceCard id="set-lead" highlighted={highlighted === "set-lead"}>
          <CardHead
            className={
              product.leadMagnet || !hasExactlyOneFreePlan ? undefined : "pb-5"
            }
            title="Lead magnet"
            description="Give it away in exchange for an email address. People who sign up get the download and join your contacts."
            action={
              <Switch
                aria-label="Lead magnet"
                checked={product.leadMagnet}
                disabled={
                  Boolean(busy) || (!product.leadMagnet && !hasExactlyOneFreePlan)
                }
                onCheckedChange={(checked) =>
                  void patch(
                    "lead",
                    { leadMagnet: checked === true },
                    checked ? "Lead magnet on" : "Lead magnet off",
                  )
                }
              />
            }
          />
          {product.leadMagnet || !hasExactlyOneFreePlan ? (
            <CardBody className="pt-3">
              {product.leadMagnet ? (
                <Note tone="info">
                  <b>People sign up with their email to get it.</b> It uses the free
                  plan, so keep that as the only plan.
                </Note>
              ) : (
                <Note tone="warn">
                  To turn this on, keep exactly one plan and make it free.
                </Note>
              )}
            </CardBody>
          ) : null}
        </WorkspaceCard>
      ) : null}

      <PaymentPlanList
        id="set-plans"
        highlighted={highlighted === "set-plans"}
        badge={phase === "draft" ? <AccentBadge>Needed to go live</AccentBadge> : null}
        title="Payment plans"
        description="Offer one or several. Learners pick one at checkout; the starred plan is shown first."
        listPath={`/api/v1/products/${encodeURIComponent(productId)}/plans`}
        createPath={`/api/v1/products/${encodeURIComponent(productId)}/plans`}
        planPath={(planId) => `/api/v1/plans/${encodeURIComponent(planId)}`}
        defaultPath={(planId) => `/api/v1/plans/${encodeURIComponent(planId)}/default`}
        archivePath={(planId) => `/api/v1/plans/${encodeURIComponent(planId)}/archive`}
        school={school}
        plans={plans}
        request={request}
        onChanged={setPlans}
      >
        {hasPaidPlan && paymentsConnected === false ? (
          <Note
            tone="warn"
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/payment">Payment settings</Link>
              </Button>
            }
          >
            <b>Connect payments to charge for paid plans.</b> Free plans work without
            it.
          </Note>
        ) : null}
      </PaymentPlanList>

      <WorkspaceCard id="set-visibility" highlighted={highlighted === "set-visibility"}>
        <CardHead
          title="Who can find it"
          description="Whether it shows on your site. You can change this any time."
        />
        <CardBody>
          <div
            role="radiogroup"
            aria-label="Who can find it"
            className="grid gap-2.5 sm:grid-cols-2"
          >
            {visibilityOptions.map((option) => {
              const on = product.privacy === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border px-4 py-3.5 transition-colors",
                    on
                      ? "border-primary bg-[var(--primary-soft)]"
                      : "hover:border-input",
                    busy && "pointer-events-none opacity-70",
                  )}
                >
                  <input
                    type="radio"
                    name="product-visibility"
                    className="mt-1 accent-[var(--primary)]"
                    checked={on}
                    disabled={Boolean(busy)}
                    onChange={() =>
                      void patch(
                        "visibility",
                        { privacy: option.value },
                        option.value === "public"
                          ? "Listed on your site"
                          : "Hidden from your site. Only people with the link can find it.",
                      )
                    }
                  />
                  <span className="flex flex-col gap-0.5">
                    <b className="text-[14.5px] font-semibold">{option.title}</b>
                    <span className="text-[13px] text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </CardBody>
      </WorkspaceCard>

      {isCourse ? (
        <WorkspaceCard
          id="set-discussions"
          highlighted={highlighted === "set-discussions"}
        >
          <CardHead
            className={product.discussions ? undefined : "pb-5"}
            title="Discussions"
            description="A discussion space for this course. Learners can post and reply under lessons."
            action={
              <Switch
                aria-label="Discussions"
                checked={product.discussions}
                disabled={Boolean(busy)}
                onCheckedChange={(checked) =>
                  void patch(
                    "discussions",
                    { discussions: checked === true },
                    checked ? "Discussions on" : "Discussions off",
                  )
                }
              />
            }
          />
          {product.discussions ? (
            <CardBody>
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-[14.5px] font-semibold">Reports</h3>
                <CommunityReports
                  reportsPath={`/api/v1/products/${encodeURIComponent(productId)}/discussion-reports`}
                  request={request}
                  setNotice={toastNotice}
                  setError={toastError}
                />
              </div>
            </CardBody>
          ) : null}
        </WorkspaceCard>
      ) : null}

      {isCourse ? (
        <div
          id="set-certificate"
          className={cn(
            "scroll-mt-24 rounded-xl transition-shadow duration-300",
            highlighted === "set-certificate" &&
              "shadow-[0_0_0_3px_var(--primary-soft)]",
          )}
        >
          <ProductCertificates
            school={school}
            productId={productId}
            productTitle={product.title}
            enabled={product.certificate}
            onToggle={(enabled) =>
              void patch(
                "certificate",
                { certificate: enabled },
                enabled ? "Certificates on" : "Certificates off",
              )
            }
          />
        </div>
      ) : null}

      <WorkspaceCard>
        <CardHead
          className="pb-5"
          titleClassName="text-destructive"
          title={`Delete ${word}`}
          description="Removes its content, payment plans and everyone's access. This can't be undone. To hide it without deleting anything, take it offline instead."
          action={
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setDeleteConfirmation("");
                setDeleteDialogOpen(true);
              }}
            >
              Delete {word}
            </Button>
          }
        />
      </WorkspaceCard>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteConfirmation("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {product.title}?</DialogTitle>
            <DialogDescription>
              This removes its content, payment plans and everyone&apos;s access. It
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-product-confirmation">
              Type &quot;delete&quot; to confirm
            </Label>
            <Input
              id="delete-product-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              placeholder="delete"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void deleteProduct()}
              disabled={deleteConfirmation !== "delete" || deleting}
            >
              {deleting ? "Deleting…" : `Delete ${word}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
