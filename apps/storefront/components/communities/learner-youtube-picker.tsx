"use client";

import { youtubeEmbedUrl } from "@courselit/api-contract/youtube";
import { X } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import {
  LearnerButton as Button,
  LearnerCaption,
  LearnerInput,
  LearnerLabel,
  LearnerPopover,
  LearnerPopoverContent,
  LearnerPopoverTrigger,
  LearnerTooltip,
  LearnerTooltipContent,
  LearnerTooltipTrigger,
} from "@/components/themed-page-builder";

export const MAX_POST_VIDEOS = 10;

/** A YouTube play-button mark, drawn in the current text color. */
export function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

/**
 * A composer button's hover label, so similar-looking actions read clearly.
 * Popover and dialog triggers go around it (`trigger`), with the tooltip
 * trigger nearest the button, so both get the button's events.
 */
export function ComposerTooltip({
  label,
  trigger: Trigger,
  children,
}: {
  label: string;
  trigger: (props: { children: ReactNode }) => ReactNode;
  children: ReactNode;
}) {
  return (
    <LearnerTooltip>
      <Trigger>
        <LearnerTooltipTrigger asChild>{children}</LearnerTooltipTrigger>
      </Trigger>
      <LearnerTooltipContent>{label}</LearnerTooltipContent>
    </LearnerTooltip>
  );
}

/** A popover trigger for `ComposerTooltip`. */
export function PopoverTriggerSlot({ children }: { children: ReactNode }) {
  return <LearnerPopoverTrigger asChild>{children}</LearnerPopoverTrigger>;
}

/** A button that adds a YouTube video to a post from a pasted link. */
export function LearnerYoutubePicker({
  onAdd,
  disabled = false,
  label,
}: {
  onAdd: (embedUrl: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Stop here so the post composer around this popover isn't submitted.
    event.stopPropagation();
    const embed = youtubeEmbedUrl(link);
    if (!embed) {
      setError("Paste a link to a YouTube video.");
      return;
    }
    onAdd(embed);
    setLink("");
    setError(null);
    setOpen(false);
  }

  const tooltip = disabled
    ? `A post can contain up to ${MAX_POST_VIDEOS} YouTube videos.`
    : "Add a YouTube video";

  return (
    <LearnerPopover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
      modal
    >
      <ComposerTooltip label={tooltip} trigger={PopoverTriggerSlot}>
        <Button
          type="button"
          variant={label ? "outline" : "ghost"}
          size={label ? "sm" : "icon"}
          disabled={disabled}
          aria-label="Add YouTube video"
        >
          <YoutubeIcon className="size-5" />
          {label ? <span>{label}</span> : null}
        </Button>
      </ComposerTooltip>
      <LearnerPopoverContent className="w-80" align="start">
        <form className="grid gap-3" onSubmit={add}>
          <LearnerLabel htmlFor="youtube-link">YouTube link</LearnerLabel>
          <LearnerInput
            id="youtube-link"
            value={link}
            onChange={(event) => {
              setLink(event.target.value);
              setError(null);
            }}
            placeholder="https://youtube.com/watch?v=…"
            aria-invalid={error ? true : undefined}
            autoFocus
          />
          {error ? (
            <LearnerCaption className="text-destructive" role="alert">
              {error}
            </LearnerCaption>
          ) : (
            <LearnerCaption className="text-muted-foreground">
              Learners watch it right in the post.
            </LearnerCaption>
          )}
          <Button type="submit" size="sm" disabled={!link.trim()}>
            Add video
          </Button>
        </form>
      </LearnerPopoverContent>
    </LearnerPopover>
  );
}

/** YouTube videos in a post. With `onRemove`, each video gets a remove button. */
export function LearnerPostVideos({
  urls,
  onRemove,
}: {
  urls: readonly string[];
  onRemove?: (url: string) => void;
}) {
  if (urls.length === 0) return null;
  return (
    <ul className="grid list-none gap-3 p-0" aria-label="YouTube videos">
      {urls.map((url) => (
        <li key={url} className="relative">
          <iframe
            src={url}
            title="YouTube video"
            className="aspect-video w-full rounded-[var(--radius)] border-0"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
          {onRemove ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 size-7"
              onClick={() => onRemove(url)}
              aria-label="Remove YouTube video"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Adds a video to a list, ignoring duplicates and the per-post limit. */
export function withVideo(urls: readonly string[], url: string): string[] {
  if (urls.includes(url) || urls.length >= MAX_POST_VIDEOS) return [...urls];
  return [...urls, url];
}
