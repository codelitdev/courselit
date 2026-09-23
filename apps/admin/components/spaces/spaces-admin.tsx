"use client";

import { Hash, Package, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { PageHeader } from "@/components/layout/page-header";
import type { School } from "@/components/layout/team-switcher";
import { Button } from "@/components/ui/codelit/button";
import { Checkbox } from "@/components/ui/codelit/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Switch } from "@/components/ui/codelit/switch";
import { hasSchoolPermission } from "@/lib/school-permissions";
import { cn } from "@/lib/utils";

type SpaceUnlock = {
  entityType: "community" | "product";
  entityId?: string;
  planIds: string[];
};

type Space = {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo: string;
  follow: boolean;
  whoCanPost: "members" | "admin";
  position: number;
  unlocks: SpaceUnlock[];
};

type AccessPlan = {
  id: string;
  name: string;
  status: "active" | "archived";
  type?: "free" | "onetime" | "emi" | "subscription";
  kind?: "free" | "one_time" | "subscription" | "installment";
  currency?: string;
  oneTimeAmount?: number | null;
  emiAmount?: number | null;
  emiTotalInstallments?: number | null;
  subscriptionMonthlyAmount?: number | null;
  subscriptionYearlyAmount?: number | null;
  amountMinor?: number;
  billingInterval?: "month" | "year" | null;
  installmentCount?: number | null;
};

type Product = {
  id: string;
  title: string;
  kind: "course" | "download";
  status: "draft" | "published";
};

type ProductUnlockDraft = {
  mode: "all" | "specific";
  planIds: string[];
};

function planSubtitle(plan: AccessPlan): string {
  const currency = plan.currency || "USD";
  if (plan.type === "free" || plan.kind === "free") return "Free";
  const oneTimeAmount =
    plan.oneTimeAmount ?? (plan.amountMinor != null ? plan.amountMinor / 100 : null);
  const emiAmount =
    plan.emiAmount ?? (plan.amountMinor != null ? plan.amountMinor / 100 : null);
  const subscriptionAmount =
    plan.subscriptionMonthlyAmount ??
    plan.subscriptionYearlyAmount ??
    (plan.amountMinor != null ? plan.amountMinor / 100 : null);

  const formatAmount = (amt: number | null) => {
    if (amt == null) return "";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(amt);
  };

  if (plan.type === "onetime" || plan.kind === "one_time") {
    return formatAmount(oneTimeAmount);
  }
  if (plan.type === "emi" || plan.kind === "installment") {
    const installments = plan.emiTotalInstallments ?? plan.installmentCount ?? 0;
    return `${formatAmount(emiAmount)} × ${installments}`;
  }
  if (plan.type === "subscription" || plan.kind === "subscription") {
    const interval =
      plan.subscriptionYearlyAmount != null || plan.billingInterval === "year"
        ? "yr"
        : "mo";
    return `${formatAmount(subscriptionAmount)}/${interval}`;
  }
  if (plan.amountMinor != null) {
    return formatAmount(plan.amountMinor / 100);
  }
  return "";
}

function PlanOption({
  plan,
  checked,
  onCheckedChange,
}: {
  plan: AccessPlan;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const checkboxId = useId();
  const subtitle = planSubtitle(plan);
  return (
    <div
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        checked
          ? "bg-primary/10 font-medium text-foreground"
          : "text-foreground hover:bg-muted/50",
      )}
    >
      <Checkbox
        id={checkboxId}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <label
        htmlFor={checkboxId}
        className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-2"
      >
        <span className="truncate">{plan.name}</span>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          {subtitle ? <span>{subtitle}</span> : null}
          {plan.status === "archived" ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Archived
            </span>
          ) : null}
        </div>
      </label>
    </div>
  );
}

type AccessMode = "all_members" | "specific_members";

export function SpacesAdmin() {
  useSetBreadcrumb([{ label: "Spaces" }]);
  const [school, setSchool] = useState<School | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [communityPlans, setCommunityPlans] = useState<AccessPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productPlans, setProductPlans] = useState<Record<string, AccessPlan[]>>({});
  const [loadingProductPlanIds, setLoadingProductPlanIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Space | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Space | null>(null);
  const [deleteDestinationId, setDeleteDestinationId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState("MessagesSquare");
  const [follow, setFollow] = useState(false);
  const [whoCanPost, setWhoCanPost] = useState<"members" | "admin">("members");
  const [accessMode, setAccessMode] = useState<AccessMode>("all_members");
  const [selectedCommunityPlanIds, setSelectedCommunityPlanIds] = useState<string[]>(
    [],
  );
  const [selectedProductUnlocks, setSelectedProductUnlocks] = useState<
    Record<string, ProductUnlockDraft>
  >({});

  const canWrite = hasSchoolPermission(school, "communities:write");
  const canReadProducts = hasSchoolPermission(school, "products:read");
  const canReadProductPlans = hasSchoolPermission(school, "storefront:read");
  const selectableCommunityPlans = communityPlans.filter(
    (plan) => plan.status === "active" || selectedCommunityPlanIds.includes(plan.id),
  );

  const request = useCallback(
    async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
      if (!school) throw new Error("Select a school first.");
      const headers = new Headers(init.headers);
      headers.set("x-school-id", school.id);
      if (init.body && !headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
      const response = await fetch(path, {
        ...init,
        cache: "no-store",
        credentials: "include",
        headers,
      });
      const body = (await response.json().catch(() => null)) as T & {
        message?: string;
      };
      if (!response.ok) {
        throw new Error(body?.message || "The request could not be completed.");
      }
      return body;
    },
    [school],
  );

  const reload = useCallback(async (selected: School) => {
    const body = await fetch("/api/v1/spaces", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": selected.id },
    }).then((response) => response.json() as Promise<{ items?: Space[] }>);
    setSpaces(body.items ?? []);
  }, []);

  const reloadCommunityPlans = useCallback(async (selected: School) => {
    const headers = { "x-school-id": selected.id };
    const communityResponse = await fetch("/api/v1/community", {
      credentials: "include",
      cache: "no-store",
      headers,
    });
    const community = (await communityResponse.json().catch(() => null)) as {
      id?: string;
      message?: string;
    } | null;
    if (!communityResponse.ok || !community?.id) {
      throw new Error(community?.message ?? "Unable to load community plans.");
    }
    const plansResponse = await fetch(
      `/api/v1/communities/${encodeURIComponent(community.id)}/plans`,
      {
        credentials: "include",
        cache: "no-store",
        headers,
      },
    );
    const plansBody = (await plansResponse.json().catch(() => null)) as {
      items?: AccessPlan[];
      message?: string;
    } | null;
    if (!plansResponse.ok) {
      throw new Error(plansBody?.message ?? "Unable to load community plans.");
    }
    setCommunityPlans(plansBody?.items ?? []);
  }, []);

  const reloadProducts = useCallback(async (selected: School) => {
    if (!hasSchoolPermission(selected, "products:read")) {
      setProducts([]);
      return;
    }

    const items: Product[] = [];
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ limit: "50" });
      if (cursor) query.set("cursor", cursor);
      const response = await fetch(`/api/v1/products?${query.toString()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": selected.id },
      });
      const body = (await response.json().catch(() => null)) as {
        items?: Product[];
        nextCursor?: string | null;
        message?: string;
      } | null;
      if (!response.ok) {
        throw new Error(body?.message ?? "Unable to load products.");
      }
      items.push(...(body?.items ?? []));
      cursor = body?.nextCursor ?? null;
    } while (cursor);

    setProducts(items);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) throw new Error("Create a school before managing spaces.");
        if (active) setSchool(selected);
        await Promise.all([
          reload(selected),
          reloadCommunityPlans(selected),
          reloadProducts(selected),
        ]);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Unable to load spaces.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload, reloadCommunityPlans, reloadProducts]);

  async function ensureProductPlans(productId: string) {
    if (
      !canReadProducts ||
      !canReadProductPlans ||
      productPlans[productId] ||
      loadingProductPlanIds.includes(productId)
    ) {
      return;
    }
    setLoadingProductPlanIds((current) => [...current, productId]);
    try {
      const body = await request<{ items?: AccessPlan[] }>(
        `/api/v1/products/${encodeURIComponent(productId)}/plans`,
      );
      setProductPlans((current) => ({
        ...current,
        [productId]: body.items ?? [],
      }));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load product payment plans.",
      );
    } finally {
      setLoadingProductPlanIds((current) => current.filter((id) => id !== productId));
    }
  }

  function startCreate() {
    setError(null);
    setCreating(true);
    setEditing(null);
    setName("");
    setDescription("");
    setLogo("MessagesSquare");
    setFollow(false);
    setWhoCanPost("members");
    setAccessMode("all_members");
    setSelectedCommunityPlanIds([]);
    setSelectedProductUnlocks({});
  }

  function startEdit(space: Space) {
    setError(null);
    setCreating(false);
    setEditing(space);
    setName(space.name);
    setDescription(space.description);
    setLogo(space.logo);
    setFollow(space.follow);
    setWhoCanPost(space.whoCanPost);
    const communityUnlock = space.unlocks.find(
      (unlock) => unlock.entityType === "community",
    );
    const productUnlocks = space.unlocks.filter(
      (unlock) => unlock.entityType === "product" && unlock.entityId,
    );
    setAccessMode(
      communityUnlock &&
        communityUnlock.planIds.length === 0 &&
        productUnlocks.length === 0
        ? "all_members"
        : "specific_members",
    );
    setSelectedCommunityPlanIds(communityUnlock?.planIds ?? []);
    setSelectedProductUnlocks(
      Object.fromEntries(
        productUnlocks.map((unlock) => [
          unlock.entityId!,
          {
            mode: unlock.planIds.length === 0 ? "all" : "specific",
            planIds: unlock.planIds,
          } satisfies ProductUnlockDraft,
        ]),
      ),
    );
    for (const unlock of productUnlocks) {
      if (unlock.planIds.length > 0) void ensureProductPlans(unlock.entityId!);
    }
  }

  function closeEditor() {
    setCreating(false);
    setEditing(null);
    setError(null);
  }

  function startDelete(space: Space) {
    const destination = spaces.find((item) => item.id !== space.id);
    setError(null);
    setDeleting(space);
    setDeleteDestinationId(destination?.id ?? "");
  }

  function closeDeleteDialog() {
    setDeleting(null);
    setDeleteDestinationId("");
    setError(null);
  }

  function unlocks(): SpaceUnlock[] {
    if (accessMode === "all_members") {
      return [{ entityType: "community", planIds: [] }];
    }

    return [
      ...(selectedCommunityPlanIds.length > 0
        ? [
            {
              entityType: "community" as const,
              planIds: selectedCommunityPlanIds,
            },
          ]
        : []),
      ...Object.entries(selectedProductUnlocks).map(([productId, selection]) => ({
        entityType: "product" as const,
        entityId: productId,
        planIds: selection.mode === "all" ? [] : selection.planIds,
      })),
    ];
  }

  function toggleCommunityPlan(planId: string, checked: boolean) {
    setSelectedCommunityPlanIds((current) =>
      checked
        ? current.includes(planId)
          ? current
          : [...current, planId]
        : current.filter((id) => id !== planId),
    );
  }

  function toggleProduct(productId: string, checked: boolean) {
    setSelectedProductUnlocks((current) => {
      const next = { ...current };
      if (checked) {
        next[productId] ??= { mode: "all", planIds: [] };
      } else {
        delete next[productId];
      }
      return next;
    });
  }

  function setProductUnlockMode(productId: string, mode: "all" | "specific") {
    setSelectedProductUnlocks((current) => ({
      ...current,
      [productId]: {
        mode,
        planIds: mode === "all" ? [] : (current[productId]?.planIds ?? []),
      },
    }));
    if (mode === "specific") void ensureProductPlans(productId);
  }

  function toggleProductPlan(productId: string, planId: string, checked: boolean) {
    setSelectedProductUnlocks((current) => {
      const selection = current[productId] ?? { mode: "specific", planIds: [] };
      const planIds = checked
        ? selection.planIds.includes(planId)
          ? selection.planIds
          : [...selection.planIds, planId]
        : selection.planIds.filter((id) => id !== planId);
      return {
        ...current,
        [productId]: { mode: "specific", planIds },
      };
    });
  }

  async function save() {
    if (!school) return;
    if (accessMode === "specific_members") {
      const productEntries = Object.entries(selectedProductUnlocks);
      if (selectedCommunityPlanIds.length === 0 && productEntries.length === 0) {
        setError("Select at least one community plan or product.");
        return;
      }
      const incompleteProduct = productEntries.find(
        ([, selection]) =>
          selection.mode === "specific" && selection.planIds.length === 0,
      );
      if (incompleteProduct) {
        const product = products.find((item) => item.id === incompleteProduct[0]);
        setError(
          `Select at least one payment plan for ${product?.title ?? "the selected product"}.`,
        );
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description,
        logo,
        follow,
        whoCanPost,
        unlocks: unlocks(),
      };
      if (editing) {
        await request(`/api/v1/spaces/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await request("/api/v1/spaces", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setCreating(false);
      setEditing(null);
      await reload(school);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save the space.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!school || !deleting || !deleteDestinationId) return;
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/spaces/${encodeURIComponent(deleting.id)}`, {
        method: "DELETE",
        body: JSON.stringify({ destinationSpaceId: deleteDestinationId }),
      });
      setDeleting(null);
      setDeleteDestinationId("");
      await reload(school);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete the space.",
      );
    } finally {
      setSaving(false);
    }
  }

  function accessSummary(space: Space): string {
    const labels = space.unlocks.map((unlock) => {
      if (unlock.entityType === "community") {
        return unlock.planIds.length === 0
          ? "All community members"
          : `${unlock.planIds.length} community plan${unlock.planIds.length === 1 ? "" : "s"}`;
      }
      const product = products.find((item) => item.id === unlock.entityId);
      const productName = product?.title ?? "Product";
      return unlock.planIds.length === 0
        ? `${productName} members`
        : `${productName}: ${unlock.planIds.length} plan${unlock.planIds.length === 1 ? "" : "s"}`;
    });
    return labels.length > 0 ? ` · ${labels.join(" or ")}` : " · Staff only";
  }

  return (
    <AuthGate>
      <main className="page-shell space-y-6">
        <PageHeader
          title="Spaces"
          description="Discussion areas unlocked by community or product membership."
          action={
            canWrite ? (
              <Button type="button" onClick={startCreate}>
                <Plus className="size-4" />
                New space
              </Button>
            ) : undefined
          }
        />
        {error && !creating && !editing && !deleting ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {loading ? (
          <CourseLitLoading className="rounded-xl border bg-card p-12" />
        ) : spaces.length === 0 && !creating ? (
          <EmptyState
            icon={Hash}
            title="No spaces yet"
            description="Spaces are created with the school. Reload if this is empty."
          />
        ) : (
          <ul className="grid gap-3">
            {spaces.map((space) => (
              <li
                key={space.id}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium">{space.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {space.whoCanPost === "admin" ? "Admins post" : "Members post"}
                    {space.follow ? " · Auto-follow" : ""}
                    {accessSummary(space)}
                  </p>
                </div>
                {canWrite ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => startEdit(space)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => startDelete(space)}
                      disabled={saving || spaces.length < 2}
                    >
                      Delete
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Dialog
          open={creating || Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) closeEditor();
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit space" : "New space"}</DialogTitle>
              <DialogDescription>
                Configure how members access and participate in this discussion area.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-6"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="space-name">Name</Label>
                  <Input
                    id="space-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="space-description">Description</Label>
                  <Input
                    id="space-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="space-logo">Logo (Lucide icon name)</Label>
                  <Input
                    id="space-logo"
                    value={logo}
                    onChange={(event) => setLogo(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="space-who-can-post">Who can post</Label>
                  <Select
                    value={whoCanPost}
                    onValueChange={(value) =>
                      setWhoCanPost(value as "members" | "admin")
                    }
                  >
                    <SelectTrigger id="space-who-can-post">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="members">Members</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="space-follow">Auto-follow on join</Label>
                  <Switch
                    id="space-follow"
                    checked={follow}
                    onCheckedChange={setFollow}
                  />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="space-access">Access</Label>
                    <Select
                      value={accessMode}
                      onValueChange={(value) => setAccessMode(value as AccessMode)}
                    >
                      <SelectTrigger id="space-access">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_members">
                          All community members
                        </SelectItem>
                        <SelectItem value="specific_members">
                          Selected plans or products
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {accessMode === "specific_members" ? (
                    <div className="space-y-5 rounded-xl border p-4">
                      <section className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <Label>Community payment plans</Label>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Members of any selected community plan get access.
                            </p>
                          </div>
                          {selectableCommunityPlans.length > 1 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const allIds = selectableCommunityPlans.map(
                                  (plan) => plan.id,
                                );
                                const areAllSelected = allIds.every((id) =>
                                  selectedCommunityPlanIds.includes(id),
                                );
                                setSelectedCommunityPlanIds(
                                  areAllSelected ? [] : allIds,
                                );
                              }}
                            >
                              {selectableCommunityPlans.every((plan) =>
                                selectedCommunityPlanIds.includes(plan.id),
                              )
                                ? "Deselect all"
                                : "Select all"}
                            </Button>
                          ) : null}
                        </div>

                        {selectableCommunityPlans.length > 0 ? (
                          <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                            {selectableCommunityPlans.map((plan) => (
                              <PlanOption
                                key={plan.id}
                                plan={plan}
                                checked={selectedCommunityPlanIds.includes(plan.id)}
                                onCheckedChange={(checked) =>
                                  toggleCommunityPlan(plan.id, checked)
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                            No active community plans are available. Create one under{" "}
                            <Link
                              href="/community/plans"
                              className="font-medium text-foreground underline underline-offset-4"
                            >
                              Community payment plans
                            </Link>
                            .
                          </p>
                        )}
                      </section>

                      <section className="space-y-3 border-t pt-5">
                        <div className="flex items-start gap-2">
                          <Package className="mt-0.5 size-4 text-muted-foreground" />
                          <div>
                            <Label>Product access</Label>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Product rules are alternatives to the community plans
                              selected above.
                            </p>
                          </div>
                        </div>

                        {!canReadProducts ? (
                          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                            Product read permission is required to configure product
                            access. Existing product rules will be preserved.
                          </p>
                        ) : products.length === 0 ? (
                          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                            No products are available. Create one under{" "}
                            <Link
                              href="/products/new"
                              className="font-medium text-foreground underline underline-offset-4"
                            >
                              Products
                            </Link>
                            .
                          </p>
                        ) : (
                          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                            {products.map((product) => {
                              const selection = selectedProductUnlocks[product.id];
                              const selectedPlanIds = selection?.planIds ?? [];
                              const plans = (productPlans[product.id] ?? []).filter(
                                (plan) =>
                                  plan.status === "active" ||
                                  selectedPlanIds.includes(plan.id),
                              );
                              const plansLoading = loadingProductPlanIds.includes(
                                product.id,
                              );
                              return (
                                <div
                                  key={product.id}
                                  className={cn(
                                    "rounded-lg border p-3 transition-colors",
                                    selection ? "bg-muted/20" : "bg-card",
                                  )}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <Checkbox
                                      id={`product-toggle-${product.id}`}
                                      className="mt-0.5"
                                      checked={Boolean(selection)}
                                      onCheckedChange={(checked) =>
                                        toggleProduct(product.id, checked === true)
                                      }
                                    />
                                    <label
                                      htmlFor={`product-toggle-${product.id}`}
                                      className="min-w-0 flex-1 cursor-pointer"
                                    >
                                      <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium">
                                          {product.title}
                                        </span>
                                        <span className="shrink-0 text-xs capitalize text-muted-foreground">
                                          {product.kind}
                                          {product.status === "draft" ? " · Draft" : ""}
                                        </span>
                                      </span>
                                    </label>
                                  </div>

                                  {selection ? (
                                    <div className="mt-3 space-y-2 pl-7">
                                      <Select
                                        value={selection.mode}
                                        onValueChange={(value) =>
                                          setProductUnlockMode(
                                            product.id,
                                            value as "all" | "specific",
                                          )
                                        }
                                      >
                                        <SelectTrigger
                                          id={`product-access-${product.id}`}
                                        >
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="all">
                                            Any product membership
                                          </SelectItem>
                                          <SelectItem
                                            value="specific"
                                            disabled={!canReadProductPlans}
                                          >
                                            Selected direct-purchase plans
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>

                                      {selection.mode === "all" ? (
                                        <p className="text-xs text-muted-foreground">
                                          Includes direct purchases and access bundled
                                          with another plan.
                                        </p>
                                      ) : !canReadProductPlans ? (
                                        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                          Storefront read permission is required to
                                          change this product's selected plans. Existing
                                          plan selections will be preserved.
                                        </p>
                                      ) : plansLoading ? (
                                        <p
                                          className="flex items-center gap-2 text-xs text-muted-foreground"
                                          role="status"
                                          aria-label="Loading payment plans"
                                        >
                                          <CourseLitLoadingIcon size={12} />
                                        </p>
                                      ) : plans.length > 0 ? (
                                        <div className="space-y-1 rounded-lg border bg-card p-2">
                                          {plans.map((plan) => (
                                            <PlanOption
                                              key={plan.id}
                                              plan={plan}
                                              checked={selectedPlanIds.includes(
                                                plan.id,
                                              )}
                                              onCheckedChange={(checked) =>
                                                toggleProductPlan(
                                                  product.id,
                                                  plan.id,
                                                  checked,
                                                )
                                              }
                                            />
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                                          This product has no active payment plans. Add
                                          one under{" "}
                                          <Link
                                            href={`/products/${encodeURIComponent(product.id)}/manage`}
                                            className="font-medium text-foreground underline underline-offset-4"
                                          >
                                            product settings
                                          </Link>
                                          .
                                        </p>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </section>

                      <p className="border-t pt-3 text-xs text-muted-foreground">
                        A learner gets access when any selected community plan or
                        product rule matches an active membership.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeEditor}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !name.trim()}
                  aria-label={saving ? "Saving" : "Save"}
                >
                  {saving ? <CourseLitLoadingIcon size={16} /> : <Save className="size-4" />}
                  {saving ? null : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(deleting)}
          onOpenChange={(open) => {
            if (!open && !saving) closeDeleteDialog();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete “{deleting?.name}”?</DialogTitle>
              <DialogDescription>
                The space itself and its access settings will be permanently deleted.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="space-delete-destination">Move existing posts to</Label>
                <Select
                  value={deleteDestinationId}
                  onValueChange={setDeleteDestinationId}
                >
                  <SelectTrigger id="space-delete-destination">
                    <SelectValue placeholder="Select a destination space" />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces
                      .filter((space) => space.id !== deleting?.id)
                      .map((space) => (
                        <SelectItem key={space.id} value={space.id}>
                          {space.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Posts and their comments, reactions, reports, post subscriptions, and
                attached media will be preserved under the destination space. Followers
                and unlock rules for this space will be removed. Products using it for
                discussions will have discussions disabled.
              </p>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDeleteDialog}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void remove()}
                disabled={saving || !deleteDestinationId}
                aria-label={saving ? "Deleting space" : "Delete space"}
              >
                {saving ? <CourseLitLoadingIcon size={16} /> : <Trash2 className="size-4" />}
                {saving ? null : "Delete space"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AuthGate>
  );
}
