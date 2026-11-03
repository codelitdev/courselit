"use client";

import { Check, Copy, Plug } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { useAdminShellContext } from "@/components/layout/admin-shell-context";
import { CourseLitLoading } from "@/components/loading";
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
import { cn } from "@/lib/utils";

type AiConnection = {
  id: string;
  name: string;
  connectedAt: string;
  lastUsedAt: string | null;
};

const ASSISTANTS = [
  {
    key: "claude",
    name: "Claude",
    steps: [
      "In Claude, open Settings, then Connectors, and add a custom connector.",
      "Paste the CourseLit address above and save.",
      "Sign in with CourseLit when asked, and choose your school.",
    ],
  },
  {
    key: "chatgpt",
    name: "ChatGPT",
    steps: [
      "In ChatGPT, open Settings, then Connectors, and add a new connector.",
      "Paste the CourseLit address above.",
      "Sign in with CourseLit when asked, and choose your school.",
    ],
  },
  {
    key: "cursor",
    name: "Cursor",
    steps: [
      "In Cursor, open Settings, then MCP, and add a new server.",
      "Paste the CourseLit address above as the server URL.",
      "Sign in with CourseLit when the browser opens.",
    ],
  },
  {
    key: "other",
    name: "Other",
    steps: [
      "In your app, add a remote MCP server.",
      "Paste the CourseLit address above.",
      "Sign in with CourseLit, or use an API key if your app asks for one.",
    ],
  },
] as const;

function formatLastUsed(value: string | null): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "never";
  const minutes = Math.max(0, Math.round((Date.now() - date.valueOf()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function AiAssistantSettings() {
  const shell = useAdminShellContext();
  const account = shell?.account ?? null;
  const school = shell?.schools.find((s) => s.selected) ?? null;
  const isOwner = (school as { isOwner?: boolean } | null)?.isOwner === true;
  const accountName = account?.name?.trim() || account?.email || "you";

  const [mcpUrl, setMcpUrl] = useState("");
  const [items, setItems] = useState<AiConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistant, setAssistant] = useState<(typeof ASSISTANTS)[number]["key"]>("claude");
  const [copied, setCopied] = useState(false);
  const [toDisconnect, setToDisconnect] = useState<AiConnection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/ai-connections", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("load");
      const body = (await response.json()) as { mcpUrl: string; items: AiConnection[] };
      setMcpUrl(body.mcpUrl);
      setItems(body.items ?? []);
      setError(null);
    } catch {
      setError("Unable to load AI assistants. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the address and copy it manually.");
    }
  }

  async function disconnect() {
    if (!toDisconnect) return;
    setDisconnecting(true);
    try {
      const response = await fetch(
        `/api/v1/ai-connections/${encodeURIComponent(toDisconnect.id)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok && response.status !== 404) throw new Error("disconnect");
      toast.success(`${toDisconnect.name} disconnected`);
      setToDisconnect(null);
      await load();
    } catch {
      toast.error("Could not disconnect. Try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  const current = ASSISTANTS.find((a) => a.key === assistant) ?? ASSISTANTS[0];

  if (loading) return <CourseLitLoading className="p-12" />;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Connect an AI assistant</CardTitle>
          <CardDescription>
            Work on your school from Claude, ChatGPT, Cursor or any app that
            supports MCP. It acts with the permissions of whoever connects it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <span className="text-sm font-medium">CourseLit address</span>
            <div className="flex items-center gap-2 rounded-[var(--radius)] border bg-muted/40 p-1.5 pl-3">
              <code className="min-w-0 flex-1 truncate font-mono text-[0.8125rem]">
                {mcpUrl}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void copyAddress()}
                disabled={!mcpUrl}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">Setup steps for</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Assistant">
              {ASSISTANTS.map((a) => (
                <Button
                  key={a.key}
                  size="sm"
                  variant={a.key === assistant ? "soft" : "outline"}
                  aria-pressed={a.key === assistant}
                  onClick={() => setAssistant(a.key)}
                >
                  {a.name}
                </Button>
              ))}
            </div>
          </div>

          <ol className="list-decimal space-y-1.5 pl-5 text-sm">
            {current.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {isOwner ? (
            <p className="text-sm text-muted-foreground">
              App can&apos;t sign in through the browser?{" "}
              <Link
                href="/settings?tab=api-keys"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Create an API key
              </Link>{" "}
              for your school and paste it in instead.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected assistants</CardTitle>
          <CardDescription>
            Disconnecting stops access straight away. Anything an assistant
            already created stays.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Plug}
              title="No assistants connected yet"
              description="Add the CourseLit address to your assistant. It shows up here as soon as it connects."
            />
          ) : (
            <ul className="divide-y rounded-[var(--radius)] border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-8 place-items-center rounded-lg bg-[var(--primary-soft)] text-xs font-semibold text-primary",
                    )}
                  >
                    {item.name.slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <b className="flex items-center gap-2 text-sm font-semibold">
                      <span className="truncate">{item.name}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--success-soft,var(--primary-soft))] px-2 py-0.5 text-[11px] font-semibold text-primary">
                        <span className="size-1.5 rounded-full bg-current" />
                        Connected
                      </span>
                    </b>
                    <span className="block text-[0.8125rem] text-muted-foreground">
                      Connected by {accountName} · last used{" "}
                      {formatLastUsed(item.lastUsedAt)}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setToDisconnect(item)}
                  >
                    Disconnect
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={toDisconnect !== null}
        onOpenChange={(open) => {
          if (!open && !disconnecting) setToDisconnect(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect {toDisconnect?.name}?</DialogTitle>
            <DialogDescription>
              {toDisconnect?.name} will lose access to your school straight
              away. Courses, lessons and contacts it created stay as they are.
              You can connect it again any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={disconnecting}
              onClick={() => setToDisconnect(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={disconnecting}
              onClick={() => void disconnect()}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
