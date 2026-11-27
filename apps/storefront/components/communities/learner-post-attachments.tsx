"use client";

import { FileText, Film, X } from "lucide-react";
import type { ReactNode } from "react";
import {
  LearnerButton as Button,
  LearnerCardImage,
  LearnerText2,
  LearnerCard as PageCard,
} from "@/components/themed-page-builder";

/** An uploaded file attached to a post or comment. */
export type PostAttachmentFile = {
  id: string;
  /** `image` and `video` get a preview; anything else shows as a file. */
  type: string;
  url: string;
  thumbnailUrl: string | null;
  name: string;
};

/**
 * Everything attached to a post or comment (files, GIFs, YouTube videos) in
 * one row of equal-height tiles that scrolls sideways, as on main. With the
 * remove handlers, each tile gets a remove button (the composer and editors).
 */
export function LearnerPostAttachments({
  files = [],
  gifUrls = [],
  videoUrls = [],
  onRemoveFile,
  onRemoveGif,
  onRemoveVideo,
}: {
  files?: readonly PostAttachmentFile[];
  gifUrls?: readonly string[];
  videoUrls?: readonly string[];
  onRemoveFile?: (id: string) => void;
  onRemoveGif?: (url: string) => void;
  onRemoveVideo?: (url: string) => void;
}) {
  if (files.length + gifUrls.length + videoUrls.length === 0) return null;
  return (
    <ul
      className="flex list-none gap-3 overflow-x-auto p-0 pb-2"
      aria-label="Attachments"
    >
      {files.map((file) => (
        <Tile
          key={file.id}
          removeLabel={`Remove ${file.name}`}
          onRemove={onRemoveFile ? () => onRemoveFile(file.id) : undefined}
        >
          <FileTile file={file} />
        </Tile>
      ))}
      {gifUrls.map((url) => (
        <Tile
          key={url}
          removeLabel="Remove GIF"
          onRemove={onRemoveGif ? () => onRemoveGif(url) : undefined}
        >
          <LearnerCardImage
            src={url}
            alt="GIF"
            loading="lazy"
            flush
            className="h-48 w-auto max-w-[20rem] object-cover"
          />
        </Tile>
      ))}
      {videoUrls.map((url) => (
        <Tile
          key={url}
          removeLabel="Remove YouTube video"
          onRemove={onRemoveVideo ? () => onRemoveVideo(url) : undefined}
        >
          <iframe
            src={url}
            title="YouTube video"
            className="block aspect-video h-48 border-0"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        </Tile>
      ))}
    </ul>
  );
}

function Tile({
  children,
  removeLabel,
  onRemove,
}: {
  children: ReactNode;
  removeLabel: string;
  onRemove?: () => void;
}) {
  return (
    <li className="relative shrink-0">
      <PageCard className="h-48 overflow-hidden">{children}</PageCard>
      {onRemove ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-2 right-2 size-7"
          onClick={onRemove}
          aria-label={removeLabel}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  );
}

function FileTile({ file }: { file: PostAttachmentFile }) {
  if (file.type === "image" && file.url) {
    return (
      <LearnerCardImage
        src={file.thumbnailUrl ?? file.url}
        alt={file.name}
        loading="lazy"
        flush
        className="h-48 w-auto max-w-[20rem] bg-muted object-cover"
      />
    );
  }
  if (file.type === "video") {
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        title={file.name}
        className="relative flex aspect-video h-48 items-center justify-center bg-muted hover:opacity-90"
        onClick={(event) => event.stopPropagation()}
      >
        {file.thumbnailUrl ? (
          <LearnerCardImage
            src={file.thumbnailUrl}
            alt={file.name}
            loading="lazy"
            flush
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <Film className="relative size-8 text-muted-foreground" aria-hidden="true" />
      </a>
    );
  }
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      title={file.name}
      className="flex h-48 w-36 flex-col justify-between gap-2 p-3 hover:bg-muted/40"
      onClick={(event) => event.stopPropagation()}
    >
      <FileText className="size-8 text-primary" aria-hidden="true" />
      <LearnerText2 component="span" className="line-clamp-3 break-all">
        {file.name}
      </LearnerText2>
    </a>
  );
}
