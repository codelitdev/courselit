"use client";

import { COURSELIT_SYSTEM_THEMES } from "@courselit/page-blocks/theme";
import type { ThemeStyle } from "@frontlit/page-builder/models";
import {
  Badge,
  Button,
  Caption,
  Header1,
  Header2,
  Header3,
  Header4,
  Input,
  PageCard,
  PageCardContent,
  PageCardImage,
  Text1,
  Text2,
} from "@frontlit/page-builder/primitives";
import { generateThemeStyles } from "@frontlit/page-builder/renderer";
import { Lock, Users } from "lucide-react";
import { createContext, type ReactNode, useContext, useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  addressPreview,
  buyCta,
  isPaidOffer,
  offerDescription,
  offerSharePath,
  offerTitle,
  offerTitleOr,
  type WizardData,
} from "./flow";

function Browser({
  url,
  path,
  children,
}: {
  url: string;
  path?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/50 px-3">
        <span className="flex min-w-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-0.5 text-xs text-muted-foreground">
          <Lock aria-hidden className="size-3" />
          <b className="truncate font-semibold text-foreground">{url}</b>
          {path}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}

/**
 * The preview is drawn with the real page-builder primitives and the selected
 * theme's own styles, scoped to this container, so it looks the way the
 * published site will.
 */
const PreviewTheme = createContext<ThemeStyle | undefined>(undefined);

function useTheme() {
  return useContext(PreviewTheme);
}

function ThemedSite({ themeId, children }: { themeId: string; children: ReactNode }) {
  const scope = useId().replace(/[^a-zA-Z0-9]/g, "");
  const theme = useMemo(
    () =>
      COURSELIT_SYSTEM_THEMES.find((item) => item.id === themeId) ??
      COURSELIT_SYSTEM_THEMES.find((item) => item.id === "classic") ??
      COURSELIT_SYSTEM_THEMES[0],
    [themeId],
  );
  const css = useMemo(
    () => generateThemeStyles(theme, `[data-wizard-theme="${scope}"]`),
    [theme, scope],
  );
  return (
    <PreviewTheme.Provider value={theme.theme}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: CSS generated from a bundled theme. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        data-wizard-theme={scope}
        className="min-h-full bg-background text-foreground"
      >
        {children}
      </div>
    </PreviewTheme.Provider>
  );
}

function SiteHeader({
  data,
  schoolName,
  nav,
  right,
}: {
  data: WizardData;
  schoolName: string;
  nav?: string;
  right?: string;
}) {
  const theme = useTheme();
  return (
    <div className="flex items-center gap-4 border-b border-border px-6 py-3.5">
      <span className="flex items-center gap-2">
        {data.brand.logo?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.brand.logo.url}
            alt=""
            className="size-6 rounded object-cover"
          />
        ) : null}
        <Header4 theme={theme}>{schoolName}</Header4>
      </span>
      {nav ? (
        <Text2 theme={theme} className="text-muted-foreground max-md:hidden">
          {nav}
        </Text2>
      ) : null}
      <Text2 theme={theme} className="ml-auto font-semibold">
        {right ?? "Join"}
      </Text2>
    </div>
  );
}

/** The school's homepage built only from what the creator entered. No sample copy. */
export function HomePreview({
  data,
  schoolName,
  fullUrl,
}: {
  data: WizardData;
  schoolName: string;
  fullUrl: string;
}) {
  return (
    <Browser url={fullUrl}>
      <ThemedSite themeId={data.brand.themeId}>
        <HomeBody data={data} schoolName={schoolName} />
      </ThemedSite>
    </Browser>
  );
}

function HomeBody({ data, schoolName }: { data: WizardData; schoolName: string }) {
  const theme = useTheme();
  const title = offerTitle(data);
  const desc = offerDescription(data);
  const cover = data.offer === "course" ? data.course.cover : null;
  const tagline = data.brand.tagline.trim();
  const cta =
    data.offer === "course"
      ? "Start learning"
      : data.offer === "community"
        ? "Join the community"
        : data.offer === "download"
          ? "Get the download"
          : "";
  const nav = !data.offer ? "" : data.offer === "community" ? "Community" : "Products";
  const section =
    data.offer === "course"
      ? "Courses"
      : data.offer === "community"
        ? "Community"
        : "Downloads";
  return (
    <>
      <SiteHeader data={data} schoolName={schoolName} nav={nav} />
      <div className="flex flex-col items-start gap-4 px-6 py-10">
        <Header1 theme={theme}>{tagline || schoolName}</Header1>
        {desc ? (
          <Text1 theme={theme} className="text-muted-foreground">
            {desc}
          </Text1>
        ) : null}
        {cta ? <Button theme={theme}>{cta}</Button> : null}
      </div>
      {title ? (
        <div className="flex flex-col gap-3 px-6 pb-8">
          <Header3 theme={theme}>{section}</Header3>
          <PageCard theme={theme} className="max-w-[240px] overflow-hidden">
            {cover?.url ? (
              <PageCardImage
                theme={theme}
                src={cover.url}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[16/9] w-full place-items-center bg-muted text-muted-foreground">
                <Users aria-hidden className="size-7" />
              </div>
            )}
            <PageCardContent theme={theme} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Header4 theme={theme}>{title}</Header4>
                <Badge variant="secondary" theme={theme}>
                  {isPaidOffer(data) ? "Price set after you go live" : "Free"}
                </Badge>
              </div>
            </PageCardContent>
          </PageCard>
        </div>
      ) : null}
      <div className="flex flex-col gap-3 bg-muted px-6 py-6">
        <Header4 theme={theme}>Get updates from {schoolName}</Header4>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[120px] flex-1">
            <Input theme={theme} readOnly tabIndex={-1} placeholder="Your name" />
          </div>
          <div className="min-w-[120px] flex-1">
            <Input theme={theme} readOnly tabIndex={-1} placeholder="Your email" />
          </div>
          <Button theme={theme}>Subscribe</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-5">
        <span className="flex flex-col">
          <Header4 theme={theme}>{schoolName}</Header4>
          {tagline ? (
            <Caption theme={theme} className="text-muted-foreground">
              {tagline}
            </Caption>
          ) : null}
        </span>
        <Caption theme={theme} className="text-muted-foreground">
          © {new Date().getFullYear()} {schoolName}
        </Caption>
      </div>
    </>
  );
}

/** The product or join page as a learner would see it. */
export function ProductPreview({
  data,
  schoolName,
  fullUrl,
}: {
  data: WizardData;
  schoolName: string;
  fullUrl: string;
}) {
  return (
    <Browser url={fullUrl} path={offerSharePath(data)}>
      <ThemedSite themeId={data.brand.themeId}>
        <ProductBody data={data} schoolName={schoolName} />
      </ThemedSite>
    </Browser>
  );
}

function ProductBody({ data, schoolName }: { data: WizardData; schoolName: string }) {
  const theme = useTheme();
  const paid = isPaidOffer(data);
  const files = data.download.files.filter((file) => file.status === "done");
  const cover = data.offer === "course" ? data.course.cover : null;
  return (
    <>
      <SiteHeader data={data} schoolName={schoolName} right="Sign in" />
      <div className="grid gap-6 px-6 py-8 md:grid-cols-[1fr_200px]">
        <div className="flex flex-col gap-3">
          {cover?.url ? (
            <PageCardImage
              theme={theme}
              src={cover.url}
              alt=""
              className="h-40 w-full object-cover"
            />
          ) : null}
          <Header2 theme={theme}>{offerTitleOr(data)}</Header2>
          {offerDescription(data) ? (
            <Text1 theme={theme} className="text-muted-foreground">
              {offerDescription(data)}
            </Text1>
          ) : null}
          {data.offer === "course" &&
          (data.course.lessonTitle.trim() || data.course.lessonBody.trim()) ? (
            <PageCard theme={theme}>
              <PageCardContent
                theme={theme}
                className="flex items-center justify-between gap-2"
              >
                <Text2 theme={theme}>
                  {data.course.lessonTitle.trim() || "First lesson"}
                </Text2>
                <Caption theme={theme} className="text-muted-foreground">
                  {data.course.lessonKind === "video" ? "Video" : "Text"}
                </Caption>
              </PageCardContent>
            </PageCard>
          ) : null}
          {data.offer === "download" && files.length
            ? files.map((file) => (
                <PageCard key={file.id} theme={theme}>
                  <PageCardContent theme={theme}>
                    <Text2 theme={theme}>{file.name}</Text2>
                  </PageCardContent>
                </PageCard>
              ))
            : null}
          {data.offer === "community" ? (
            <Text2 theme={theme} className="text-muted-foreground">
              {data.community.join === "request"
                ? "Membership is by request. You approve each person."
                : "Join instantly and start posting."}
            </Text2>
          ) : null}
        </div>
        <PageCard theme={theme} className="h-fit">
          <PageCardContent theme={theme} className="flex flex-col gap-3">
            <Header3 theme={theme}>
              {paid ? "Price set after you go live" : "Free"}
            </Header3>
            <Button theme={theme}>{buyCta(data)}</Button>
            {data.offer === "community" && data.community.join === "request" ? (
              <Caption theme={theme} className="text-muted-foreground">
                You&apos;ll be asked: {data.community.question}
              </Caption>
            ) : null}
          </PageCardContent>
        </PageCard>
      </div>
    </>
  );
}

export function WirePreview({ data, fullUrl }: { data: WizardData; fullUrl: string }) {
  const wire = {
    course: {
      cap: "Course page",
      path: "/p/…",
      rows: ["Lesson", "Lesson", "Lesson"],
      block: true,
      note: "Next: a title, a first lesson and a price. About three minutes.",
    },
    community: {
      cap: "Join page",
      path: "/join",
      rows: ["Introductions", "Questions", "Show your work"],
      block: false,
      note: "Next: who can join, the price and a welcome message. About two minutes.",
    },
    download: {
      cap: "Download page",
      path: "/p/…",
      rows: ["File", "File"],
      block: true,
      note: "Next: upload your files and set a price. About two minutes.",
    },
  }[data.offer ?? "course"];
  return (
    <>
      <Browser url={fullUrl} path={wire.path}>
        <div className="flex flex-col gap-3 p-6">
          <span className="font-mono text-[11.5px] uppercase tracking-wide text-muted-foreground">
            {wire.cap}
          </span>
          {wire.block ? <div className="h-28 rounded-xl bg-muted" /> : null}
          <div className="h-3.5 w-3/5 rounded-md bg-muted" />
          <div className="h-2.5 rounded-md bg-muted" />
          <div className="h-2.5 w-4/5 rounded-md bg-muted" />
          <div className="h-9 w-32 rounded-[var(--radius)] bg-[var(--primary-soft)]" />
          {wire.rows.map((row, index) => (
            <div
              key={`${row}-${index}`}
              className="flex items-center gap-2.5 rounded-[10px] border border-border px-3 py-2.5"
            >
              <span className="size-4 rounded bg-muted" />
              <span className="h-2.5 flex-1 rounded-md bg-muted" />
              <span className="text-xs text-muted-foreground">{row}</span>
            </div>
          ))}
        </div>
      </Browser>
      <p className="text-[12.5px] text-muted-foreground">{wire.note}</p>
    </>
  );
}

export function UsesPreview({ name }: { name: string }) {
  const shown = name.trim() || "Your name";
  const initials = shown
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const Label = ({ children }: { children: ReactNode }) => (
    <span className="font-mono text-[11.5px] uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
  return (
    <div className="grid gap-4 xl:grid-cols-2 max-[1180px]:grid-cols-1">
      <div className="flex flex-col gap-2">
        <Label>In your emails</Label>
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>From {shown}</span>
            <span>Today</span>
          </div>
          <div className="h-2.5 rounded-md bg-muted" />
          <div className="h-2.5 w-[70%] rounded-md bg-muted" />
          <div className="text-sm font-semibold">{shown}</div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>In your community</Label>
        <div className="flex gap-3 rounded-2xl border border-border bg-card p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-xs font-bold text-primary">
            {initials}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <b>{shown}</b>
              <span className="rounded-full bg-[var(--primary-soft)] px-2 text-xs font-semibold text-primary">
                Creator
              </span>
            </div>
            <div className="h-2.5 rounded-md bg-muted" />
            <div className="h-2.5 w-[60%] rounded-md bg-muted" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 xl:col-span-2">
        <Label>On certificates</Label>
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-6 text-center">
          <b>Certificate of completion</b>
          <span className="text-[12.5px] text-muted-foreground">
            Awarded to a learner who finished your course
          </span>
          <div className="mt-3 flex w-full justify-between text-xs text-muted-foreground">
            <span>
              Course creator
              <b className="block text-sm text-foreground">{shown}</b>
            </span>
            <span>
              Date
              <b className="block text-sm text-foreground">Completion date</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmailPreview({
  data,
  schoolName,
}: {
  data: WizardData;
  schoolName: string;
}) {
  const sender = data.email.sender.trim() || schoolName;
  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border p-4">
          <span className="grid size-10 place-items-center rounded-full bg-[var(--primary-soft)] font-bold text-primary">
            {schoolName[0]?.toUpperCase()}
          </span>
          <div className="flex flex-col text-sm">
            <b>{sender}</b>
            <span className="text-muted-foreground">to a contact of {schoolName}</span>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">Today</span>
        </div>
        <div aria-hidden className="flex flex-col gap-2.5 p-5">
          <div className="h-3.5 w-2/5 rounded-md bg-muted" />
          <div className="h-2.5 rounded-md bg-muted" />
          <div className="h-2.5 rounded-md bg-muted" />
          <div className="h-2.5 w-3/4 rounded-md bg-muted" />
          <div className="mt-2 h-9 w-[120px] rounded-[9px] bg-[var(--primary-soft)]" />
        </div>
        <div className="flex flex-col gap-1 border-t border-border bg-muted/50 p-4 text-xs text-muted-foreground">
          <span>{schoolName}</span>
          <span className="whitespace-pre-line">{addressPreview(data.email)}</span>
          <span>
            <u>Unsubscribe</u> · <u>Update preferences</u>
          </span>
        </div>
      </div>
      <p className="text-[12.5px] text-muted-foreground">
        Every marketing email gets this footer automatically.
      </p>
    </>
  );
}

export function PreviewFrame({
  title,
  badge,
  open,
  onClose,
  children,
}: {
  title: string;
  badge?: ReactNode;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex min-h-0 flex-col gap-3 overflow-auto bg-muted/40 p-6",
        open
          ? "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-14 max-md:z-40 max-md:rounded-t-2xl max-md:border-t max-md:border-border max-md:bg-background max-md:p-4 max-md:shadow-2xl"
          : "max-md:hidden",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm">{title}</b>
        <span className="flex items-center gap-2">
          {badge}
          <button
            type="button"
            aria-label="Close preview"
            onClick={onClose}
            className="hidden size-9 place-items-center rounded-[var(--radius)] text-muted-foreground hover:bg-muted max-md:grid"
          >
            ×
          </button>
        </span>
      </div>
      {children}
    </section>
  );
}
