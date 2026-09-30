"use client";

import { Badge } from "@codelitdev/design-system";
import { Check, Copy, Globe, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { CourseLitLoading } from "@/components/loading";

type VerificationRecords = {
  cnameTarget: string;
  txtName: string;
  txtValue: string;
  kind: "cname" | "alias";
  txtSatisfied: boolean | null;
  routingSatisfied: boolean | null;
};

type SchoolHost = {
  hostname: string;
  kind: "subdomain" | "custom";
  verificationStatus: "verified" | "unverified";
  verifiedAt: string | null;
  isPrimary: boolean;
  verificationRecords?: VerificationRecords | null;
};

type HostsResponse = {
  items: SchoolHost[];
  platformDomain: string;
};

type ApiError = {
  message?: string;
  details?: { reason?: string };
  safeDetails?: { reason?: string };
};

async function readError(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as ApiError | null;
  const reason = body?.details?.reason ?? body?.safeDetails?.reason;
  if (reason === "website_setup_pending") {
    return new Error("Website setup is still in progress. Try again shortly.");
  }
  if (reason === "custom_domain_already_attached") {
    return new Error("Remove the current custom domain before adding another.");
  }
  return new Error(body?.message || `Request failed (${response.status}).`);
}

export function DomainSettings() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [hosts, setHosts] = useState<HostsResponse | null>(null);
  const [hostname, setHostname] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const customHost = hosts?.items.find((host) => host.kind === "custom") ?? null;
  const primaryHost = hosts?.items.find((host) => host.isPrimary) ?? null;
  const records = customHost?.verificationRecords ?? null;

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: Array<{ id: string; selected?: boolean }> }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (active && selected) setSchoolId(selected.id);
        else if (active) {
          setLoading(false);
          setInitialLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setInitialLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadHosts(id = schoolId, initial = false) {
    if (!id) return;
    setLoading(true);
    try {
      const response = await fetch("/api/v1/school/hosts", {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": id },
      });
      if (!response.ok) throw await readError(response);
      setHosts((await response.json()) as HostsResponse);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load domains.");
    } finally {
      setLoading(false);
      if (initial) setInitialLoading(false);
    }
  }

  useEffect(() => {
    if (schoolId) void loadHosts(schoolId, true);
    // loadHosts is intentionally not a dependency: this effect follows the selected school.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  async function addDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId || working || !hostname.trim()) return;
    setWorking(true);
    try {
      const response = await fetch("/api/v1/school/hosts", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({ hostname: hostname.trim() }),
      });
      if (!response.ok) throw await readError(response);
      setHostname("");
      await loadHosts();
      toast.success("Custom domain added. Configure the DNS records below.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add custom domain.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function checkDns() {
    if (!schoolId || !customHost || working) return;
    setWorking(true);
    try {
      const response = await fetch(
        `/api/v1/school/hosts/${encodeURIComponent(customHost.hostname)}/verify`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-school-id": schoolId,
          },
          body: "{}",
        },
      );
      if (!response.ok) throw await readError(response);
      const result = (await response.json()) as SchoolHost;
      await loadHosts();
      if (result.verificationStatus === "verified") {
        toast.success("DNS records verified. Your custom domain is connected.");
      } else {
        toast.message(
          "DNS records are not ready yet. Check the records and try again.",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to check DNS records.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function removeDomain() {
    if (!schoolId || !customHost || working) return;
    setWorking(true);
    try {
      const response = await fetch(
        `/api/v1/school/hosts/${encodeURIComponent(customHost.hostname)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "x-school-id": schoolId },
        },
      );
      if (!response.ok) throw await readError(response);
      setRemoveOpen(false);
      await loadHosts();
      toast.success("Custom domain removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to remove custom domain.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Unable to copy this value.");
    }
  }

  const statusLabel =
    customHost?.verificationStatus === "verified" ? "Connected" : "Needs DNS setup";

  return (
    <div className="space-y-6">
      {initialLoading ? <CourseLitLoading label="Loading domain settings…" /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Default domain</CardTitle>
          <CardDescription>
            Your school subdomain remains available as a fallback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading domains…</p>
          ) : primaryHost ? (
            <p className="break-all font-medium">
              {primaryHost.hostname}.{hosts?.platformDomain}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              A default domain is not available yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Custom domain</CardTitle>
              <CardDescription>
                Use your own domain for your school website. Add the DNS records at your
                domain provider, then check that they have propagated.
              </CardDescription>
            </div>
            {customHost ? (
              <Badge
                variant={
                  customHost.verificationStatus === "verified" ? "success" : "neutral"
                }
              >
                {statusLabel}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading domain settings…</p>
          ) : customHost ? (
            <>
              <p className="break-all font-medium">{customHost.hostname}</p>
              {records ? (
                <div className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_2rem_8rem]">
                    <span>Type</span>
                    <span>Name</span>
                    <span className="hidden sm:block">Value</span>
                    <span className="hidden sm:block" aria-hidden="true" />
                    <span className="hidden sm:block">Status</span>
                  </div>
                  <DnsRecordRow
                    type="CNAME"
                    name={customHost.hostname}
                    value={records.cnameTarget}
                    satisfied={records.routingSatisfied}
                    onCopy={copyValue}
                  />
                  <DnsRecordRow
                    type="TXT"
                    name={records.txtName}
                    value={records.txtValue}
                    satisfied={records.txtSatisfied}
                    onCopy={copyValue}
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  DNS instructions will be available once website setup completes.
                </p>
              )}
              {customHost.verificationStatus === "verified" ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check aria-hidden="true" className="size-4 text-green-700" />
                  This domain is connected to your school website.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  DNS changes can take time to propagate. Once configured, check DNS
                  again.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={!records || working}
                  onClick={() => void checkDns()}
                >
                  {working ? (
                    <LoaderCircle aria-hidden="true" className="animate-spin" />
                  ) : (
                    <RefreshCw aria-hidden="true" />
                  )}
                  Check DNS
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={working}
                  onClick={() => setRemoveOpen(true)}
                >
                  <Trash2 aria-hidden="true" />
                  Remove domain
                </Button>
              </div>
            </>
          ) : (
            <form className="space-y-3" onSubmit={(event) => void addDomain(event)}>
              <div className="max-w-xl space-y-2">
                <Label htmlFor="website-custom-domain">Domain name</Label>
                <Input
                  id="website-custom-domain"
                  autoComplete="url"
                  placeholder="learn.example.com"
                  value={hostname}
                  onChange={(event) => setHostname(event.target.value)}
                  disabled={!schoolId || working}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the hostname only, without a path (for example,
                  learn.example.com).
                </p>
              </div>
              <Button type="submit" disabled={!schoolId || working || !hostname.trim()}>
                {working ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Globe aria-hidden="true" />
                )}
                Add custom domain
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove custom domain?</DialogTitle>
            <DialogDescription>
              {customHost?.hostname} will no longer serve this school website. Your
              default domain will remain available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={working}
              onClick={() => setRemoveOpen(false)}
            >
              Keep domain
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={working}
              onClick={() => void removeDomain()}
            >
              {working ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              Remove domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DnsRecordRow({
  type,
  name,
  value,
  satisfied,
  onCopy,
}: {
  type: string;
  name: string;
  value: string;
  satisfied: boolean | null;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-b px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_2rem_8rem]">
      <span className="font-medium">{type}</span>
      <span className="min-w-0 break-all font-mono text-xs">{name}</span>
      <span className="col-start-2 min-w-0 break-all font-mono text-xs sm:col-start-3">
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="col-start-2 h-7 justify-self-start px-2 sm:col-start-4 sm:justify-self-center"
        aria-label={`Copy ${type} value`}
        onClick={() => onCopy(value)}
      >
        <Copy aria-hidden="true" />
      </Button>
      <span
        className={`col-start-2 text-xs sm:col-start-5 ${
          satisfied === true
            ? "text-green-700"
            : satisfied === false
              ? "text-amber-700"
              : "text-muted-foreground"
        }`}
      >
        {satisfied === true
          ? "Detected"
          : satisfied === false
            ? "Not detected"
            : "Not checked"}
      </span>
    </div>
  );
}
