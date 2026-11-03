"use client";

import { Check, ChevronDown, ChevronLeft, CircleAlert, Key, Plug } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { cn } from "@/lib/utils";
import {
  type AiConnection,
  createSchoolApiKey,
  getProduct,
  listAiConnections,
  listProducts,
  type ProductDetail,
} from "./api";
import {
  AI_APPS,
  type AiApp,
  type AiStatus,
  aiPromptFor,
  aiStatusAfterPoll,
  hasNewConnection,
  type WizardData,
} from "./flow";
import {
  Badge,
  CopyRow,
  FieldBlock,
  Hint,
  OK_SOFT,
  OK_TEXT,
  StepHeader,
  useCopy,
} from "./ui";

export type DetectedOffer = {
  id: string;
  kind: "course" | "download";
  title: string;
  description: string;
  slug: string;
  sections: number;
  lessons: number;
  published: boolean;
};

export type AiConnectionState = {
  app: AiApp["key"];
  setApp: (key: AiApp["key"]) => void;
  status: AiStatus;
  mcpUrl: string;
  apiKey: string | null;
  keyOpen: boolean;
  setKeyOpen: (open: boolean) => void;
  keyBusy: boolean;
  keyError: string | null;
  createKey: () => Promise<void>;
  markWaiting: () => void;
  retry: () => void;
  detected: DetectedOffer | null;
  connections: AiConnection[];
};

/**
 * Polls the user's AI connections and the school's products while the panel is
 * open, and reports Waiting / Connected / Detected / Timed out.
 */
export function useAiConnection({
  active,
  schoolId,
  ownProductId,
}: {
  active: boolean;
  schoolId: string | null;
  ownProductId?: string;
}): AiConnectionState {
  const [app, setApp] = useState<AiApp["key"]>("claude");
  const [status, setStatus] = useState<AiStatus>("idle");
  const [mcpUrl, setMcpUrl] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedOffer | null>(null);
  const [connections, setConnections] = useState<AiConnection[]>([]);
  const baseline = useRef<{
    connections: AiConnection[];
    products: Set<string>;
    openedAt: number;
  } | null>(null);
  const waitingSince = useRef<number | null>(null);
  const statusRef = useRef<AiStatus>("idle");
  statusRef.current = status;

  const setBoth = useCallback((next: AiStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    if (!active || !schoolId) return;
    let cancelled = false;
    baseline.current = null;

    async function snapshot() {
      try {
        const [conn, products] = await Promise.all([
          listAiConnections(),
          listProducts(schoolId as string).catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setMcpUrl(conn.mcpUrl);
        setConnections(conn.items);
        baseline.current = {
          connections: conn.items,
          products: new Set(products.items.map((item) => item.id)),
          openedAt: Date.now(),
        };
      } catch {
        // The first poll tries again.
      }
    }

    async function poll() {
      if (!baseline.current) {
        await snapshot();
        return;
      }
      try {
        const [conn, products] = await Promise.all([
          listAiConnections(),
          listProducts(schoolId as string).catch(() => null),
        ]);
        if (cancelled) return;
        setMcpUrl(conn.mcpUrl);
        setConnections(conn.items);
        const base = baseline.current;
        if (!base) return;
        const created = products?.items.find(
          (item) => !base.products.has(item.id) && item.id !== ownProductId,
        );
        const next = aiStatusAfterPoll({
          current: statusRef.current,
          newConnection: hasNewConnection(base.connections, conn.items, base.openedAt),
          newProduct: Boolean(created),
          waitingSince: waitingSince.current,
          now: Date.now(),
        });
        if (next !== statusRef.current) setBoth(next);
        if (created && !cancelled) {
          const detail: ProductDetail | null = await getProduct(
            schoolId as string,
            created.id,
          ).catch(() => null);
          if (cancelled) return;
          setDetected({
            id: created.id,
            kind: created.kind,
            title: created.title,
            description: created.description,
            slug: created.slug,
            sections: detail?.sections.length ?? 0,
            lessons: detail?.lessons.length ?? 0,
            published: created.status === "published",
          });
        }
      } catch {
        // Keep polling; a transient failure should not change the state.
      }
    }

    void snapshot();
    const timer = setInterval(() => void poll(), 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active, schoolId, ownProductId, setBoth]);

  const markWaiting = useCallback(() => {
    if (statusRef.current === "idle" || statusRef.current === "failed") {
      waitingSince.current = Date.now();
      setBoth("waiting");
    }
  }, [setBoth]);

  const retry = useCallback(() => {
    waitingSince.current = Date.now();
    if (baseline.current) baseline.current.openedAt = Date.now();
    setBoth("waiting");
  }, [setBoth]);

  const createKey = useCallback(async () => {
    if (!schoolId || keyBusy) return;
    setKeyBusy(true);
    setKeyError(null);
    try {
      const created = await createSchoolApiKey(schoolId, "AI assistant (setup)");
      setApiKey(created.key);
      markWaiting();
    } catch (caught) {
      setKeyError(
        caught instanceof Error ? caught.message : "Unable to create the key.",
      );
    } finally {
      setKeyBusy(false);
    }
  }, [schoolId, keyBusy, markWaiting]);

  return {
    app,
    setApp: (key) => {
      setApp(key);
      if (key === "other") setKeyOpen(true);
    },
    status,
    mcpUrl,
    apiKey,
    keyOpen,
    setKeyOpen,
    keyBusy,
    keyError,
    createKey,
    markWaiting,
    retry,
    detected,
    connections,
  };
}

export function appDisplayName(key: AiApp["key"]): string {
  return key === "other"
    ? "your assistant"
    : (AI_APPS.find((item) => item.key === key)?.name ?? "your assistant");
}

export function AiForm({
  ai,
  data,
  schoolName,
  backLabel,
  onBack,
}: {
  ai: AiConnectionState;
  data: WizardData;
  schoolName: string;
  backLabel: string;
  onBack: () => void;
}) {
  const [copied, copy] = useCopy();
  const app = AI_APPS.find((item) => item.key === ai.app) ?? AI_APPS[0];
  const name = appDisplayName(ai.app);
  const title =
    data.offer === "course"
      ? data.course.title
      : data.offer === "download"
        ? data.download.title
        : "";
  const prompt = aiPromptFor(data.offer, schoolName, title);
  return (
    <>
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2.5"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden />
          {backLabel}
        </Button>
      </div>
      <StepHeader
        eyebrow="Build it in chat"
        title="Connect your AI assistant"
        sub={`Your assistant can create courses, write lessons and organise ${schoolName} for you, with the same permissions you have.`}
      />
      <FieldBlock label="Which assistant do you use?">
        <div
          role="radiogroup"
          aria-label="Assistant"
          className="grid grid-cols-4 gap-2 max-md:grid-cols-2"
        >
          {AI_APPS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="radio"
              aria-checked={item.key === ai.app}
              onClick={() => ai.setApp(item.key)}
              className={cn(
                "flex items-center gap-2 rounded-[var(--radius)] border border-input bg-card px-3 py-2.5 text-sm font-semibold hover:border-muted-foreground",
                item.key === ai.app &&
                  "border-primary shadow-[0_0_0_3px_var(--primary-soft)]",
              )}
            >
              <span
                aria-hidden
                className="grid size-6 place-items-center rounded-md bg-muted font-mono text-[11px] text-muted-foreground"
              >
                {item.mono}
              </span>
              {item.name}
            </button>
          ))}
        </div>
      </FieldBlock>
      <section className="flex flex-col gap-3.5">
        <h2 className="text-base font-semibold">Add CourseLit to {name}</h2>
        <ol className="flex flex-col gap-2">
          {app.steps.map((step, index) => (
            <li key={step} className="flex items-start gap-2.5 text-sm">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <FieldBlock label="CourseLit address">
          <CopyRow
            value={ai.mcpUrl || "Loading the address…"}
            copied={copied === "mcp"}
            onCopy={() => {
              if (!ai.mcpUrl) return;
              copy("mcp", ai.mcpUrl);
              ai.markWaiting();
            }}
          />
        </FieldBlock>
        <div className="rounded-[var(--radius)] border border-border">
          <button
            type="button"
            aria-expanded={ai.keyOpen}
            onClick={() => ai.setKeyOpen(!ai.keyOpen)}
            className="flex w-full items-center gap-2 px-3.5 py-3 text-left text-sm font-semibold"
          >
            <Key aria-hidden className="size-4" />
            Does {name} ask for an API key instead?
            <ChevronDown
              aria-hidden
              className={cn(
                "ml-auto size-4 transition-transform",
                ai.keyOpen && "rotate-180",
              )}
            />
          </button>
          {ai.keyOpen ? (
            <div className="flex flex-col gap-3 border-t border-border px-3.5 py-3.5">
              {ai.apiKey ? (
                <div className="flex flex-col gap-2 rounded-[var(--radius)] bg-muted/50 p-3">
                  <b className="text-[13.5px]">
                    Copy this key now. It won&apos;t be shown again.
                  </b>
                  <CopyRow
                    value={ai.apiKey}
                    copied={copied === "key"}
                    onCopy={() => copy("key", ai.apiKey as string)}
                  />
                  <Hint>
                    Lost it? Delete it in Settings › API keys and create a new one.
                  </Hint>
                </div>
              ) : (
                <>
                  <Hint className="text-[13.5px]">
                    Some apps can&apos;t sign in through the browser. Create a key that
                    only works for {schoolName} and paste it into the app.
                  </Hint>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={ai.keyBusy}
                      onClick={() => void ai.createKey()}
                    >
                      {ai.keyBusy ? "Creating…" : `Create an API key for ${schoolName}`}
                    </Button>
                  </div>
                  {ai.keyError ? (
                    <p role="alert" className="text-[12.5px] text-destructive">
                      {ai.keyError}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Then ask it to start</h2>
        <div className="relative rounded-[var(--radius)] border border-border bg-muted/50 p-3.5 pr-20 text-sm leading-relaxed">
          {prompt}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-2 top-2"
            onClick={() => copy("prompt", prompt)}
          >
            {copied === "prompt" ? "Copied" : "Copy"}
          </Button>
        </div>
        <Hint>
          Anything it creates shows up here, and in your admin, as a draft you can
          check.
        </Hint>
      </section>
    </>
  );
}

export function aiBadge(status: AiStatus): React.ReactNode {
  if (status === "waiting")
    return (
      <Badge tone="wait" pulse>
        Waiting
      </Badge>
    );
  if (status === "connected" || status === "detected")
    return <Badge tone="ok">Connected</Badge>;
  if (status === "failed") return <Badge tone="no">Not connected</Badge>;
  return null;
}

/** The right-hand pane while the assistant panel is open. */
export function AiStatusPane({
  ai,
  schoolName,
  canUse,
  onUse,
  onBackToForm,
  adminUrl,
}: {
  ai: AiConnectionState;
  schoolName: string;
  canUse: boolean;
  onUse: (offer: DetectedOffer) => void;
  onBackToForm: () => void;
  adminUrl: string;
}) {
  const name = appDisplayName(ai.app);
  const { status, detected } = ai;
  const ring = (tone: "plain" | "wait" | "ok" | "bad", icon: React.ReactNode) => (
    <span
      className={cn(
        "grid size-16 place-items-center rounded-full bg-muted text-muted-foreground",
        tone === "wait" && "animate-pulse bg-[var(--primary-soft)] text-primary",
        tone === "ok" && cn(OK_SOFT, OK_TEXT),
        tone === "bad" && "bg-[var(--destructive-soft)] text-destructive",
      )}
    >
      {icon}
    </span>
  );
  const timeline = [
    { label: "CourseLit address copied", done: status !== "idle", now: false },
    {
      label: "Assistant connected",
      done: status === "connected" || status === "detected",
      now: status === "waiting",
    },
    {
      label: "First product created",
      done: status === "detected",
      now: status === "connected",
    },
  ];
  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-3.5 text-center"
    >
      {status === "idle" ? (
        <>
          {ring("plain", <Plug aria-hidden className="size-7" />)}
          <h2 className="text-lg font-semibold">Not connected yet</h2>
          <p className="max-w-[40ch] text-sm text-muted-foreground">
            Add CourseLit to {name} using the steps on the left. This updates by itself
            when it connects.
          </p>
        </>
      ) : null}
      {status === "waiting" ? (
        <>
          {ring("wait", <Plug aria-hidden className="size-7" />)}
          <h2 className="text-lg font-semibold">Waiting for your assistant…</h2>
          <p className="max-w-[40ch] text-sm text-muted-foreground">
            Finish adding CourseLit in {name} and sign in when it asks. Keep this tab
            open.
          </p>
        </>
      ) : null}
      {status === "connected" ? (
        <>
          {ring("ok", <Check aria-hidden className="size-7" />)}
          <h2 className="text-lg font-semibold">{name} is connected</h2>
          <p className="max-w-[40ch] text-sm text-muted-foreground">
            Paste the prompt into {name}. When it creates something, it appears here.
          </p>
        </>
      ) : null}
      {status === "failed" ? (
        <>
          {ring("bad", <CircleAlert aria-hidden className="size-7" />)}
          <h2 className="text-lg font-semibold">We haven&apos;t heard from {name}</h2>
          <p className="text-sm text-muted-foreground">
            It&apos;s been 5 minutes. Usually one of these fixes it:
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-left text-sm text-muted-foreground">
            <li>Check the address was pasted in full, with nothing after it.</li>
            <li>Finish signing in with CourseLit in the browser window it opened.</li>
            <li>Restart {name} so it picks up the new connection.</li>
          </ul>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={ai.retry}>
              Try again
            </Button>
            <Button type="button" variant="ghost" onClick={onBackToForm}>
              Back to the form
            </Button>
          </div>
        </>
      ) : null}
      {status === "detected" && detected ? (
        <>
          {ring("ok", <Check aria-hidden className="size-7" />)}
          <h2 className="text-lg font-semibold">
            {name} created your {detected.kind === "course" ? "course" : "download"}
          </h2>
          <div className="flex w-full max-w-[440px] items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-2.5 text-left">
            <span className="min-w-0 flex-1">
              <b className="block truncate text-sm">{detected.title}</b>
              <span className="text-[12.5px] text-muted-foreground">
                {detected.sections} sections · {detected.lessons} lessons
              </span>
            </span>
            <Badge tone={detected.published ? "ok" : "wait"}>
              {detected.published ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="max-w-[44ch] text-sm text-muted-foreground">
            It&apos;s saved as a draft in {schoolName}. Check it over in your admin, or
            keep shaping it from chat.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {canUse ? (
              <Button type="button" onClick={() => onUse(detected)}>
                Use as my first offer
              </Button>
            ) : null}
            <Button type="button" variant="outline" asChild>
              <a href={adminUrl} target="_blank" rel="noreferrer">
                Open in admin
              </a>
            </Button>
          </div>
        </>
      ) : null}
      {status !== "failed" ? (
        <ol className="mt-2 flex w-full max-w-[320px] flex-col gap-2 text-left text-sm">
          {timeline.map((item) => (
            <li
              key={item.label}
              className={cn(
                "flex items-center gap-2 text-muted-foreground",
                item.done && "text-foreground",
                item.now && "font-medium text-foreground",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full bg-border",
                  item.done && "bg-[oklch(0.56_0.13_150)]",
                  item.now && "animate-pulse bg-primary",
                )}
              />
              {item.label}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
