"use client";

import { toast } from "sonner";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Copy, Mail, Pencil, Shield, Trash2, UserPlus, Users } from "lucide-react";
import {
  COURSELIT_PERMISSIONS,
  computeEffectiveCourseLitPermissions,
  expandCourseLitPermissionPreset,
  filterDelegableCourseLitPermissions,
  type CourseLitPermission,
  type CourseLitPermissionPresetId,
} from "@courselit/api-contract/team-permissions";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/codelit/dialog";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PermissionPicker,
  summarizeCourseLitPermissions,
} from "@/components/settings/permission-picker";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isOwner: boolean;
  permissions: CourseLitPermission[];
  createdAt: string;
};

type TeamInvitation = {
  invitationId: string;
  email: string;
  permissions: CourseLitPermission[];
  expiresAt: string;
  createdAt: string;
};

type TeamResponse = {
  members?: TeamMember[];
  invitations?: TeamInvitation[];
  viewer?: TeamMember;
};

type InviteResult = {
  email: string;
  link: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function TeamSettings() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [viewer, setViewer] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePreset, setInvitePreset] = useState<CourseLitPermissionPresetId | "">(
    "",
  );
  const [invitePermissions, setInvitePermissions] = useState<CourseLitPermission[]>([]);
  const [inviting, setInviting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [editPreset, setEditPreset] = useState<CourseLitPermissionPresetId | "">(
    "custom",
  );
  const [editPermissions, setEditPermissions] = useState<CourseLitPermission[]>([]);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/school/team", {
        credentials: "include",
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | (TeamResponse & { message?: string })
        | null;
      if (!response.ok) {
        throw new Error(
          body && "message" in body && body.message
            ? body.message
            : "Unable to load the team.",
        );
      }
      setMembers(body?.members ?? []);
      setInvitations(body?.invitations ?? []);
      setViewer(body?.viewer ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const canInvite = Boolean(
    viewer &&
      (viewer.isOwner ||
        viewer.permissions.includes("school:admin") ||
        viewer.permissions.includes("members:invite") ||
        viewer.permissions.includes("members:manage")),
  );
  const canManage = Boolean(
    viewer &&
      (viewer.isOwner ||
        viewer.permissions.includes("school:admin") ||
        viewer.permissions.includes("members:manage")),
  );
  const selectablePermissions = viewer
    ? viewer.isOwner || viewer.permissions.includes("school:admin")
      ? COURSELIT_PERMISSIONS
      : filterDelegableCourseLitPermissions(viewer.permissions)
    : [];

  function canEditMember(member: TeamMember): boolean {
    if (!canManage || member.isOwner || member.id === viewer?.id) return false;
    if (viewer?.isOwner || viewer?.permissions.includes("school:admin")) return true;
    const actorPermissions = new Set(viewer?.permissions ?? []);
    return computeEffectiveCourseLitPermissions(member.permissions).every(
      (permission) => actorPermissions.has(permission),
    );
  }

  function openInvite() {
    setInviteEmail("");
    setInvitePreset("");
    setInvitePermissions([]);
    setInviteOpen(true);
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !invitePreset || inviting) return;
    setInviting(true);
    try {
      const response = await fetch("/api/v1/invitations", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          permissions: invitePermissions,
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        id?: string;
        token?: string;
        message?: string;
      } | null;
      if (!response.ok || !body?.token) {
        throw new Error(body?.message ?? "Unable to create the invitation.");
      }
      const invitationUrl = new URL(
        `/team-invitations/${encodeURIComponent(body.id ?? "")}`,
        window.location.origin,
      );
      invitationUrl.hash = `token=${encodeURIComponent(body.token)}`;
      setLastInvite({
        email,
        link: invitationUrl.toString(),
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePreset("");
      setInvitePermissions([]);
      await loadTeam();
      toast.success(`Invitation created for ${email}.`);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to create the invitation.",
      );
    } finally {
      setInviting(false);
    }
  }

  async function revokeInvitation(invitation: TeamInvitation) {
    if (revokingInvitationId) return;
    setRevokingInvitationId(invitation.invitationId);
    try {
      const response = await fetch(
        `/api/v1/invitations/${encodeURIComponent(invitation.invitationId)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Unable to revoke the invitation.");
      }
      setInvitations((current) =>
        current.filter((item) => item.invitationId !== invitation.invitationId),
      );
      toast.success("Invitation revoked.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to revoke the invitation.",
      );
    } finally {
      setRevokingInvitationId(null);
    }
  }

  function resendInvitation(invitation: TeamInvitation) {
    setInviteEmail(invitation.email);
    setInvitePreset("custom");
    setInvitePermissions(invitation.permissions);
    setInviteOpen(true);
  }

  function openEditMember(member: TeamMember) {
    if (!canEditMember(member)) return;
    setMemberToEdit(member);
    setEditPreset("custom");
    setEditPermissions(member.permissions);
  }

  async function saveMemberPermissions() {
    if (!memberToEdit || savingMemberId) return;
    setSavingMemberId(memberToEdit.id);
    try {
      const response = await fetch(
        `/api/v1/school/team/members/${encodeURIComponent(memberToEdit.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ permissions: editPermissions }),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | (TeamMember & { message?: string })
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          body && "message" in body
            ? body.message
            : "Unable to update member permissions.",
        );
      }
      if (body && "id" in body && body.id) {
        setMembers((current) =>
          current.map((member) =>
            member.id === body.id ? (body as TeamMember) : member,
          ),
        );
      }
      setMemberToEdit(null);
      toast.success("Member permissions updated.");
    } catch (caught) {
      toast.error(
        caught instanceof Error
          ? caught.message || "Unable to update member permissions."
          : "Unable to update member permissions.",
      );
    } finally {
      setSavingMemberId(null);
    }
  }

  async function removeMember(member: TeamMember) {
    if (removingMemberId) return;
    setRemovingMemberId(member.id);
    try {
      const response = await fetch(
        `/api/v1/school/team/members/${encodeURIComponent(member.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Unable to remove the team member.");
      }
      setMembers((current) => current.filter((item) => item.id !== member.id));
      setMemberToRemove(null);
      toast.success(`${member.name} was removed from the team.`);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to remove the team member.",
      );
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function copyInviteLink() {
    if (!lastInvite) return;
    try {
      await navigator.clipboard.writeText(lastInvite.link);
      toast.success("Invitation link copied.");
    } catch {
      toast.error("Unable to copy the invitation link.");
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            <Button type="button" variant="outline" onClick={() => void loadTeam()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {lastInvite ? (
        <Card>
          <CardHeader>
            <CardTitle>Invitation ready</CardTitle>
            <CardDescription>
              Share this link with {lastInvite.email}. It expires in 7 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input readOnly value={lastInvite.link} aria-label="Invitation link" />
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyInviteLink()}
            >
              <Copy className="size-4" />
              <span className="sr-only">Copy invitation link</span>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              Team members
            </CardTitle>
            <CardDescription>
              People who can access this school and pending invitations.
            </CardDescription>
          </div>
          <Button type="button" onClick={openInvite} disabled={!canInvite}>
            <UserPlus className="size-4" />
            Invite member
          </Button>
        </CardHeader>
        {!loading && viewer && !canInvite ? (
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              You can view the team, but you do not have permission to invite members.
            </p>
          </CardContent>
        ) : null}
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading team…</p>
          ) : null}
          {!loading && members.length === 0 && invitations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No team members or pending invitations.
            </div>
          ) : null}
          {!loading && (members.length > 0 || invitations.length > 0) ? (
            <div className="divide-y">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                      {(member.name || member.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {member.name || "Unnamed member"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium">
                      {member.isOwner ? <Shield className="size-3.5" /> : null}
                      {member.isOwner
                        ? "Owner"
                        : summarizeCourseLitPermissions(member.permissions)}
                    </span>
                    {!member.isOwner ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => openEditMember(member)}
                          disabled={!canEditMember(member)}
                          title={`Edit permissions for ${member.name || member.email}`}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit permissions</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setMemberToRemove(member)}
                          disabled={!canManage}
                          title={`Remove ${member.name || member.email}`}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remove member</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {invitations.map((invitation) => (
                <div
                  key={invitation.invitationId}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Mail className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {summarizeCourseLitPermissions(invitation.permissions)} ·
                        Expires {formatDate(invitation.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
                      Pending
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => resendInvitation(invitation)}
                      disabled={!canInvite}
                    >
                      Resend
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void revokeInvitation(invitation)}
                      disabled={
                        !canManage || revokingInvitationId === invitation.invitationId
                      }
                    >
                      {revokingInvitationId === invitation.invitationId
                        ? "Revoking…"
                        : "Revoke"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="flex max-h-[min(90vh,50rem)] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              Choose exactly what the person joining this school can do.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => void inviteMember(event)}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
              <div className="space-y-1.5">
                <Label htmlFor="team-invite-email">Email</Label>
                <Input
                  id="team-invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="Email"
                />
              </div>
              <PermissionPicker
                preset={invitePreset}
                permissions={invitePermissions}
                selectable={selectablePermissions}
                onPresetChange={(next) => {
                  setInvitePreset(next);
                  if (next !== "custom") {
                    const nextPermissions = expandCourseLitPermissionPreset(next);
                    setInvitePermissions(
                      nextPermissions.filter((permission) =>
                        selectablePermissions.includes(permission),
                      ),
                    );
                  }
                }}
                onPermissionsChange={setInvitePermissions}
              />
            </div>
            <DialogFooter className="mt-0 shrink-0 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviting || !inviteEmail.trim() || !invitePreset}
              >
                {inviting ? "Inviting…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(memberToEdit)}
        onOpenChange={(open) => {
          if (!open && !savingMemberId) setMemberToEdit(null);
        }}
      >
        <DialogContent className="flex max-h-[min(90vh,50rem)] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>
              Edit {memberToEdit?.name || memberToEdit?.email || "member"}
            </DialogTitle>
            <DialogDescription>
              Choose exactly what this team member can do in the school.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
            <PermissionPicker
              preset={editPreset}
              permissions={editPermissions}
              selectable={selectablePermissions}
              onPresetChange={(next) => {
                setEditPreset(next);
                if (next !== "custom") {
                  setEditPermissions(
                    expandCourseLitPermissionPreset(next).filter((permission) =>
                      selectablePermissions.includes(permission),
                    ),
                  );
                }
              }}
              onPermissionsChange={setEditPermissions}
            />
          </div>
          <DialogFooter className="mt-0 shrink-0 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMemberToEdit(null)}
              disabled={Boolean(savingMemberId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveMemberPermissions()}
              disabled={!memberToEdit || Boolean(savingMemberId)}
            >
              {savingMemberId ? "Saving…" : "Save permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => {
          if (!open && !removingMemberId) setMemberToRemove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove team member?</DialogTitle>
            <DialogDescription>
              {memberToRemove
                ? `${memberToRemove.name || memberToRemove.email} will lose access to this school.`
                : "This team member will lose access to this school."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMemberToRemove(null)}
              disabled={Boolean(removingMemberId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => memberToRemove && void removeMember(memberToRemove)}
              disabled={!memberToRemove || Boolean(removingMemberId)}
            >
              {removingMemberId ? "Removing…" : "Remove member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
