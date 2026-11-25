"use client";

import { Badge } from "@codelitdev/design-system";
import { AlertTriangle, Check, Copy, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
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
  RECENT_AUTHENTICATION_REASON,
  SSO_STATUS_LABELS,
  SSO_TEST_QUERY_PARAM,
  type SsoConnection,
  type SsoDomain,
  type SsoFormValues,
  type SsoTestResult,
  activationBlockers,
  testAvailability,
  testFailureHint,
  buildUpdateBody,
  changesTrust,
  domainStatus,
  errorReason,
  formFromConnection,
  parseSsoTestReturn,
  sessionMinutesError,
  showUpgradePrompt,
  sortedAttributes,
  ssoErrorMessage,
  ssoStatusKind,
  txtRecordDisplay,
} from "@/lib/sso";

const BASE = "/api/v1/sso/connections";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Select the value and copy it by hand.");
    }
  }
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button type="button" variant="outline" className="shrink-0 px-3" aria-label={`Copy ${label}`} onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function Notice({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "info" }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
        tone === "warning" ? "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100" : "bg-muted"
      }`}
      role={tone === "warning" ? "alert" : undefined}
    >
      {tone === "warning" ? <AlertTriangle className="mt-0.5 size-4 shrink-0" /> : null}
      <div>{children}</div>
    </div>
  );
}

function statusBadge(connection: SsoConnection) {
  const kind = ssoStatusKind(connection);
  const variant =
    kind === "active" ? "success" : kind === "suspended" ? "warning" : kind === "draft" ? "neutral" : "outline";
  return <Badge variant={variant}>{SSO_STATUS_LABELS[kind]}</Badge>;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? null
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** One SSO connection: what to give the provider, its settings, domains, a test, and turning it on. */
export function SsoConnectionSettings({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { loading: schoolLoading, schoolId, isOwner, billingAvailable } = useSelectedSchool();
  const [connection, setConnection] = useState<SsoConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<SsoFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reauth, setReauth] = useState(false);
  const [confirm, setConfirm] = useState<"activate" | "disable" | "delete" | null>(null);
  const [testResult, setTestResult] = useState<SsoTestResult | null>(null);
  const [testMissing, setTestMissing] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const handledTest = useRef<string | null>(null);

  const base = `${BASE}/${encodeURIComponent(connectionId)}`;

  const apply = useCallback((next: SsoConnection, resetForm = true) => {
    setConnection(next);
    if (resetForm) setForm(formFromConnection(next));
  }, []);

  const load = useCallback(async () => {
    if (!schoolId) return;
    const result = await schoolRequest<SsoConnection>(schoolId, base);
    if (result.status === 404) setNotFound(true);
    else if (result.ok && result.body) apply(result.body);
    else toast.error("Unable to load this connection.");
    setLoading(false);
  }, [schoolId, base, apply]);

  useEffect(() => {
    if (schoolId) void load();
    else if (!schoolLoading) setLoading(false);
  }, [schoolId, schoolLoading, load]);

  // The API sends the admin back here with the test's request id.
  const testId = parseSsoTestReturn(searchParams.toString());
  useEffect(() => {
    if (!schoolId || !isOwner || !testId || handledTest.current === testId) return;
    handledTest.current = testId;
    void (async () => {
      const result = await schoolRequest<SsoTestResult>(
        schoolId,
        `${base}/test-results/${encodeURIComponent(testId)}`,
      );
      if (result.ok && result.body) setTestResult(result.body);
      else setTestMissing(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete(SSO_TEST_QUERY_PARAM);
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
      await load();
    })();
  }, [schoolId, isOwner, testId, base, searchParams, pathname, router, load]);

  /** Runs a write; asks for a fresh sign-in when the API wants one. */
  async function write<T>(
    key: string,
    path: string,
    init: { method: string; body?: unknown },
    failure: string,
  ): Promise<{ ok: boolean; body: T | null }> {
    if (!schoolId) return { ok: false, body: null };
    setBusy(key);
    try {
      const result = await schoolRequest<T>(schoolId, path, init);
      if (!result.ok) {
        const reason = errorReason(result.body);
        if (reason === RECENT_AUTHENTICATION_REASON) setReauth(true);
        else if (result.status !== 403 || reason) toast.error(ssoErrorMessage(result.body, failure));
        else toast.error("Only the school owner can change SSO.");
      }
      return { ok: result.ok, body: result.body };
    } catch {
      toast.error(failure);
      return { ok: false, body: null };
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!connection || !form || saving) return;
    const body = buildUpdateBody(connection, form);
    if (Object.keys(body).length === 0) return;
    setSaving(true);
    const result = await write<SsoConnection>("save", base, { method: "PATCH", body }, "We couldn't save the changes.");
    setSaving(false);
    setConfirmSave(false);
    if (result.ok && result.body) {
      apply(result.body);
      toast.success(
        connection.status !== "draft" && result.body.status === "draft"
          ? "Saved. The connection is back to draft. Test it again before turning it on."
          : "Saved.",
      );
    }
  }

  async function addDomain() {
    const domain = newDomain.trim();
    if (!domain) return;
    const result = await write<SsoDomain>("add-domain", `${base}/domains`, { method: "POST", body: { domain } }, "We couldn't add that domain.");
    if (result.ok) {
      setNewDomain("");
      await load();
    }
  }

  async function verifyDomain(domain: SsoDomain) {
    const result = await write<SsoDomain>(
      `verify:${domain.domain}`,
      `${base}/domains/${encodeURIComponent(domain.domain)}/verify`,
      { method: "POST", body: {} },
      "We couldn't check the record. Please try again.",
    );
    if (result.ok && result.body) {
      if (result.body.verified) toast.success(`${domain.domain} is verified.`);
      else toast.error("We couldn't find the record yet. DNS changes can take a while to show up.");
      await load();
    }
  }

  async function removeDomain(domain: SsoDomain) {
    const result = await write(
      `remove:${domain.domain}`,
      `${base}/domains/${encodeURIComponent(domain.domain)}`,
      { method: "DELETE" },
      "We couldn't remove that domain.",
    );
    if (result.ok) await load();
  }

  async function startTest() {
    const url = new URL(window.location.href);
    url.searchParams.delete(SSO_TEST_QUERY_PARAM);
    const result = await write<{ url: string }>(
      "test",
      `${base}/test`,
      { method: "POST", body: { returnUrl: url.toString() } },
      "We couldn't start the test.",
    );
    if (result.ok && result.body?.url) window.location.assign(result.body.url);
  }

  async function saveEnforcement(required: boolean) {
    const result = await write<SsoConnection>(
      "enforcement",
      base,
      { method: "PATCH", body: { enforcement: required ? "required_for_domains" : "optional" } },
      "We couldn't save that.",
    );
    if (result.ok && result.body) apply(result.body, false);
  }

  async function changeState(action: "activate" | "disable") {
    const result = await write<SsoConnection>(action, `${base}/${action}`, { method: "POST", body: {} }, `We couldn't ${action} the connection.`);
    setConfirm(null);
    if (result.ok && result.body) {
      apply(result.body, false);
      toast.success(action === "activate" ? "SSO is on." : "SSO is off. Its learners were signed out.");
    }
  }

  async function remove() {
    const result = await write("delete", base, { method: "DELETE" }, "We couldn't delete the connection.");
    setConfirm(null);
    if (result.ok) {
      toast.success("Connection deleted.");
      router.replace("/settings/login-providers");
    }
  }

  if (loading || schoolLoading) return <CourseLitLoading label="Loading SSO…" className="justify-start" />;
  if (notFound || !connection || !form) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connection not found</CardTitle>
          <CardDescription>
            <Link href="/settings/login-providers" className="underline">
              Back to login providers
            </Link>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const readOnly = !isOwner;
  const trustChange = changesTrust(connection, form);
  const body = buildUpdateBody(connection, form);
  const dirty = Object.keys(body).length > 0;
  const minutesError = sessionMinutesError(form.maxSessionMinutes);
  const warnsSignOut = connection.status !== "draft" && trustChange;
  const blockers = activationBlockers(connection, { billingAvailable });
  const upgrade = showUpgradePrompt(connection, billingAvailable);
  const isActive = connection.status === "active";
  const { canTest, note: testNote } = testAvailability(connection, { readOnly, dirty });
  const hasVerifiedDomain = connection.domains.some((d) => d.verified);
  const set = (patch: Partial<SsoFormValues>) => setForm({ ...form, ...patch });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/settings/login-providers" className="text-sm text-muted-foreground hover:underline">
          Login providers
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">{connection.displayName}</h2>
          {statusBadge(connection)}
        </div>
      </div>

      {readOnly ? (
        <Notice tone="info">Only the school owner can change SSO. You can see its settings here.</Notice>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>1. Give these to your identity provider</CardTitle>
          <CardDescription>Enter them where you set up the app (SAML) in Okta, Entra ID, Google Workspace or similar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="ACS URL" value={connection.serviceProvider.acsUrl} />
          <CopyField label="Entity ID" value={connection.serviceProvider.entityId} />
          <CopyField label="Metadata URL" value={connection.serviceProvider.metadataUrl} />
          <p className="text-sm text-muted-foreground">
            If your provider asks for a file, open the metadata URL and save it.{" "}
            <a href={connection.serviceProvider.metadataUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
              Open <ExternalLink className="size-3" />
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Your identity provider&apos;s settings</CardTitle>
          <CardDescription>Paste its metadata, or fill in the fields below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {warnsSignOut ? (
            <Notice>
              {isActive ? "This connection is on. " : ""}
              Changing the certificates, sign-in URL or subject attribute puts the connection back to draft and signs out
              learners who used SSO. You will need to test it again before turning it on.
            </Notice>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="sso-name">Button label</Label>
            <Input id="sso-name" value={form.displayName} maxLength={100} disabled={readOnly} onChange={(e) => set({ displayName: e.target.value })} />
            <p className="text-xs text-muted-foreground">Learners see this on the sign-in button.</p>
          </div>
          {!readOnly ? (
            <div className="space-y-1.5">
              <Label htmlFor="sso-metadata">Metadata XML</Label>
              <Textarea
                id="sso-metadata"
                rows={5}
                value={form.metadataXml}
                className="font-mono text-xs"
                placeholder="Paste to replace the sign-in URL and certificates below"
                onChange={(e) => set({ metadataXml: e.target.value })}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="sso-entity">Provider entity ID</Label>
            <Input id="sso-entity" readOnly disabled value={connection.idpEntityId ?? ""} />
            <p className="text-xs text-muted-foreground">
              This can&apos;t be changed. To use a different provider, delete this connection and create a new one.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sso-url">Sign-in URL</Label>
            <Input
              id="sso-url"
              value={form.idpSsoUrl}
              disabled={readOnly || form.metadataXml.trim().length > 0}
              placeholder="https://"
              onChange={(e) => set({ idpSsoUrl: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sso-certs">Certificates</Label>
            <Textarea
              id="sso-certs"
              rows={6}
              value={form.certificates}
              disabled={readOnly || form.metadataXml.trim().length > 0}
              className="font-mono text-xs"
              placeholder="-----BEGIN CERTIFICATE-----"
              onChange={(e) => set({ certificates: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              PEM format. To rotate a certificate, add the new one next to the old one.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sso-subject">Subject attribute (optional)</Label>
            <Input
              id="sso-subject"
              value={form.subjectAttribute}
              disabled={readOnly}
              placeholder="e.g. objectidentifier"
              onChange={(e) => set({ subjectAttribute: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Needed only if your provider can&apos;t send a persistent NameID. Use an attribute that never changes for a
              person and is never reused. Don&apos;t use their email address.
            </p>
          </div>
          {!readOnly ? (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                disabled={!dirty || saving || form.displayName.trim().length === 0}
                onClick={() => (warnsSignOut ? setConfirmSave(true) : void save())}
              >
                Save
              </Button>
              {dirty ? (
                <Button type="button" variant="ghost" onClick={() => setForm(formFromConnection(connection))}>
                  Discard changes
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Domains</CardTitle>
          <CardDescription>
            Only learners whose email is on a verified domain can sign in with SSO. Prove you own each domain with a DNS
            record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection.domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">No domains yet.</p>
          ) : null}
          {connection.domains.map((domain) => {
            const status = domainStatus(domain);
            const record = txtRecordDisplay(domain);
            return (
              <div key={domain.domain} className="space-y-3 rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{domain.domain}</span>
                    <Badge variant={status.tone === "success" ? "success" : status.tone === "warning" ? "warning" : "outline"}>
                      {status.label}
                    </Badge>
                  </div>
                  {!readOnly ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy === `verify:${domain.domain}`}
                        onClick={() => void verifyDomain(domain)}
                      >
                        {domain.verified ? "Check again" : "Verify"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Remove ${domain.domain}`}
                        disabled={busy === `remove:${domain.domain}`}
                        onClick={() => void removeDomain(domain)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
                {domain.verified && domain.consecutiveCheckFailures > 0 ? (
                  <Notice>
                    We couldn&apos;t find the DNS record on the last check. If it stays missing, the domain stops working
                    for SSO.
                  </Notice>
                ) : null}
                {!domain.verified || domain.consecutiveCheckFailures > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Add this record at your DNS provider, then select Verify.</p>
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                      <div className="space-y-1.5">
                        <Label>Type</Label>
                        <p className="flex h-9 items-center font-mono text-xs">{record.type}</p>
                      </div>
                      <CopyField label="Name" value={record.name} />
                    </div>
                    <CopyField label="Value" value={record.value} />
                  </div>
                ) : null}
                {formatDate(domain.verifiedAt) && domain.verified ? (
                  <p className="text-xs text-muted-foreground">Verified {formatDate(domain.verifiedAt)}</p>
                ) : null}
              </div>
            );
          })}
          {!readOnly ? (
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void addDomain();
              }}
            >
              <Input
                aria-label="Domain"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <Button type="submit" variant="outline" disabled={!newDomain.trim() || busy === "add-domain"}>
                Add domain
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Test the connection</CardTitle>
          <CardDescription>
            Sign in once through your provider to check the settings. Nobody is signed in to your school by a test.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection.testedAt ? (
            <p className="text-sm text-muted-foreground">
              Last successful test: {formatDate(connection.testedAt)}.{" "}
              {connection.testedCurrentConfiguration ? "" : "The settings changed since, so test again."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Not tested yet.</p>
          )}
          {dirty && !readOnly ? <p className="text-sm text-muted-foreground">Save your changes before testing.</p> : null}
          {testNote && !readOnly ? <p className="text-sm text-muted-foreground">{testNote}</p> : null}
          {!readOnly ? (
            <div>
              <Button type="button" variant="outline" disabled={!canTest || busy === "test"} onClick={() => void startTest()}>
                Test connection
              </Button>
            </div>
          ) : null}
          {testMissing ? (
            <Notice>The test result is no longer available. Run the test again.</Notice>
          ) : null}
          {testResult ? <TestResult result={testResult} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Who has to use SSO</CardTitle>
          <CardDescription>These apply once the connection is on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="sso-enforce">Require SSO for these domains</Label>
              <p className="text-sm text-muted-foreground">
                Learners with an email on a verified domain can only sign in with SSO. Anyone in those domains who is
                signed in another way is signed out.
              </p>
            </div>
            <Switch
              id="sso-enforce"
              checked={connection.enforcement === "required_for_domains"}
              disabled={readOnly || busy === "enforcement" || (!hasVerifiedDomain && connection.enforcement === "optional")}
              onCheckedChange={(on) => void saveEnforcement(on)}
            />
          </div>
          {!hasVerifiedDomain && connection.enforcement === "optional" ? (
            <p className="text-xs text-muted-foreground">Verify a domain to turn this on.</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="sso-minutes">Longest session (minutes)</Label>
            <Input
              id="sso-minutes"
              inputMode="numeric"
              value={form.maxSessionMinutes}
              disabled={readOnly}
              placeholder="School default"
              className="max-w-48"
              onChange={(e) => set({ maxSessionMinutes: e.target.value })}
            />
            {minutesError ? <p className="text-xs text-destructive">{minutesError}</p> : null}
            <p className="text-xs text-muted-foreground">
              Learners sign in again after this long. Leave empty to use the school default. Saved with the button in
              section 2.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Turn it on</CardTitle>
          <CardDescription>
            {isActive ? "SSO is on. Learners see the sign-in button." : "Learners can use SSO once the connection is on."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {blockers.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {blockers.map((blocker) => (
                <li key={`${blocker.code}:${blocker.message}`}>{blocker.message}</li>
              ))}
            </ul>
          ) : null}
          {upgrade ? (
            <Notice tone="info">
              <span className="font-medium">Business plan.</span> SSO is part of the Business plan.{" "}
              <Link href="/account/billing" className="underline">
                See plans
              </Link>
            </Notice>
          ) : null}
          {!readOnly ? (
            <div className="flex flex-wrap gap-2">
              {isActive ? (
                <Button type="button" variant="outline" disabled={busy !== null} onClick={() => setConfirm("disable")}>
                  Turn off
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={busy !== null || blockers.length > 0 || dirty}
                  onClick={() => setConfirm("activate")}
                >
                  Turn on
                </Button>
              )}
              <Button type="button" variant="outline" disabled={busy !== null} onClick={() => setConfirm("delete")}>
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={confirmSave} onOpenChange={setConfirmSave}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save and sign out SSO learners?</DialogTitle>
            <DialogDescription>
              These changes put the connection back to draft and sign out learners who used SSO. Test it again before
              turning it on.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmSave(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "activate" ? "Turn on SSO?" : confirm === "disable" ? "Turn off SSO?" : "Delete this connection?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "activate"
                ? connection.enforcement === "required_for_domains"
                  ? "Learners on your verified domains will have to use SSO. Anyone signed in another way is signed out."
                  : "Learners will see the SSO button on your sign-in page."
                : confirm === "disable"
                  ? "Learners who signed in with SSO are signed out. They can sign in with another method."
                  : "This removes the connection, its domains and the links between learners and their provider accounts. Learners who signed in with SSO are signed out. This can't be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => (confirm === "delete" ? void remove() : confirm && void changeState(confirm))}
            >
              {confirm === "activate" ? "Turn on" : confirm === "disable" ? "Turn off" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RecentSignInDialog open={reauth} onOpenChange={setReauth} />
    </div>
  );
}

function TestResult({ result }: { result: SsoTestResult }) {
  if (!result.ok) {
    const hint = testFailureHint(result.reason);
    return (
      <Notice>
        The test sign-in failed{result.reason ? ` (${result.reason})` : ""}.{" "}
        {hint ?? "Check the provider's settings, then try again."}
      </Notice>
    );
  }
  const rows: [string, string | null][] = [
    ["Provider", result.issuer],
    ["Subject", result.subject],
    ["Email", result.email],
    ["Name", result.name],
    [
      "Email domain",
      result.emailDomainVerified === null ? null : result.emailDomainVerified ? "On a verified domain" : "Not on a verified domain",
    ],
  ];
  return (
    <div className="space-y-3 rounded-md border p-4">
      <p className="text-sm font-medium">The test sign-in worked. Your provider sent:</p>
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-all font-mono text-xs">{value}</dd>
            </div>
          ))}
      </dl>
      {result.emailDomainVerified === false ? (
        <Notice>The email isn&apos;t on a verified domain, so this person couldn&apos;t sign in. Verify the domain first.</Notice>
      ) : null}
      {Object.keys(result.attributes).length > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">All attributes</summary>
          <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[12rem_1fr]">
            {sortedAttributes(result.attributes).map(([name, values]) => (
              <div key={name} className="contents">
                <dt className="break-all font-mono text-xs text-muted-foreground">{name}</dt>
                <dd className="break-all font-mono text-xs">{values.join(", ")}</dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </div>
  );
}
