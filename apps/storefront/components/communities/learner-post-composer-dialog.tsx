"use client";

import {
  MediaUploadDialog,
  type MediaUploaderAdapters,
  type SelectedMedia,
} from "@frontlit/media-uploader";
import { Image as ImageIcon, Paperclip, Video, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import {
  LearnerButton as Button,
  LearnerDialog as Dialog,
  LearnerDialogContent as DialogContent,
  LearnerDialogFooter as DialogFooter,
  LearnerDialogHeader as DialogHeader,
  LearnerDialogTitle as DialogTitle,
  LearnerDialogTrigger as DialogTrigger,
  LearnerAvatar,
  LearnerAvatarFallback,
  LearnerInput,
  LearnerSelect,
  LearnerSelectContent,
  LearnerSelectItem,
  LearnerSelectTrigger,
  LearnerSelectValue,
} from "@/components/themed-page-builder";
import type { LearnerCommunityMedia } from "@/lib/community-media-uploader";
import { LearnerRichTextEditor } from "./learner-rich-text-editor";

type Destination = { id: string; name: string };

export type LearnerPostComposerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  learnerName: string;
  destinations: Destination[];
  destinationId: string;
  destinationLabel: string;
  destinationLocked: boolean;
  onDestinationChange: (destinationId: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  content: string;
  onContentChange: (content: string) => void;
  media: LearnerCommunityMedia[];
  mediaAdapters: MediaUploaderAdapters<LearnerCommunityMedia>;
  onMediaSelected: (selected: SelectedMedia<LearnerCommunityMedia>) => void;
  onMediaRemove: (id: string) => void;
  canSubmit: boolean;
  submitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function initials(name: string) {
  const value = name.trim();
  if (!value) return "L";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function LearnerPostComposerDialog({
  open,
  onOpenChange,
  trigger,
  learnerName,
  destinations,
  destinationId,
  destinationLabel,
  destinationLocked,
  onDestinationChange,
  title,
  onTitleChange,
  content,
  onContentChange,
  media,
  mediaAdapters,
  onMediaSelected,
  onMediaRemove,
  canSubmit,
  submitting,
  onSubmit,
}: LearnerPostComposerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className="max-h-[90vh] w-full gap-0 overflow-y-auto p-6 sm:max-w-4xl"
        overlayClassName="bg-black/75"
        closeClassName="top-5 right-5"
      >
        <DialogHeader className="pr-8">
          <div className="flex items-center gap-3">
            <LearnerAvatar className="size-12">
              <LearnerAvatarFallback>{initials(learnerName)}</LearnerAvatarFallback>
            </LearnerAvatar>
            <DialogTitle className="text-xl">{learnerName}</DialogTitle>
          </div>
        </DialogHeader>

        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <LearnerInput
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Title"
            aria-label="Post title"
            className="h-12"
          />
          <LearnerRichTextEditor
            key={open ? "composer-open" : "composer-closed"}
            initialContent={parseEditorContent(content)}
            onChange={(document) => onContentChange(JSON.stringify(document))}
            placeholder="What's on your mind?"
            showToolbar={false}
            className="rounded-none border border-input bg-background shadow-none"
            contentClassName="max-w-none"
            editorClassName="min-h-[200px] px-8 py-4 sm:px-16"
          />

          {media.length > 0 ? (
            <ul
              className="flex list-none flex-wrap gap-2 p-0"
              aria-label="Attached media"
            >
              {media.map((item) => (
                <li key={item.id}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onMediaRemove(item.id)}
                    aria-label={`Remove ${item.fileName}`}
                  >
                    <span className="max-w-48 truncate">{item.fileName}</span>
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-4">
            <MediaUploadDialog<LearnerCommunityMedia>
              {...mediaAdapters}
              title="Attach files"
              description="Add an image, video, or PDF to your post."
              acceptedTypes={["image/*", "video/*", "application/pdf"]}
              allowUnsplash={false}
              maxUploadBytes={100_000_000}
              onSelect={onMediaSelected}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Attach files"
              >
                <Paperclip className="size-5" aria-hidden="true" />
              </Button>
            </MediaUploadDialog>
            <MediaUploadDialog<LearnerCommunityMedia>
              {...mediaAdapters}
              title="Add video"
              description="Add a video to your post."
              acceptedTypes={["video/*"]}
              allowUnsplash={false}
              maxUploadBytes={100_000_000}
              onSelect={onMediaSelected}
            >
              <Button type="button" variant="ghost" size="icon" aria-label="Add video">
                <Video className="size-5" aria-hidden="true" />
              </Button>
            </MediaUploadDialog>
            <MediaUploadDialog<LearnerCommunityMedia>
              {...mediaAdapters}
              title="Add image"
              description="Add an image to your post."
              acceptedTypes={["image/*"]}
              allowUnsplash={false}
              maxUploadBytes={100_000_000}
              onSelect={onMediaSelected}
            >
              <Button type="button" variant="ghost" size="icon" aria-label="Add image">
                <ImageIcon className="size-5" aria-hidden="true" />
              </Button>
            </MediaUploadDialog>
            <LearnerSelect
              value={destinationId || undefined}
              onValueChange={onDestinationChange}
              disabled={destinationLocked}
              aria-label={destinationLabel}
            >
              <LearnerSelectTrigger className="h-10 w-56">
                <LearnerSelectValue placeholder={destinationLabel} />
              </LearnerSelectTrigger>
              <LearnerSelectContent>
                {destinations.map((destination) => (
                  <LearnerSelectItem key={destination.id} value={destination.id}>
                    {destination.name}
                  </LearnerSelectItem>
                ))}
              </LearnerSelectContent>
            </LearnerSelect>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Posting…" : "Post"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseEditorContent(value: string) {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { type?: unknown }).type === "doc" &&
      Array.isArray((parsed as { content?: unknown }).content)
    ) {
      return parsed as Parameters<typeof LearnerRichTextEditor>[0]["initialContent"];
    }
  } catch {
    // Older post content can still be plain text.
  }
  return value;
}
