"use client";

import { Check, Clock, Lock, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CourseLitLoading, CourseLitLoadingIcon } from "@/components/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Input } from "@/components/ui/codelit/input";
import { Textarea } from "@/components/ui/codelit/textarea";
import {
  type Community,
  communityPagePath,
  type CommunityRequest,
  errorMessage,
  initials,
  type Membership,
  relativeDay,
  SegmentedFilter,
  StatusBadge,
  type StorefrontPlan,
} from "./community-shared";

type MemberFilter = "all" | "pending" | "active" | "rejected";

function MemberStatus({ status }: { status: Membership["status"] }) {
  switch (status) {
    case "active":
      return <StatusBadge tone="success">Active</StatusBadge>;
    case "pending":
      return <StatusBadge tone="warning">Waiting</StatusBadge>;
    case "rejected":
      return <StatusBadge tone="danger">Rejected</StatusBadge>;
    case "payment_failed":
      return <StatusBadge tone="danger">Payment failed</StatusBadge>;
    case "expired":
      return <StatusBadge tone="muted">Expired</StatusBadge>;
    default:
      return <StatusBadge tone="muted">Paused</StatusBadge>;
  }
}

export function CommunityMembers({
  community,
  plans,
  request,
  pendingCount,
  onPendingChanged,
  setNotice,
  setError,
}: {
  community: Community;
  plans: StorefrontPlan[];
  request: CommunityRequest;
  pendingCount: string | null;
  onPendingChanged: () => void;
  setNotice: (value: string | null) => void;
  setError: (value: string | null) => void;
}) {
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [members, setMembers] = useState<Membership[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toReject, setToReject] = useState<{
    member: Membership;
    removing: boolean;
  } | null>(null);
  const [reason, setReason] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePlanId, setInvitePlanId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const activePlans = plans
    .filter((plan) => plan.status === "active")
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  function openInvite() {
    setInviteEmail("");
    setInviteName("");
    setInvitePlanId(activePlans[0]?.id ?? "");
    setInviteError(null);
    setInviteOpen(true);
  }

  async function sendInvite() {
    if (inviting || !inviteEmail.trim() || !invitePlanId) return;
    setInviting(true);
    setInviteError(null);
    try {
      const invited = await request<Membership>(membersPath, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim(),
          planId: invitePlanId,
        }),
      });
      setInviteOpen(false);
      setNotice(`Invited ${invited.member?.email ?? inviteEmail.trim()}.`);
      onPendingChanged();
      await load();
    } catch (caught) {
      setInviteError(errorMessage(caught, "Unable to send the invite."));
    } finally {
      setInviting(false);
    }
  }

  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));
  const membersPath = `/api/v1/communities/${encodeURIComponent(community.id)}/members`;

  const load = useCallback(
    async (cursor?: string | null) => {
      const body = await request<{ items?: Membership[]; nextCursor?: string | null }>(
        communityPagePath(membersPath, cursor, {
          status: filter === "all" ? undefined : filter,
        }),
      );
      setMembers((items) =>
        cursor ? [...items, ...(body.items ?? [])] : (body.items ?? []),
      );
      setNextCursor(body.nextCursor ?? null);
    },
    [filter, membersPath, request],
  );

  useEffect(() => {
    setLoading(true);
    void load()
      .catch((caught) => setError(errorMessage(caught, "Unable to load members.")))
      .finally(() => setLoading(false));
  }, [load, setError]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await load(nextCursor);
    } catch (caught) {
      setError(errorMessage(caught, "Unable to load more members."));
    } finally {
      setLoadingMore(false);
    }
  }

  async function updateMember(
    member: Membership,
    update: Partial<Pick<Membership, "status" | "role" | "rejectionReason">>,
    notice: string,
  ) {
    setBusyId(member.id);
    try {
      const updated = await request<Membership>(
        `/api/v1/community-memberships/${member.id}`,
        { method: "PATCH", body: JSON.stringify(update) },
      );
      setMembers((items) =>
        items
          .map((item) => (item.id === updated.id ? updated : item))
          .filter((item) => filter === "all" || item.status === filter),
      );
      if (update.status) onPendingChanged();
      setNotice(notice);
      return true;
    } catch (caught) {
      setError(errorMessage(caught, "Unable to update the membership."));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!toReject || !reason.trim()) return;
    const done = await updateMember(
      toReject.member,
      { status: "rejected", rejectionReason: reason.trim() },
      toReject.removing ? "Member removed." : "Request rejected.",
    );
    if (done) {
      setToReject(null);
      setReason("");
    }
  }

  return (
    <section className="space-y-4">
      {pendingCount && filter !== "pending" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-[var(--primary-soft)] px-5 py-4 text-sm">
          <p className="flex items-center gap-3">
            <Clock className="size-5 shrink-0" />
            <span>
              <span className="font-medium">
                {pendingCount} {pendingCount === "1" ? "person is" : "people are"} waiting
                to join.
              </span>{" "}
              Read why they want to join, then approve or reject.
            </span>
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setFilter("pending")}>
            Show requests
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedFilter<MemberFilter>
          ariaLabel="Filter members"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: "All" },
            { value: "pending", label: "Waiting", count: pendingCount },
            { value: "active", label: "Active" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <Button
          type="button"
          onClick={openInvite}
          disabled={!community.enabled || activePlans.length === 0}
          title={
            community.enabled
              ? undefined
              : "Make the community live before inviting people."
          }
        >
          <UserPlus /> Invite
        </Button>
      </div>
      {loading ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <CourseLitLoading />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {filter === "pending"
            ? "Nobody is waiting to join."
            : filter === "rejected"
              ? "No rejected members."
              : "No members yet. Share your sales page to invite learners."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const name =
                  member.member?.name ?? member.learnerId ?? member.adminUserId ?? "Unknown";
                const busy = busyId === member.id;
                return (
                  <tr
                    key={member.id}
                    className={
                      member.status === "pending"
                        ? "border-b bg-muted/30 last:border-0"
                        : "border-b last:border-0"
                    }
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          {member.member?.imageUrl ? (
                            <AvatarImage src={member.member.imageUrl} alt={name} />
                          ) : null}
                          <AvatarFallback>{initials(name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{name}</p>
                          {member.member?.email ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {member.member.email}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {member.status === "pending" ? (
                        <div className="mt-2 max-w-sm rounded-md border bg-card px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            Why they want to join
                          </p>
                          <p className="text-sm">
                            {member.joiningReason
                              ? `“${member.joiningReason}”`
                              : "No reason given."}
                          </p>
                        </div>
                      ) : member.status === "rejected" && member.rejectionReason ? (
                        <p className="mt-2 max-w-sm text-xs text-muted-foreground">
                          Rejected: {member.rejectionReason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.paymentPlanId
                        ? (planNames.get(member.paymentPlanId) ?? "Archived plan")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <MemberStatus status={member.status} />
                    </td>
                    <td className="px-4 py-3">
                      {member.role === "owner" ? (
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Lock className="size-3.5" /> Owner
                        </span>
                      ) : member.status === "active" ? (
                        <Select
                          value={member.role}
                          disabled={busy}
                          onValueChange={(value) =>
                            void updateMember(
                              member,
                              { role: value as Membership["role"] },
                              "Role updated.",
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-32" aria-label={`Role for ${name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {relativeDay(member.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.role === "owner" ? null : member.status === "pending" ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => {
                              setReason("");
                              setToReject({ member, removing: false });
                            }}
                          >
                            Reject
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void updateMember(
                                member,
                                { status: "active", rejectionReason: null },
                                `${name} is in.`,
                              )
                            }
                          >
                            <Check /> Approve
                          </Button>
                        </div>
                      ) : member.status === "rejected" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            void updateMember(
                              member,
                              { status: "active", rejectionReason: null },
                              `${name} is back in.`,
                            )
                          }
                        >
                          Let back in
                        </Button>
                      ) : member.status === "active" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          onClick={() => {
                            setReason("");
                            setToReject({ member, removing: true });
                          }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {nextCursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? <CourseLitLoadingIcon size={14} /> : "Load more members"}
          </Button>
        </div>
      ) : null}
      <Dialog
        open={Boolean(toReject)}
        onOpenChange={(open) => {
          if (!open) setToReject(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toReject?.removing ? "Remove this member?" : "Reject this request?"}
            </DialogTitle>
            <DialogDescription>
              {toReject?.removing
                ? "They lose access to the community right away. Tell them why."
                : "Tell them why, so they know what to do next."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason"
            aria-label="Reason"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToReject(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!reason.trim() || busyId !== null}
              onClick={() => void confirmReject()}
            >
              {toReject?.removing ? "Remove member" : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to the community</DialogTitle>
            <DialogDescription>
              They join right away on the plan you pick, with its included products, and
              get an email to sign in. No payment is taken.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendInvite();
            }}
          >
            <div className="field">
              <label htmlFor="community-invite-email">Email</label>
              <Input
                id="community-invite-email"
                type="email"
                required
                autoFocus
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="community-invite-name">Name (optional)</label>
              <Input
                id="community-invite-name"
                maxLength={200}
                value={inviteName}
                onChange={(event) => setInviteName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="community-invite-plan">Plan</label>
              <Select value={invitePlanId} onValueChange={setInvitePlanId}>
                <SelectTrigger id="community-invite-plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteError ? (
              <p role="alert" className="text-sm text-destructive">
                {inviteError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviting || !inviteEmail.trim() || !invitePlanId}
              >
                {inviting ? "Inviting…" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
