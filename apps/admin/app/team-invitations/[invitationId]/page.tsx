"use client";

import { Check, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CourseLitPermission } from "@courselit/api-contract/team-permissions";
import { Button } from "@/components/ui/codelit/button";
import { summarizeCourseLitPermissions } from "@/components/settings/permission-picker";
import {
  clearInvitationHash,
  clearInvitationToken,
  peekInvitationToken,
  persistInvitationToken,
  readInvitationTokenFromHash,
} from "@/lib/invitation-token";

type InvitationPreview = {
  invitationId: string;
  schoolName: string;
  inviterName: string | null;
  expiresAt: string;
  permissions: CourseLitPermission[];
  email: string;
};

type ApiError = { message?: string };

function invitationIdFromParams(value: string | string[] | undefined): string | null {
  const id = Array.isArray(value) ? value[0] : value;
  return id ? decodeURIComponent(id) : null;
}

function formatExpiry(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => null)) as ApiError | null;
  return new Error(body?.message || fallback);
}

export default function TeamInvitationPage() {
  const params = useParams<{ invitationId: string | string[] }>();
  const router = useRouter();
  const invitationId = useMemo(
    () => invitationIdFromParams(params?.invitationId),
    [params?.invitationId],
  );
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invitationId) {
      setError("This invitation link is invalid.");
      setLoading(false);
      return;
    }

    let active = true;
    const hashToken = readInvitationTokenFromHash(window.location.hash);
    if (hashToken) {
      persistInvitationToken(invitationId, hashToken);
      window.history.replaceState(null, "", clearInvitationHash(window.location.href));
    }
    const invitationToken = hashToken ?? peekInvitationToken(invitationId);
    if (!invitationToken) {
      setError("This invitation link is missing its secret.");
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setToken(invitationToken);

    void fetch("/api/v1/team-invitations/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ invitationId, token: invitationToken }),
    })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) {
          persistInvitationToken(invitationId, invitationToken);
          const loginUrl = new URL("/login", window.location.origin);
          loginUrl.searchParams.set(
            "next",
            `/team-invitations/${encodeURIComponent(invitationId)}`,
          );
          window.location.replace(loginUrl.toString());
          return;
        }
        if (!response.ok) {
          setError(
            (await readError(response, "Unable to load this invitation.")).message,
          );
          setLoading(false);
          return;
        }
        setPreview((await response.json()) as InvitationPreview);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load this invitation.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [invitationId]);

  async function respond(action: "accept" | "reject") {
    if (!invitationId || !token || busy) return;
    setBusy(action);
    setError(null);
    try {
      const response = await fetch(`/api/v1/team-invitations/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ invitationId, token }),
      });
      if (!response.ok) {
        throw await readError(
          response,
          action === "accept"
            ? "Unable to accept this invitation."
            : "Unable to reject this invitation.",
        );
      }
      clearInvitationToken(invitationId);
      if (action === "reject") {
        router.replace("/schools");
        return;
      }
      const body = (await response.json()) as { schoolId?: string };
      if (body.schoolId) {
        const selectResponse = await fetch("/api/school/select", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ schoolId: body.schoolId }),
        });
        if (!selectResponse.ok) {
          throw await readError(selectResponse, "Unable to select the joined school.");
        }
      }
      window.location.assign("/");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to process the invitation.",
      );
      setBusy(null);
    }
  }

  return (
    <main className="flex min-h-dvh w-full items-start justify-center bg-background px-6 py-16">
      <section className="w-full max-w-xl space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">CourseLit</p>
          <h1 className="text-2xl font-semibold tracking-tight">Team invitation</h1>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading invitation…</p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        {preview ? (
          <div className="space-y-5">
            <div className="space-y-2 text-sm">
              <p>
                Join <strong>{preview.schoolName}</strong>
                {preview.inviterName ? `, invited by ${preview.inviterName}` : ""}.
              </p>
              <p className="text-muted-foreground">
                Sign in as {preview.email}. Expires {formatExpiry(preview.expiresAt)}.
              </p>
              <p>
                Access:{" "}
                <strong>{summarizeCourseLitPermissions(preview.permissions)}</strong>
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => void respond("accept")}
                disabled={Boolean(busy)}
              >
                <Check className="size-4" />
                {busy === "accept" ? "Accepting…" : "Accept"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void respond("reject")}
                disabled={Boolean(busy)}
              >
                <X className="size-4" />
                {busy === "reject" ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
