"use client";

import { formatMoney } from "@courselit/api-contract/money";
import {
  AlignLeft,
  BookOpen,
  Check,
  CircleAlert,
  CircleX,
  Clock,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Globe,
  ImageIcon,
  Mail,
  MessageSquare,
  Upload,
  Users,
  Video,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/codelit/button";
import { Input } from "@/components/ui/codelit/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { Textarea } from "@/components/ui/codelit/textarea";
import { cn } from "@/lib/utils";
import type { BillingCatalog } from "./api";
import {
  buildCopy,
  COUNTRIES,
  CURRENCIES,
  domainExample,
  type FieldErrors,
  formatBytes,
  isPaidOffer,
  type JoinMode,
  LANGUAGES,
  laterItems,
  liveSubtitle,
  type OfferKind,
  offerSharePath,
  offerTitleOr,
  paidNoteKind,
  type SubdomainStatus,
  shareLabel,
  type UploadedFile,
  type WizardData,
} from "./flow";
import { WizardImagePicker } from "./image-picker";
import { THEME_PRESETS } from "./themes";
import {
  CopyRow,
  DropZone,
  FieldBlock,
  FileRow,
  Hint,
  Note,
  ProgressList,
  type RowState,
  Seg,
  Spinner,
  StepHeader,
  Tile,
  useCopy,
} from "./ui";

const COVER_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export type UploadSlot = "cover" | "video" | "file" | "logo";

export type StepCtx = {
  data: WizardData;
  patch: (patch: Partial<WizardData>) => void;
  errors: FieldErrors;
  disabled: boolean;
};

// ----------------------------------------------------------------------- about

export function AboutStep({
  name,
  onName,
  email,
  error,
}: {
  name: string;
  onName: (value: string) => void;
  email: string;
  error?: string;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Welcome to CourseLit"
        title="First, what should we call you?"
        sub="Your name goes on your emails, your community posts and the certificates you issue."
      />
      <FieldBlock
        label="Your name"
        htmlFor="f-name"
        error={error}
        hint="Use the name your learners know you by."
      >
        <Input
          id="f-name"
          autoComplete="name"
          placeholder="e.g. Maya Patel"
          value={name}
          aria-invalid={Boolean(error)}
          onChange={(event) => onName(event.target.value)}
        />
      </FieldBlock>
      {email ? <Hint>Signed in as {email}</Hint> : null}
    </>
  );
}

// ---------------------------------------------------------------------- school

export function SchoolStep({
  ctx,
  siteDomain,
  availability,
  suggestions,
  onName,
  onSubdomain,
  onPickSuggestion,
  creating,
  createReady,
  locked,
  rows,
  onRetry,
  createError,
}: {
  ctx: StepCtx;
  siteDomain: string;
  availability: SubdomainStatus;
  suggestions: string[];
  onName: (value: string) => void;
  onSubdomain: (value: string) => void;
  onPickSuggestion: (value: string) => void;
  creating: boolean;
  createReady: boolean;
  /** The school exists already, so its name and address can't change here. */
  locked: boolean;
  rows: Array<{ key: string; name: string; desc: ReactNode; state: RowState }>;
  onRetry: () => void;
  createError: string | null;
}) {
  const { data, patch, errors, disabled } = ctx;
  const fullUrl = `${data.subdomain || "your-school"}.${siteDomain}`;
  const badAddress =
    Boolean(errors.subdomain) || availability === "taken" || availability === "invalid";
  if (creating) {
    return (
      <>
        <StepHeader
          eyebrow="Your school"
          title={`Setting up ${data.school.trim() || "your school"}`}
          sub={
            createReady
              ? "Your school is ready. Have a look, then continue."
              : "We're creating your school from everything you've entered."
          }
        />
        <ProgressList rows={rows} onRetry={onRetry} />
        {createError ? (
          <Note
            tone="bad"
            role="alert"
            icon={<CircleAlert aria-hidden className="size-4" />}
          >
            {createError}
          </Note>
        ) : null}
      </>
    );
  }
  return (
    <>
      <StepHeader
        eyebrow="Your school"
        title="Name your school"
        sub="Your school is your business on CourseLit. It gets its own website, community and email."
      />
      <div className="flex flex-col gap-4">
        <FieldBlock label="School name" htmlFor="f-school" error={errors.school}>
          <Input
            id="f-school"
            placeholder="e.g. Inkwell Studio"
            value={data.school}
            disabled={disabled || locked}
            aria-invalid={Boolean(errors.school)}
            onChange={(event) => onName(event.target.value)}
          />
        </FieldBlock>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-sub" className="text-[13px] font-semibold">
            Site address
          </label>
          <div
            className={cn(
              "flex items-stretch overflow-hidden rounded-[var(--radius)] border border-input bg-card focus-within:border-ring focus-within:shadow-[0_0_0_3px_var(--primary-soft)]",
              badAddress && "border-destructive",
            )}
          >
            <input
              id="f-sub"
              data-slot="input-bare"
              className="h-10 min-w-0 flex-1 bg-transparent px-3 font-mono text-sm outline-none"
              autoCapitalize="off"
              spellCheck={false}
              value={data.subdomain}
              aria-describedby="sub-status"
              aria-invalid={badAddress}
              disabled={disabled || locked}
              onChange={(event) => onSubdomain(event.target.value)}
            />
            <span className="grid place-items-center border-l border-input bg-muted/50 px-3 font-mono text-[13px] text-muted-foreground">
              .{siteDomain}
            </span>
          </div>
          <div id="sub-status" role="status" className="text-[12.5px]">
            {availability === "checking" ? (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Spinner className="size-3.5" />
                Checking {fullUrl}…
              </p>
            ) : null}
            {availability === "ok" && !errors.subdomain ? (
              <p className="flex items-center gap-1.5 text-[oklch(0.44_0.12_150)]">
                <Check aria-hidden className="size-3.5" strokeWidth={2.6} />
                <span className="font-mono">{fullUrl}</span> is yours to take
              </p>
            ) : null}
            {availability === "taken" ? (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-destructive">
                  <CircleX aria-hidden className="size-3.5" />
                  {fullUrl} is taken.{suggestions.length ? " Try one of these:" : ""}
                </p>
                {suggestions.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => onPickSuggestion(suggestion)}
                        className="inline-flex h-[30px] items-center rounded-full border border-input bg-card px-2.5 font-mono text-[13px] hover:border-primary hover:text-primary"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {availability === "invalid" || errors.subdomain ? (
              availability !== "taken" ? (
                <p className="text-destructive">
                  Use 3 to 63 lowercase letters, numbers and single hyphens.
                </p>
              ) : null
            ) : null}
          </div>
          <Note
            tone="info"
            className="mt-1 py-2.5 text-[13.5px]"
            icon={<Globe aria-hidden className="size-4" />}
          >
            <b>Have your own domain?</b> Connect one like{" "}
            <span className="font-mono">learn.{domainExample(data.subdomain)}.com</span>{" "}
            any time after setup.
          </Note>
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <FieldBlock
            label="Currency"
            htmlFor="f-cur"
            hint="Sets the prices learners see."
          >
            <Select
              value={data.currency}
              disabled={locked}
              onValueChange={(value) => patch({ currency: value })}
            >
              <SelectTrigger id="f-cur" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
          <FieldBlock
            label="Language"
            htmlFor="f-lang"
            hint="For your site and learner emails."
          >
            <Select
              value={data.locale}
              disabled={locked}
              onValueChange={(value) => patch({ locale: value })}
            >
              <SelectTrigger id="f-lang" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
        </div>
        {locked ? (
          <Note tone="info" className="py-2.5 text-[13.5px]">
            Your school is already created, so its name, address, currency and language
            are fixed here. Continue to pick up where you left off.
          </Note>
        ) : null}
      </div>
    </>
  );
}

// ----------------------------------------------------------------------- offer

const OFFER_TILES: Array<{
  key: OfferKind;
  name: string;
  desc: string;
  icon: ReactNode;
}> = [
  {
    key: "community",
    name: "A community",
    desc: "Bring people together, free or paid.",
    icon: <Users aria-hidden className="size-5" />,
  },
  {
    key: "course",
    name: "A course",
    desc: "Teach with lessons and videos.",
    icon: <BookOpen aria-hidden className="size-5" />,
  },
  {
    key: "download",
    name: "A download",
    desc: "Sell or give away files.",
    icon: <Download aria-hidden className="size-5" />,
  },
];

export function OfferStep({
  offer,
  onPick,
  onDecideLater,
}: {
  offer: OfferKind | null;
  onPick: (offer: OfferKind) => void;
  onDecideLater: () => void;
}) {
  return (
    <>
      <StepHeader
        eyebrow="Your first offer"
        title="What do you want to offer first?"
        sub="Start with one. You can add the others whenever you like."
      />
      <div role="radiogroup" aria-label="First offer" className="grid gap-3">
        {OFFER_TILES.map((tile) => (
          <Tile
            key={tile.key}
            name="offer"
            checked={offer === tile.key}
            onChange={() => onPick(tile.key)}
            icon={tile.icon}
            title={tile.name}
            desc={tile.desc}
          />
        ))}
      </div>
      <div>
        <Button type="button" variant="ghost" onClick={onDecideLater}>
          I&apos;ll decide later
        </Button>
      </div>
    </>
  );
}

// ----------------------------------------------------------------------- build

function PriceSection({
  data,
  patch,
  freeHint,
  disabled,
}: {
  data: WizardData;
  patch: (patch: Partial<WizardData>) => void;
  freeHint?: ReactNode;
  disabled: boolean;
}) {
  const paid = data.price === "paid";
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <h2 className="text-base font-semibold">Price</h2>
      <Seg
        label="Price"
        value={data.price}
        onChange={(price) => !disabled && patch({ price })}
        options={[
          { value: "free", label: "Free" },
          { value: "paid", label: "Paid" },
        ]}
      />
      {paid ? (
        <Note tone="info" icon={<CreditCard aria-hidden className="size-4" />}>
          <b>Set the price once you&apos;re live.</b> Connect Stripe, Razorpay or
          LemonSqueezy from your dashboard, then add a {paidNoteKind(data.offer)}. Until
          then, {offerTitleOr(data) || "your offer"} stays hidden from your site.
        </Note>
      ) : (
        freeHint
      )}
    </section>
  );
}

export function UploadErrorList({ files }: { files: UploadedFile[] }) {
  const failed = files.filter((file) => file.status === "error");
  if (!failed.length) return null;
  return (
    <p role="alert" className="text-[12.5px] text-destructive">
      {failed.length === 1
        ? `${failed[0].name} couldn't be uploaded.`
        : `${failed.length} files couldn't be uploaded.`}
    </p>
  );
}

function SingleUpload({
  file,
  label,
  accept,
  icon,
  title,
  sub,
  doneMeta,
  onFiles,
  onRemove,
  thumbImage,
  disabled,
}: {
  file: UploadedFile | null;
  label: string;
  accept: string;
  icon: ReactNode;
  title: string;
  sub: string;
  doneMeta: (file: UploadedFile) => string;
  onFiles: (files: File[]) => void;
  onRemove: () => void;
  thumbImage?: boolean;
  disabled?: boolean;
}) {
  if (!file || file.status === "error") {
    return (
      <div className="flex flex-col gap-2">
        <DropZone
          icon={icon}
          title={title}
          sub={sub}
          accept={accept}
          onFiles={onFiles}
          disabled={disabled}
        />
        {file?.status === "error" ? (
          <p role="alert" className="text-[12.5px] text-destructive">
            {file.error ?? "That upload didn't finish. Try again."}
          </p>
        ) : null}
      </div>
    );
  }
  const uploading = file.status === "uploading";
  return (
    <FileRow
      name={file.name}
      meta={uploading ? `Uploading · ${Math.round(file.pct)}%` : doneMeta(file)}
      pct={uploading ? file.pct : undefined}
      thumb={
        thumbImage && (file.thumbnailUrl || file.url) ? (
          <img
            src={file.thumbnailUrl ?? file.url ?? ""}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          icon
        )
      }
      action={
        uploading ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Cancel ${label}`}
            onClick={onRemove}
          >
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        )
      }
    />
  );
}

export function BuildStep({
  ctx,
  schoolId,
  onUpload,
  onSelectImage,
  onRemoveUpload,
}: {
  ctx: StepCtx;
  schoolId: string | null;
  onUpload: (slot: UploadSlot, files: File[]) => void;
  onSelectImage: (slot: "cover" | "logo", file: UploadedFile) => void;
  onRemoveUpload: (slot: UploadSlot, id?: string) => void;
}) {
  const { data, patch, errors, disabled } = ctx;
  const copy = buildCopy(data.offer);
  const course = data.course;
  const community = data.community;
  const download = data.download;
  return (
    <>
      <StepHeader eyebrow={copy.eyebrow} title={copy.title} sub={copy.sub} />

      {data.offer === "course" ? (
        <>
          <div className="flex flex-col gap-4">
            <FieldBlock label="Course title" htmlFor="c-title" error={errors.title}>
              <Input
                id="c-title"
                placeholder="e.g. Watercolour Basics"
                value={course.title}
                aria-invalid={Boolean(errors.title)}
                disabled={disabled}
                onChange={(event) =>
                  patch({ course: { ...course, title: event.target.value } })
                }
              />
            </FieldBlock>
            <FieldBlock
              label="Short description"
              htmlFor="c-desc"
              aside={`${course.description.length} / 160`}
            >
              <Textarea
                id="c-desc"
                rows={2}
                className="min-h-[72px]"
                maxLength={160}
                placeholder="One or two sentences on what learners will be able to do"
                value={course.description}
                disabled={disabled}
                onChange={(event) =>
                  patch({
                    course: {
                      ...course,
                      description: event.target.value.slice(0, 160),
                    },
                  })
                }
              />
            </FieldBlock>
            <FieldBlock label="Cover image" aside="Optional">
              {course.cover ? (
                <SingleUpload
                  file={course.cover}
                  label="cover upload"
                  accept={COVER_TYPES.join(",")}
                  icon={<ImageIcon aria-hidden className="size-4" />}
                  title="Upload a cover image"
                  sub="JPG or PNG, 1600 by 900 works best."
                  doneMeta={(file) => formatBytes(file.size)}
                  thumbImage
                  disabled={disabled}
                  onFiles={() => undefined}
                  onRemove={() => onRemoveUpload("cover")}
                />
              ) : (
                <WizardImagePicker
                  schoolId={schoolId}
                  purpose="product_artwork"
                  title="Select a cover image"
                  acceptedTypes={COVER_TYPES}
                  disabled={disabled}
                  onPick={(file) => onSelectImage("cover", file)}
                >
                  <Button type="button" variant="outline" className="w-fit">
                    <ImageIcon aria-hidden className="size-4" />
                    Upload a cover image
                  </Button>
                </WizardImagePicker>
              )}
            </FieldBlock>
          </div>
          <section className="flex flex-col gap-3 border-t border-border pt-5">
            <h2 className="text-base font-semibold">First lesson</h2>
            <FieldBlock label="Lesson title" htmlFor="l-title">
              <Input
                id="l-title"
                placeholder="e.g. Your palette and brushes"
                value={course.lessonTitle}
                disabled={disabled}
                onChange={(event) =>
                  patch({ course: { ...course, lessonTitle: event.target.value } })
                }
              />
            </FieldBlock>
            <Seg
              label="Lesson type"
              value={course.lessonKind}
              onChange={(lessonKind) => patch({ course: { ...course, lessonKind } })}
              options={[
                {
                  value: "text",
                  label: (
                    <>
                      <AlignLeft aria-hidden className="size-3.5" />
                      Text
                    </>
                  ),
                },
                {
                  value: "video",
                  label: (
                    <>
                      <Video aria-hidden className="size-3.5" />
                      Video
                    </>
                  ),
                },
              ]}
            />
            {course.lessonKind === "text" ? (
              <FieldBlock label="Lesson text" htmlFor="l-body">
                <Textarea
                  id="l-body"
                  rows={4}
                  placeholder="Write the lesson, or paste it in"
                  value={course.lessonBody}
                  disabled={disabled}
                  onChange={(event) =>
                    patch({ course: { ...course, lessonBody: event.target.value } })
                  }
                />
              </FieldBlock>
            ) : (
              <SingleUpload
                file={course.video}
                label="video upload"
                accept="video/*"
                icon={<Video aria-hidden className="size-4" />}
                title="Upload a video"
                sub="MP4 or MOV. Larger videos take a little while to upload."
                doneMeta={(file) => formatBytes(file.size)}
                disabled={disabled}
                onFiles={(files) => onUpload("video", files)}
                onRemove={() => onRemoveUpload("video")}
              />
            )}
            <Hint>
              This lesson is published as soon as you continue, so learners can start
              straight away.
            </Hint>
          </section>
          <PriceSection
            data={data}
            patch={patch}
            disabled={disabled}
            freeHint={<Hint>Anyone can enrol after signing up with their email.</Hint>}
          />
        </>
      ) : null}

      {data.offer === "community" ? (
        <>
          <div className="flex flex-col gap-4">
            <FieldBlock label="Community name" htmlFor="m-name" error={errors.title}>
              <Input
                id="m-name"
                value={community.name}
                aria-invalid={Boolean(errors.title)}
                disabled={disabled}
                onChange={(event) =>
                  patch({ community: { ...community, name: event.target.value } })
                }
              />
            </FieldBlock>
            <FieldBlock label="Description" htmlFor="m-desc">
              <Textarea
                id="m-desc"
                rows={2}
                className="min-h-[72px]"
                value={community.description}
                disabled={disabled}
                onChange={(event) =>
                  patch({
                    community: { ...community, description: event.target.value },
                  })
                }
              />
            </FieldBlock>
          </div>
          <section className="flex flex-col gap-3 border-t border-border pt-5">
            <h2 className="text-base font-semibold">Who can join</h2>
            <div role="radiogroup" aria-label="Who can join" className="grid gap-3">
              {(
                [
                  [
                    "any",
                    "Anyone, instantly",
                    "People join as soon as they sign up or pay.",
                  ],
                  [
                    "request",
                    "By request",
                    "People answer a question, then you approve them.",
                  ],
                ] as Array<[JoinMode, string, string]>
              ).map(([join, title, desc]) => (
                <Tile
                  key={join}
                  name="join"
                  checked={community.join === join}
                  onChange={() => patch({ community: { ...community, join } })}
                  title={title}
                  desc={desc}
                />
              ))}
            </div>
            {community.join === "request" ? (
              <FieldBlock
                label="Question for applicants"
                htmlFor="m-q"
                error={errors.question}
              >
                <Input
                  id="m-q"
                  value={community.question}
                  aria-invalid={Boolean(errors.question)}
                  onChange={(event) =>
                    patch({ community: { ...community, question: event.target.value } })
                  }
                />
              </FieldBlock>
            ) : null}
          </section>
          <PriceSection data={data} patch={patch} disabled={disabled} />
          <section className="flex flex-col gap-3 border-t border-border pt-5">
            <FieldBlock
              label="Welcome message"
              htmlFor="m-wel"
              aside="New members see this first"
            >
              <Textarea
                id="m-wel"
                rows={3}
                value={community.welcome}
                disabled={disabled}
                onChange={(event) =>
                  patch({ community: { ...community, welcome: event.target.value } })
                }
              />
            </FieldBlock>
          </section>
        </>
      ) : null}

      {data.offer === "download" ? (
        <>
          <div className="flex flex-col gap-4">
            <FieldBlock label="Title" htmlFor="d-title" error={errors.title}>
              <Input
                id="d-title"
                placeholder="e.g. The six-colour palette guide"
                value={download.title}
                aria-invalid={Boolean(errors.title)}
                disabled={disabled}
                onChange={(event) =>
                  patch({ download: { ...download, title: event.target.value } })
                }
              />
            </FieldBlock>
            <FieldBlock label="Description" htmlFor="d-desc">
              <Textarea
                id="d-desc"
                rows={2}
                className="min-h-[72px]"
                value={download.description}
                disabled={disabled}
                onChange={(event) =>
                  patch({ download: { ...download, description: event.target.value } })
                }
              />
            </FieldBlock>
            <FieldBlock label="Files" error={errors.files}>
              <div className="flex flex-col gap-2">
                {download.files.map((file) => (
                  <FileRow
                    key={file.id}
                    name={file.name}
                    meta={
                      file.status === "uploading"
                        ? `Uploading · ${Math.round(file.pct)}%`
                        : formatBytes(file.size)
                    }
                    pct={file.status === "uploading" ? file.pct : undefined}
                    error={
                      file.status === "error" ? (file.error ?? "Upload failed") : null
                    }
                    thumb={<FileText aria-hidden className="size-4" />}
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveUpload("file", file.id)}
                      >
                        {file.status === "uploading" ? "Cancel" : "Remove"}
                      </Button>
                    }
                  />
                ))}
                <DropZone
                  icon={<Upload aria-hidden className="size-4" />}
                  title="Add files"
                  sub="PDF, ZIP, audio or images. Learners get every file here."
                  multiple
                  disabled={disabled}
                  onFiles={(files) => onUpload("file", files)}
                />
              </div>
            </FieldBlock>
          </div>
          <PriceSection
            data={data}
            patch={patch}
            disabled={disabled}
            freeHint={
              <Note tone="info" icon={<Mail aria-hidden className="size-4" />}>
                <b>A good lead magnet.</b> People sign up with their email to get it, so
                they join your contacts.
              </Note>
            }
          />
        </>
      ) : null}
    </>
  );
}

// ----------------------------------------------------------------------- brand

export function BrandStep({
  ctx,
  schoolId,
  onSelectImage,
  onRemoveUpload,
}: {
  ctx: StepCtx;
  schoolId: string | null;
  onSelectImage: (slot: "cover" | "logo", file: UploadedFile) => void;
  onRemoveUpload: (slot: UploadSlot, id?: string) => void;
}) {
  const { data, patch } = ctx;
  const logo = data.brand.logo;
  const hasLogo = logo?.status === "done" && logo.url;
  const uploading = logo?.status === "uploading";
  return (
    <>
      <StepHeader
        eyebrow="Your site"
        title="Make it yours"
        sub="Your homepage is built only from what you add here. No sample text, nothing to clean up later."
      />
      <FieldBlock label="Logo" aside="Optional">
        <div className="flex items-center gap-4">
          <span className="grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-muted/50 text-muted-foreground">
            {hasLogo ? (
              <img
                src={logo?.url ?? ""}
                alt="Logo preview"
                className="size-full object-contain"
              />
            ) : (
              <ImageIcon aria-hidden className="size-5" />
            )}
          </span>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <WizardImagePicker
                schoolId={schoolId}
                purpose="school_branding"
                title="Select your logo"
                acceptedTypes={LOGO_TYPES}
                onPick={(file) => onSelectImage("logo", file)}
              >
                <Button type="button" variant="outline" size="sm">
                  {hasLogo ? "Replace" : "Upload logo"}
                </Button>
              </WizardImagePicker>
              {hasLogo || uploading ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveUpload("logo")}
                >
                  {uploading ? "Cancel" : "Remove"}
                </Button>
              ) : null}
            </div>
            <Hint>
              {logo?.status === "error"
                ? (logo.error ?? "That upload didn't finish. Try again.")
                : hasLogo
                  ? logo?.name
                  : uploading
                    ? `Uploading · ${Math.round(logo?.pct ?? 0)}%`
                    : "PNG or SVG. Without one, your school's name is shown."}
            </Hint>
          </div>
        </div>
      </FieldBlock>
      <FieldBlock
        label="Theme"
        aside="Fine-tune colours and fonts later in the page editor"
      >
        <div
          role="radiogroup"
          aria-label="Theme"
          className="grid grid-cols-3 gap-3 max-md:grid-cols-2"
        >
          {THEME_PRESETS.map((preset) => (
            <Tile
              key={preset.id}
              name="theme"
              checked={data.brand.themeId === preset.id}
              onChange={() => patch({ brand: { ...data.brand, themeId: preset.id } })}
              title={preset.name}
              className="flex-col gap-2 p-3.5"
            >
              <span aria-hidden className="mt-1 flex gap-1.5">
                {preset.dots.map((dot, index) => (
                  <i
                    key={`${dot}-${index}`}
                    className="size-4 rounded-full border border-black/10"
                    style={{ background: dot }}
                  />
                ))}
              </span>
            </Tile>
          ))}
        </div>
      </FieldBlock>
      <FieldBlock
        label="Tagline"
        htmlFor="b-tag"
        aside={`${data.brand.tagline.length} / 90`}
        hint="Shown under your school's name on the homepage."
      >
        <Input
          id="b-tag"
          placeholder="One line about your school"
          maxLength={90}
          value={data.brand.tagline}
          onChange={(event) =>
            patch({
              brand: { ...data.brand, tagline: event.target.value.slice(0, 90) },
            })
          }
        />
      </FieldBlock>
    </>
  );
}

// ----------------------------------------------------------------------- email

export function EmailStep({ ctx }: { ctx: StepCtx }) {
  const { data, patch, errors, disabled } = ctx;
  const email = data.email;
  const set = (key: keyof typeof email, value: string) =>
    patch({ email: { ...email, [key]: value } });
  return (
    <>
      <StepHeader
        eyebrow="Email"
        title="Get ready to send email"
        sub="Anti-spam law requires a postal address in every marketing email. It appears in the footer of the emails you send."
      />
      <div className="flex flex-col gap-4">
        <FieldBlock label="Street address" htmlFor="e-l1" error={errors.address}>
          <Input
            id="e-l1"
            autoComplete="street-address"
            value={email.line1}
            disabled={disabled}
            aria-invalid={Boolean(errors.address)}
            onChange={(event) => set("line1", event.target.value)}
          />
        </FieldBlock>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <FieldBlock label="City" htmlFor="e-city">
            <Input
              id="e-city"
              autoComplete="address-level2"
              value={email.city}
              disabled={disabled}
              onChange={(event) => set("city", event.target.value)}
            />
          </FieldBlock>
          <FieldBlock label="State or region" htmlFor="e-reg" aside="Optional">
            <Input
              id="e-reg"
              autoComplete="address-level1"
              value={email.region}
              disabled={disabled}
              onChange={(event) => set("region", event.target.value)}
            />
          </FieldBlock>
        </div>
        <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <FieldBlock label="Postal code" htmlFor="e-pc" error={errors.postal}>
            <Input
              id="e-pc"
              autoComplete="postal-code"
              value={email.postal}
              disabled={disabled}
              aria-invalid={Boolean(errors.postal)}
              onChange={(event) => set("postal", event.target.value)}
            />
          </FieldBlock>
          <FieldBlock label="Country" htmlFor="e-co">
            <Select
              value={email.country}
              onValueChange={(value) => set("country", value)}
            >
              <SelectTrigger id="e-co" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldBlock>
        </div>
        <Hint>
          A PO box or business address works too, if you&apos;d rather not share your
          home address.
        </Hint>
      </div>
      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <FieldBlock
          label="Sender name"
          htmlFor="e-from"
          hint="Who your emails say they're from."
        >
          <Input
            id="e-from"
            value={email.sender}
            disabled={disabled}
            onChange={(event) => set("sender", event.target.value)}
          />
        </FieldBlock>
      </section>
    </>
  );
}

// ------------------------------------------------------------------------ plan

function formatMinor(amountMinor: number, currency: string): string {
  return formatMoney(amountMinor, currency);
}

export function PlanStep({
  ctx,
  catalog,
  schoolName,
  fullUrl,
  cancelled,
  checkoutError,
  checkingOut,
  onOpenCheckout,
  onChangePlan,
  summaryRows,
  mode,
}: {
  ctx: StepCtx;
  catalog: BillingCatalog | null;
  schoolName: string;
  fullUrl: string;
  cancelled: boolean;
  checkoutError: string | null;
  checkingOut: boolean;
  onOpenCheckout: () => void;
  onChangePlan: () => void;
  summaryRows: Array<{ key: string; name: string; desc: ReactNode; state: RowState }>;
  mode: "form" | "checkout";
}) {
  const { data, patch } = ctx;
  const selected = catalog?.offers.find(
    (offer) => offer.plan === data.plan.plan && offer.interval === data.plan.interval,
  );
  if (mode === "checkout") {
    return (
      <>
        <StepHeader
          eyebrow="Your CourseLit plan"
          title="Taking you to checkout"
          sub={`Pay for your CourseLit plan on our secure checkout page. When you're back, ${schoolName} goes live.`}
        />
        <ul className="flex flex-col gap-2">
          <li className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-3.5 py-3">
            <Globe aria-hidden className="size-4 text-muted-foreground" />
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-sm">{schoolName}</b>
              <span className="font-mono text-[13px] text-muted-foreground">
                {fullUrl}
              </span>
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-card px-3.5 py-3">
            <CreditCard aria-hidden className="size-4 text-muted-foreground" />
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-sm capitalize">
                {data.plan.plan} plan, billed{" "}
                {data.plan.interval === "month" ? "monthly" : "yearly"}
              </b>
              <span className="text-[13px] text-muted-foreground">
                {selected?.trialDays
                  ? `${selected.trialDays}-day free trial, then billed ${data.plan.interval === "month" ? "monthly" : "yearly"}`
                  : "Billed on the checkout page"}
              </span>
            </span>
            {selected ? (
              <span className="font-semibold">
                {formatMinor(selected.amountMinor, selected.currency)}
              </span>
            ) : null}
          </li>
        </ul>
        {checkoutError ? (
          <Note
            tone="bad"
            role="alert"
            icon={<CircleAlert aria-hidden className="size-4" />}
          >
            {checkoutError}
          </Note>
        ) : (
          <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <Spinner className="size-3.5" />
            Opening the checkout page in this tab…
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onOpenCheckout} disabled={checkingOut}>
            Open checkout
            <ExternalLink aria-hidden className="size-4" />
          </Button>
          <Button type="button" variant="ghost" onClick={onChangePlan}>
            Change plan
          </Button>
        </div>
      </>
    );
  }
  return (
    <>
      {cancelled ? (
        <Note
          tone="warn"
          role="status"
          icon={<CircleAlert aria-hidden className="size-4" />}
        >
          <b>Checkout was cancelled.</b> You weren&apos;t charged, and your plan choice
          is as you left it.
        </Note>
      ) : null}
      <StepHeader
        eyebrow="Your CourseLit plan"
        title="Pick a plan to go live"
        sub={`${schoolName} is ready. Start a plan to put it online for learners.`}
      />
      <ProgressList rows={summaryRows} />
      <section className="flex flex-col gap-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Choose a plan</h2>
          <Seg
            label="Billing"
            value={data.plan.interval}
            onChange={(interval) => patch({ plan: { ...data.plan, interval } })}
            options={[
              { value: "month", label: "Monthly" },
              { value: "year", label: "Yearly" },
            ]}
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Plan"
          className="grid grid-cols-2 gap-3 max-md:grid-cols-1"
        >
          {(["pro", "business"] as const).map((plan) => {
            const offer = catalog?.offers.find(
              (item) => item.plan === plan && item.interval === data.plan.interval,
            );
            return (
              <Tile
                key={plan}
                name="plan"
                checked={data.plan.plan === plan}
                onChange={() => patch({ plan: { ...data.plan, plan } })}
                title={plan === "pro" ? "Pro" : "Business"}
                desc={offer ? undefined : "Price unavailable"}
              >
                {offer ? (
                  <>
                    <span className="text-lg font-bold text-foreground">
                      {formatMinor(offer.amountMinor, offer.currency)}{" "}
                      <small className="text-xs font-normal text-muted-foreground">
                        / {data.plan.interval === "month" ? "month" : "year"}
                      </small>
                    </span>
                    {offer.trialDays ? (
                      <span className="text-[13px] text-muted-foreground">
                        {offer.trialDays}-day free trial
                      </span>
                    ) : null}
                  </>
                ) : null}
              </Tile>
            );
          })}
        </div>
        {checkoutError ? (
          <Note
            tone="bad"
            role="alert"
            icon={<CircleAlert aria-hidden className="size-4" />}
          >
            {checkoutError}
          </Note>
        ) : (
          <Hint>
            You&apos;ll pay on the CourseLit checkout page, then come straight back here
            as your school goes live.
          </Hint>
        )}
      </section>
    </>
  );
}

// ------------------------------------------------------------------- going live

export function SetupStep({
  schoolName,
  rows,
  failed,
  allDone,
  paidConfirmed,
  planSummary,
  onRetry,
}: {
  schoolName: string;
  rows: Array<{ key: string; name: string; desc: ReactNode; state: RowState }>;
  failed: boolean;
  allDone: boolean;
  paidConfirmed: boolean;
  planSummary: string;
  onRetry: (key: string) => void;
}) {
  return (
    <>
      {paidConfirmed ? (
        <Note tone="ok" role="status" icon={<Check aria-hidden className="size-4" />}>
          <b>Payment confirmed.</b> {planSummary} for {schoolName}.
        </Note>
      ) : null}
      <StepHeader
        eyebrow="Going live"
        title={
          allDone
            ? `${schoolName} is live`
            : failed
              ? "Almost there"
              : `Setting up ${schoolName}`
        }
        sub={
          failed
            ? "Everything else is ready. Try again, or go live and finish it from your dashboard."
            : allDone
              ? "Everything you entered is online. Continue to see your site."
              : "We're putting everything you've entered online. It goes live as soon as this finishes."
        }
      />
      <ProgressList rows={rows} onRetry={onRetry} />
      {failed ? (
        <Hint>
          Your website and community are ready. If email keeps failing, you can carry on
          and we&apos;ll finish it in the background.
        </Hint>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------------ live

export function LiveStep({
  data,
  schoolName,
  siteUrl,
  aiConnected,
  aiName,
  onOpenAi,
}: {
  data: WizardData;
  schoolName: string;
  siteUrl: string;
  aiConnected: boolean;
  aiName: string;
  onOpenAi: () => void;
}) {
  const [copied, copy] = useCopy();
  const sharePath = offerSharePath(data);
  const shareUrl = `${siteUrl.replace(/\/$/, "")}${sharePath}`;
  const later = laterItems(data);
  return (
    <>
      <div className="flex flex-col gap-4">
        <span className="grid size-14 place-items-center rounded-full bg-[oklch(0.56_0.13_150/0.12)] text-[oklch(0.44_0.12_150)]">
          <Check aria-hidden className="size-7" strokeWidth={2.4} />
        </span>
        <StepHeader
          eyebrow="You're live"
          title={`${schoolName} is live`}
          sub={liveSubtitle(data)}
        />
      </div>
      <FieldBlock label="Your site">
        <CopyRow
          value={siteUrl}
          copied={copied === "site"}
          onCopy={() => copy("site", siteUrl)}
        >
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={siteUrl} target="_blank" rel="noreferrer">
              Open site
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          </Button>
        </CopyRow>
      </FieldBlock>
      {data.offer ? (
        <FieldBlock
          label={shareLabel(data.offer)}
          hint={
            isPaidOffer(data)
              ? `This link works once ${offerTitleOr(data)} has a price.`
              : undefined
          }
        >
          <CopyRow
            value={shareUrl}
            copied={copied === "offer"}
            onCopy={() => copy("offer", shareUrl)}
          />
        </FieldBlock>
      ) : null}
      {later.length ? (
        <section className="flex flex-col gap-2.5 border-t border-border pt-5">
          <h2 className="text-base font-semibold">Waiting on your dashboard</h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {later.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {aiConnected ? (
        <Note tone="ok" icon={<Check aria-hidden className="size-4" />}>
          <b>{aiName} is connected.</b> Manage it any time in Settings › AI assistants.
        </Note>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-soft)] text-primary">
            <MessageSquare aria-hidden className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="text-sm">Manage your school from Claude, ChatGPT or Cursor</b>
            <span className="text-[13px] text-muted-foreground">
              Draft lessons, add products and sort contacts from chat.
            </span>
          </span>
          <Button type="button" variant="soft" size="sm" onClick={onOpenAi}>
            Connect
          </Button>
        </div>
      )}
    </>
  );
}
