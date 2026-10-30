"use client";

import { Badge } from "@codelitdev/design-system";
import {
  COURSELIT_PERMISSIONS,
  type CourseLitPermission,
  type CourseLitPermissionPresetId,
  expandCourseLitPermissionPreset,
} from "@courselit/api-contract/team-permissions";
import { Copy, Key, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CourseLitLoading } from "@/components/loading";
import { showPermissionDeniedToast } from "@/components/permission-denied-feedback";
import {
  PermissionPicker,
  summarizeCourseLitPermissions,
} from "@/components/settings/permission-picker";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  permissions: CourseLitPermission[];
  createdBy: { name: string; email: string } | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
};

type CreatedApiKey = ApiKey & { key: string };

type ExpiryChoice = "never" | "30" | "90" | "365" | "custom";

const EXPIRY_LABELS: Record<ExpiryChoice, string> = {
  never: "Never",
  "30": "30 days",
  "90": "90 days",
  "365": "1 year",
  custom: "Custom date",
};

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatRelative(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Never";
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 24 * 60 * 60],
    ["month", 30 * 24 * 60 * 60],
    ["day", 24 * 60 * 60],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return "Just now";
}

function expiryToIso(choice: ExpiryChoice, customDate: string): string | undefined {
  if (choice === "never") return undefined;
  if (choice === "custom") {
    if (!customDate) return undefined;
    // End of the chosen local day.
    const date = new Date(`${customDate}T23:59:59`);
    return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
  }
  return new Date(Date.now() + Number(choice) * DAY_MS).toISOString();
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const details = (body as { details?: { reason?: string } }).details;
    if (details?.reason === "api_key_limit_reached") {
      return "This school has reached the maximum number of active API keys. Revoke an unused key first.";
    }
    if (details?.reason === "api_key_expiry_out_of_range") {
      return "Choose an expiry date in the future and within two years.";
    }
  }
  return fallback;
}

/**
 * School API keys. Keys belong to the school and are managed by its owner;
 * the parent only renders this for owners, and the API enforces it.
 */
export function ApiKeySettings({ schoolId }: { schoolId: string | null }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<CourseLitPermissionPresetId | "">("");
  const [permissions, setPermissions] = useState<CourseLitPermission[]>([]);
  const [expiry, setExpiry] = useState<ExpiryChoice>("90");
  const [customDate, setCustomDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedApiKey | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadKeys = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/api-keys", {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": schoolId },
      });
      const body = (await response.json().catch(() => null)) as {
        items?: ApiKey[];
      } | null;
      if (!response.ok) {
        if (response.status === 403) {
          showPermissionDeniedToast();
          return;
        }
        throw new Error("Unable to load API keys.");
      }
      setKeys(body?.items ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load API keys.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  function openCreate() {
    setName("");
    setPreset("");
    setPermissions([]);
    setExpiry("90");
    setCustomDate("");
    setCreateError(null);
    setCreateOpen(true);
  }

  async function createKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId || creating) return;
    if (expiry === "custom" && !customDate) {
      setCreateError("Choose an expiry date.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/v1/api-keys", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": schoolId },
        body: JSON.stringify({
          name: name.trim(),
          permissions,
          expiresAt: expiryToIso(expiry, customDate),
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | CreatedApiKey
        | { message?: string }
        | null;
      if (!response.ok || !body || !("key" in body)) {
        if (response.status === 403) {
          showPermissionDeniedToast();
          return;
        }
        throw new Error(errorMessage(body, "Unable to create the API key."));
      }
      setCreateOpen(false);
      setCreatedKey(body);
      void loadKeys();
    } catch (caught) {
      setCreateError(
        caught instanceof Error ? caught.message : "Unable to create the API key.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey() {
    if (!schoolId || !keyToRevoke || revoking) return;
    setRevoking(true);
    try {
      const response = await fetch(
        `/api/v1/api-keys/${encodeURIComponent(keyToRevoke.id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "x-school-id": schoolId },
        },
      );
      if (!response.ok && response.status !== 404) {
        if (response.status === 403) {
          showPermissionDeniedToast();
          return;
        }
        throw new Error("Unable to revoke the API key.");
      }
      toast.success("API key revoked.");
      setKeyToRevoke(null);
      void loadKeys();
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to revoke the API key.",
      );
    } finally {
      setRevoking(false);
    }
  }

  async function copyCreatedKey() {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey.key);
      toast.success("API key copied.");
    } catch {
      toast.error("Unable to copy the API key.");
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 2 * 365 * DAY_MS).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {error ? (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            <Button type="button" variant="outline" onClick={() => void loadKeys()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="size-4 text-muted-foreground" />
              API keys
            </CardTitle>
            <CardDescription>
              Keys let your own integrations use the CourseLit API and MCP server on
              behalf of this school. Each key only has the permissions you give it.
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreate} disabled={!schoolId}>
            <Plus className="size-4" />
            Create API key
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <CourseLitLoading label="Loading API keys…" className="justify-start" />
          ) : null}
          {!loading && keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
              <Key className="mb-2 size-8 opacity-50" />
              <p>No API keys yet.</p>
            </div>
          ) : null}
          {!loading && keys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Key</th>
                    <th className="py-2 pr-4 font-medium">Permissions</th>
                    <th className="py-2 pr-4 font-medium">Created by</th>
                    <th className="py-2 pr-4 font-medium">Last used</th>
                    <th className="py-2 pr-4 font-medium">Expires</th>
                    <th className="py-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className="border-t align-top">
                      <td className="py-3 pr-4 font-medium">{key.name}</td>
                      <td className="py-3 pr-4">
                        <code className="font-mono text-xs break-all">
                          {key.prefix}…
                        </code>
                      </td>
                      <td className="py-3 pr-4" title={key.permissions.join(", ")}>
                        {summarizeCourseLitPermissions(key.permissions)}
                      </td>
                      <td className="py-3 pr-4">
                        {key.createdBy ? (
                          <span title={key.createdBy.email}>
                            {key.createdBy.name || key.createdBy.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Former member</span>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(key.createdAt)}
                        </p>
                      </td>
                      <td className="py-3 pr-4">{formatRelative(key.lastUsedAt)}</td>
                      <td className="py-3 pr-4">
                        {key.expired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : key.expiresAt ? (
                          formatDate(key.expiresAt)
                        ) : (
                          "Never"
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setKeyToRevoke(key)}
                          title={`Revoke ${key.name}`}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Revoke {key.name}</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => !creating && setCreateOpen(open)}>
        <DialogContent className="flex max-h-[min(90vh,50rem)] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Give the key only the permissions your integration needs.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => void createKey(event)}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6">
              <div className="space-y-1.5">
                <Label htmlFor="api-key-name">Name</Label>
                <Input
                  id="api-key-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Zapier sync"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="api-key-expiry">Expires</Label>
                <Select
                  value={expiry}
                  onValueChange={(value) => setExpiry(value as ExpiryChoice)}
                >
                  <SelectTrigger id="api-key-expiry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EXPIRY_LABELS) as ExpiryChoice[]).map((choice) => (
                      <SelectItem key={choice} value={choice}>
                        {EXPIRY_LABELS[choice]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {expiry === "custom" ? (
                  <Input
                    type="date"
                    aria-label="Expiry date"
                    min={today}
                    max={maxDate}
                    value={customDate}
                    onChange={(event) => setCustomDate(event.target.value)}
                  />
                ) : null}
              </div>
              <PermissionPicker
                preset={preset}
                permissions={permissions}
                selectable={COURSELIT_PERMISSIONS}
                onPresetChange={(next) => {
                  setPreset(next);
                  if (next !== "custom") {
                    setPermissions(expandCourseLitPermissionPreset(next));
                  }
                }}
                onPermissionsChange={setPermissions}
              />
              {createError ? (
                <p className="text-sm text-destructive" role="alert">
                  {createError}
                </p>
              ) : null}
            </div>
            <DialogFooter className="mt-0 shrink-0 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !name.trim() || permissions.length === 0}
              >
                {creating ? "Creating…" : "Create API key"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(createdKey)}
        onOpenChange={(open) => {
          if (!open) setCreatedKey(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API key created</DialogTitle>
            <DialogDescription>
              Copy this API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                readOnly
                value={createdKey?.key ?? ""}
                aria-label="New API key"
                className="font-mono text-xs"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyCreatedKey()}
              >
                <Copy className="size-4" />
                <span className="sr-only">Copy API key</span>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Send it in the <code className="font-mono">x-api-key</code> header:
            </p>
            <pre className="overflow-x-auto rounded-md border bg-muted p-3 font-mono text-xs">
              x-api-key: {createdKey?.prefix ?? "cl_live_…"}.…
            </pre>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setCreatedKey(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(keyToRevoke)}
        onOpenChange={(open) => {
          if (!open && !revoking) setKeyToRevoke(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
            <DialogDescription>
              {keyToRevoke ? `“${keyToRevoke.name}” will be revoked. ` : ""}
              Any integration using it will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setKeyToRevoke(null)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void revokeKey()}
              disabled={revoking}
            >
              {revoking ? "Revoking…" : "Revoke key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
