"use client";

import { Badge } from "@codelitdev/design-system";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CourseLitLoading } from "@/components/loading";
import { RecentSignInDialog } from "@/components/settings/recent-sign-in-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/codelit/textarea";
import { schoolRequest, useSelectedSchool } from "@/lib/school-api";
import {
  type LoginMethod,
  RECENT_AUTHENTICATION_REASON,
  type SchoolLoginMethods,
  SSO_STATUS_LABELS,
  type SsoConnection,
  errorReason,
  methodsAfterToggle,
  primarySsoConnection,
  ssoErrorMessage,
  ssoStatusKind,
  wouldLeaveNoMethod,
} from "@/lib/sso";

const METHOD_LABELS: Record<LoginMethod, string> = { email: "Email codes", google: "Google" };

function MethodRow({
  icon,
  title,
  description,
  control,
}: {
  icon: ReactNode;
  title: string;
  description: ReactNode;
  control: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium leading-none">{title}</p>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">{control}</div>
    </div>
  );
}

function ssoBadge(connection: SsoConnection | null) {
  const kind = ssoStatusKind(connection);
  const variant =
    kind === "active" ? "success" : kind === "suspended" ? "warning" : kind === "draft" ? "neutral" : "outline";
  return <Badge variant={variant}>{SSO_STATUS_LABELS[kind]}</Badge>;
}

/** Settings → Login providers: how learners can sign in to this school's website. */
export function LoginProviderSettings() {
  const router = useRouter();
  const { loading: schoolLoading, schoolId, isOwner } = useSelectedSchool();
  const [methods, setMethods] = useState<SchoolLoginMethods | null>(null);
  const [connections, setConnections] = useState<SsoConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOff, setConfirmOff] = useState<LoginMethod | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [reauth, setReauth] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setError(null);
    try {
      const [loginMethods, sso] = await Promise.all([
        schoolRequest<SchoolLoginMethods>(schoolId, "/api/v1/school/login-methods"),
        schoolRequest<{ items: SsoConnection[] }>(schoolId, "/api/v1/sso/connections"),
      ]);
      if (!loginMethods.ok || !loginMethods.body) throw new Error("Unable to load sign-in methods.");
      setMethods(loginMethods.body);
      setConnections(sso.ok ? (sso.body?.items ?? []) : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load sign-in methods.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) void load();
    else if (!schoolLoading) setLoading(false);
  }, [schoolId, schoolLoading, load]);

  async function saveMethods(next: LoginMethod[]) {
    if (!schoolId || saving) return;
    setSaving(true);
    try {
      const result = await schoolRequest<SchoolLoginMethods>(schoolId, "/api/v1/school/login-methods", {
        method: "PATCH",
        body: { loginMethods: next },
      });
      if (!result.ok || !result.body) {
        if (result.status === 403) return;
        throw new Error(ssoErrorMessage(result.body, "We couldn't save that. Please try again."));
      }
      setMethods(result.body);
      toast.success("Sign-in methods saved.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setSaving(false);
      setConfirmOff(null);
    }
  }

  function toggle(method: LoginMethod, on: boolean) {
    if (!methods) return;
    if (on) {
      void saveMethods(methodsAfterToggle(methods, method, true));
      return;
    }
    if (wouldLeaveNoMethod(methods, method)) {
      toast.error("At least one sign-in method has to stay on.");
      return;
    }
    setConfirmOff(method);
  }

  if (loading || schoolLoading) {
    return <CourseLitLoading label="Loading sign-in methods…" className="justify-start" />;
  }
  if (error || !methods) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-6">
          <p className="text-sm text-destructive">{error ?? "Unable to load sign-in methods."}</p>
          <Button variant="outline" onClick={() => void load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sso = primarySsoConnection(connections);
  const emailOn = methods.loginMethods.includes("email");
  const googleOn = methods.loginMethods.includes("google");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Login providers</CardTitle>
          <CardDescription>
            Choose how learners sign in to your school&apos;s website. At least one has to stay on.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y p-0">
          <MethodRow
            icon={<Mail className="size-4" />}
            title={METHOD_LABELS.email}
            description="Learners get a one-time code by email."
            control={
              <Switch
                checked={emailOn}
                disabled={saving}
                aria-label="Email codes"
                onCheckedChange={(on) => toggle("email", on)}
              />
            }
          />
          <MethodRow
            icon={<KeyRound className="size-4" />}
            title={METHOD_LABELS.google}
            description={
              methods.googleAvailable
                ? "Learners sign in with their Google account."
                : "Google sign-in isn't set up on this platform."
            }
            control={
              <Switch
                checked={googleOn && methods.googleAvailable}
                disabled={saving || (!methods.googleAvailable && !googleOn)}
                aria-label="Google"
                onCheckedChange={(on) => toggle("google", on)}
              />
            }
          />
          <MethodRow
            icon={<ShieldCheck className="size-4" />}
            title="Single sign-on (SSO)"
            description={
              sso
                ? `${sso.displayName}. Learners sign in through your identity provider (Okta, Entra ID, Google Workspace and similar).`
                : "Let learners sign in through your own identity provider (Okta, Entra ID, Google Workspace and similar)."
            }
            control={
              <>
                {ssoBadge(sso)}
                {sso ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/settings/login-providers/sso/${encodeURIComponent(sso.id)}`}>
                      {isOwner ? "Manage" : "View"}
                    </Link>
                  </Button>
                ) : isOwner ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    Set up
                  </Button>
                ) : null}
              </>
            }
          />
        </CardContent>
      </Card>
      {!isOwner ? (
        <p className="text-sm text-muted-foreground">Only the school owner can set up or change SSO.</p>
      ) : null}

      <Dialog open={confirmOff !== null} onOpenChange={(open) => !open && setConfirmOff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn off {confirmOff ? METHOD_LABELS[confirmOff] : ""}?</DialogTitle>
            <DialogDescription>
              Learners who signed in this way will be signed out. They can sign in again with another method.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOff(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => confirmOff && void saveMethods(methodsAfterToggle(methods, confirmOff, false))}
            >
              Turn off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {schoolId ? (
        <CreateConnectionDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          schoolId={schoolId}
          onNeedsSignIn={() => setReauth(true)}
          onCreated={(connection) =>
            router.push(`/settings/login-providers/sso/${encodeURIComponent(connection.id)}`)
          }
        />
      ) : null}
      <RecentSignInDialog open={reauth} onOpenChange={setReauth} />
    </div>
  );
}

function CreateConnectionDialog({
  open,
  onOpenChange,
  schoolId,
  onCreated,
  onNeedsSignIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onCreated: (connection: SsoConnection) => void;
  onNeedsSignIn: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [metadataXml, setMetadataXml] = useState("");
  const [entityId, setEntityId] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (working) return;
    setWorking(true);
    setError(null);
    try {
      const result = await schoolRequest<SsoConnection>(schoolId, "/api/v1/sso/connections", {
        method: "POST",
        body: {
          displayName: displayName.trim(),
          ...(metadataXml.trim() ? { metadataXml: metadataXml.trim() } : { idpEntityId: entityId.trim() }),
        },
      });
      if (!result.ok || !result.body) {
        if (errorReason(result.body) === RECENT_AUTHENTICATION_REASON) {
          onOpenChange(false);
          onNeedsSignIn();
          return;
        }
        setError(ssoErrorMessage(result.body, "We couldn't create the connection."));
        return;
      }
      onOpenChange(false);
      onCreated(result.body);
    } finally {
      setWorking(false);
    }
  }

  const ready = displayName.trim().length > 0 && (metadataXml.trim().length > 0 || entityId.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set up SSO</DialogTitle>
          <DialogDescription>
            Start with your provider&apos;s metadata. You can finish the rest on the next page.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) void create();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="sso-create-name">Button label</Label>
            <Input
              id="sso-create-name"
              value={displayName}
              maxLength={100}
              placeholder="Acme employees"
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">Learners see this on the sign-in button.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sso-create-metadata">Provider metadata (XML)</Label>
            <Textarea
              id="sso-create-metadata"
              rows={6}
              value={metadataXml}
              onChange={(event) => setMetadataXml(event.target.value)}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sso-create-entity">Or the provider&apos;s entity ID</Label>
            <Input
              id="sso-create-entity"
              value={entityId}
              disabled={metadataXml.trim().length > 0}
              onChange={(event) => setEntityId(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The entity ID can&apos;t be changed later. To use a different provider, create a new connection.
            </p>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!ready || working}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
