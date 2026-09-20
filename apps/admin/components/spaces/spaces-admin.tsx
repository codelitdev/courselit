"use client";

import { Hash, Loader2, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
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

type CommunityPlan = {
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

function planSubtitle(plan: CommunityPlan): string {
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
    const installments =
      plan.emiTotalInstallments ?? plan.installmentCount ?? 0;
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

type AccessMode = "all_members" | "specific_members";

export function SpacesAdmin() {
  useSetBreadcrumb([{ label: "Spaces" }]);
  const [school, setSchool] = useState<School | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [communityPlans, setCommunityPlans] = useState<CommunityPlan[]>([]);
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

  const canWrite = hasSchoolPermission(school, "communities:write");
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
      items?: CommunityPlan[];
      message?: string;
    } | null;
    if (!plansResponse.ok) {
      throw new Error(plansBody?.message ?? "Unable to load community plans.");
    }
    setCommunityPlans(plansBody?.items ?? []);
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
        await Promise.all([reload(selected), reloadCommunityPlans(selected)]);
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
  }, [reload, reloadCommunityPlans]);

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
    setAccessMode(
      communityUnlock && communityUnlock.planIds.length === 0
        ? "all_members"
        : "specific_members",
    );
    setSelectedCommunityPlanIds(communityUnlock?.planIds ?? []);
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
    const existingOtherUnlocks =
      editing?.unlocks.filter((u) => u.entityType !== "community") ?? [];
    return [
      ...existingOtherUnlocks,
      {
        entityType: "community",
        planIds: accessMode === "all_members" ? [] : selectedCommunityPlanIds,
      },
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

  async function save() {
    if (!school) return;
    if (accessMode === "specific_members" && selectedCommunityPlanIds.length === 0) {
      setError("Select at least one payment plan for specific-member access.");
      return;
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
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
            Loading…
          </div>
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
                    {(() => {
                      const communityUnlock = space.unlocks.find(
                        (unlock) => unlock.entityType === "community",
                      );
                      if (!communityUnlock) {
                        return " · Staff-only unless products are attached";
                      }
                      if (communityUnlock.planIds.length === 0) {
                        return " · Community";
                      }
                      return ` · ${communityUnlock.planIds.length} community plan${communityUnlock.planIds.length === 1 ? "" : "s"}`;
                    })()}
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                        <SelectItem value="all_members">All members</SelectItem>
                        <SelectItem value="specific_members">
                          Only specific members
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {accessMode === "specific_members" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Payment plans</Label>
                        {selectableCommunityPlans.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => {
                              const allIds = selectableCommunityPlans.map((p) => p.id);
                              const areAllSelected = allIds.every((id) =>
                                selectedCommunityPlanIds.includes(id),
                              );
                              setSelectedCommunityPlanIds(areAllSelected ? [] : allIds);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                          >
                            {selectableCommunityPlans.every((p) =>
                              selectedCommunityPlanIds.includes(p.id),
                            )
                              ? "Deselect all"
                              : "Select all"}
                          </button>
                        ) : null}
                      </div>

                      {selectableCommunityPlans.length > 0 ? (
                        <div className="max-h-52 overflow-y-auto rounded-lg border bg-muted/20 p-2 space-y-1">
                          {selectableCommunityPlans.map((plan) => {
                            const isChecked = selectedCommunityPlanIds.includes(plan.id);
                            const subtitle = planSubtitle(plan);
                            return (
                              <label
                                key={plan.id}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-pointer transition-colors select-none",
                                  isChecked
                                    ? "bg-primary/10 text-foreground font-medium"
                                    : "hover:bg-muted/50 text-foreground",
                                )}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    toggleCommunityPlan(plan.id, checked === true)
                                  }
                                />
                                <div className="flex flex-1 items-center justify-between min-w-0 gap-2">
                                  <span className="truncate">{plan.name}</span>
                                  <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
                                    {subtitle ? <span>{subtitle}</span> : null}
                                    {plan.status === "archived" ? (
                                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                        Archived
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                          No active payment plans are available. Create one under{" "}
                          <Link
                            href="/community/plans"
                            className="font-medium text-foreground underline underline-offset-4"
                          >
                            Community payment plans
                          </Link>
                          .
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Members with any selected payment plan can access this space.</span>
                        {selectedCommunityPlanIds.length > 0 ? (
                          <span className="font-medium text-foreground">
                            {selectedCommunityPlanIds.length} selected
                          </span>
                        ) : null}
                      </div>
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
                <Button type="submit" disabled={saving || !name.trim()}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {saving ? "Saving…" : "Save"}
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
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                {saving ? "Deleting…" : "Delete space"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AuthGate>
  );
}
