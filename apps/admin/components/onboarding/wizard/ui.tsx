"use client";

import {
  Check,
  CircleAlert,
  Clock,
  Copy,
  File as FileIcon,
  Loader2,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { cn } from "@/lib/utils";

/** Status colours the admin tokens do not define. */
export const OK_TEXT = "text-[oklch(0.44_0.12_150)]";
export const OK_SOFT = "bg-[oklch(0.56_0.13_150/0.12)]";
export const WARN_TEXT = "text-[oklch(0.48_0.11_70)]";
export const WARN_SOFT = "bg-[oklch(0.66_0.13_75/0.15)]";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-4 animate-spin", className)} />;
}

export function StepHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-[11.5px] tracking-wide text-muted-foreground">
        {eyebrow}
      </span>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight max-md:text-[25px]">
        {title}
      </h1>
      {sub ? <p className="max-w-[56ch] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function FieldBlock({
  label,
  htmlFor,
  aside,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  aside?: ReactNode;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[13px] font-semibold">
        {htmlFor ? <label htmlFor={htmlFor}>{label}</label> : <span>{label}</span>}
        {aside ? (
          <em className="text-[12.5px] font-normal not-italic text-muted-foreground">
            {aside}
          </em>
        ) : null}
      </div>
      {children}
      {error ? (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-[12.5px] text-destructive"
        >
          <CircleAlert aria-hidden className="size-3.5" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12.5px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Hint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[12.5px] leading-snug text-muted-foreground", className)}>
      {children}
    </p>
  );
}

type NoteTone = "info" | "warn" | "bad" | "ok";

export function Note({
  tone = "info",
  icon,
  children,
  action,
  role,
  className,
}: {
  tone?: NoteTone;
  icon?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  const toneClass: Record<NoteTone, string> = {
    info: "border border-border bg-muted/50 text-muted-foreground",
    warn: WARN_SOFT,
    bad: "bg-[var(--destructive-soft)]",
    ok: OK_SOFT,
  };
  const iconClass: Record<NoteTone, string> = {
    info: "text-muted-foreground",
    warn: WARN_TEXT,
    bad: "text-destructive",
    ok: OK_TEXT,
  };
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius)] px-3.5 py-3 text-sm leading-normal",
        toneClass[tone],
        className,
      )}
    >
      {icon ? (
        <span className={cn("mt-0.5 shrink-0", iconClass[tone])}>{icon}</span>
      ) : null}
      <div className="min-w-0 flex-1 [&_b]:font-semibold [&_b]:text-foreground">
        {children}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: Array<{ value: T; label: ReactNode }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "inline-flex w-fit gap-0.5 rounded-[var(--radius)] bg-muted p-[3px]",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-[34px] items-center justify-center gap-1.5 whitespace-nowrap rounded-[7px] px-3.5 text-sm font-medium text-muted-foreground hover:text-foreground",
            option.value === value && "bg-card font-semibold text-foreground shadow-sm",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Tile({
  name,
  checked,
  onChange,
  icon,
  title,
  desc,
  children,
  className,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  icon?: ReactNode;
  title: ReactNode;
  desc?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-start gap-3.5 rounded-2xl border border-input bg-card p-4 text-left transition-[border-color,box-shadow] hover:border-muted-foreground has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-ring",
        checked && "border-primary shadow-[0_0_0_3px_var(--primary-soft)]",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="pointer-events-none absolute opacity-0"
      />
      {icon ? (
        <span
          className={cn(
            "grid size-[42px] shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground",
            checked && "bg-[var(--primary-soft)] text-primary",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="text-[15px] font-semibold">{title}</b>
        {desc ? (
          <span className="text-[13.5px] leading-snug text-muted-foreground">
            {desc}
          </span>
        ) : null}
        {children}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] border-input",
          checked &&
            "border-primary after:size-2.5 after:rounded-full after:bg-primary after:content-['']",
        )}
      />
    </label>
  );
}

export type RowState = "done" | "run" | "fail" | "wait" | "later";

export function ProgressList({
  rows,
  onRetry,
}: {
  rows: Array<{ key: string; name: string; desc: ReactNode; state: RowState }>;
  onRetry?: (key: string) => void;
}) {
  return (
    <ul aria-live="polite" className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-3.5 py-3"
        >
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground",
              row.state === "done" && cn(OK_SOFT, OK_TEXT),
              row.state === "run" && "bg-[var(--primary-soft)] text-primary",
              row.state === "fail" && "bg-[var(--destructive-soft)] text-destructive",
              row.state === "later" && cn(WARN_SOFT, WARN_TEXT),
            )}
          >
            {row.state === "done" ? (
              <Check aria-hidden className="size-3.5" strokeWidth={2.6} />
            ) : null}
            {row.state === "run" ? <Spinner className="size-3.5" /> : null}
            {row.state === "fail" ? (
              <X aria-hidden className="size-3.5" strokeWidth={2.6} />
            ) : null}
            {row.state === "later" ? <Clock aria-hidden className="size-3.5" /> : null}
            {row.state === "wait" ? (
              <span className="size-1.5 rounded-full bg-current" />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="text-sm font-semibold">{row.name}</b>
            <span className="text-[13px] text-muted-foreground">{row.desc}</span>
          </span>
          {row.state === "fail" && onRetry ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRetry(row.key)}
            >
              Retry
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function DropZone({
  icon,
  title,
  sub,
  accept,
  multiple,
  onFiles,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  accept?: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const files = Array.from(event.dataTransfer.files ?? []);
          if (files.length) onFiles(multiple ? files : files.slice(0, 1));
        }}
        className={cn(
          "flex w-full items-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-input bg-muted/40 p-4 text-left hover:border-primary hover:bg-[var(--primary-soft)] disabled:opacity-50",
          over && "border-primary bg-[var(--primary-soft)]",
        )}
      >
        <span className="grid size-[42px] shrink-0 place-items-center rounded-xl border border-border bg-card text-muted-foreground">
          {icon}
        </span>
        <span className="flex flex-col">
          <b className="text-sm font-semibold">{title}</b>
          <span className="text-[13px] text-muted-foreground">{sub}</span>
        </span>
      </button>
    </>
  );
}

export function FileRow({
  name,
  meta,
  pct,
  thumb,
  error,
  action,
}: {
  name: string;
  meta: ReactNode;
  pct?: number;
  thumb?: ReactNode;
  error?: string | null;
  action: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card p-2.5">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
        {thumb ?? <FileIcon aria-hidden className="size-4" />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="truncate text-sm font-semibold">{name}</b>
        <span
          className={cn(
            "text-[12.5px]",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {error ?? meta}
        </span>
        {pct !== undefined ? (
          <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
            <i
              className="block h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
            />
          </span>
        ) : null}
      </span>
      {action}
    </div>
  );
}

/** Copies text and flips its label to "Copied" for a moment. */
export function useCopy(): [string | null, (key: string, text: string) => void] {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function copy(key: string, text: string) {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(key);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2000);
  }
  return [copied, copy];
}

export function CopyRow({
  value,
  copied,
  onCopy,
  children,
}: {
  value: string;
  copied: boolean;
  onCopy: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-muted/50 py-1.5 pl-3 pr-1.5">
      <code className="min-w-0 flex-1 truncate font-mono text-[13.5px]">{value}</code>
      <Button type="button" variant="outline" size="sm" onClick={onCopy}>
        {copied ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
        {copied ? "Copied" : "Copy"}
      </Button>
      {children}
    </div>
  );
}

export function Badge({
  tone = "wait",
  children,
  pulse,
}: {
  tone?: "ok" | "wait" | "no" | "accent" | "muted";
  children: ReactNode;
  pulse?: boolean;
}) {
  const classes = {
    ok: cn(OK_SOFT, OK_TEXT),
    wait: cn(WARN_SOFT, WARN_TEXT),
    no: "bg-[var(--destructive-soft)] text-destructive",
    accent: "bg-[var(--primary-soft)] text-primary",
    muted: "bg-muted text-muted-foreground",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold",
        classes[tone],
      )}
    >
      <i className={cn("size-1.5 rounded-full bg-current", pulse && "animate-pulse")} />
      {children}
    </span>
  );
}
