"use client";

import { ImageUploadDialog, type SelectedImage } from "@frontlit/media-uploader";
import {
  Editor,
  type EditorProps,
  ImagePickerContextProvider,
  type PickedImage,
} from "@frontlit/text-editor";
import { useCallback, useRef, useState } from "react";
import { LearnerText2 } from "@/components/themed-page-builder";
import {
  type LearnerCommunityMedia,
  useLearnerCommunityMediaUploader,
} from "@/lib/community-media-uploader";

const COMMUNITY_TEXT_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

type RichTextNode = {
  [key: string]: unknown;
  type?: unknown;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
};

function annotateOwnedImages(
  document: Parameters<EditorProps["onChange"]>[0],
  mediaIdsByUrl: ReadonlyMap<string, string>,
): Parameters<EditorProps["onChange"]>[0] {
  const visit = (node: RichTextNode): RichTextNode => {
    const attrs = node.attrs;
    const src = typeof attrs?.src === "string" ? attrs.src : null;
    const mediaId = src ? mediaIdsByUrl.get(src) : undefined;
    const nextAttrs =
      node.type === "image" && mediaId && !attrs?.mediaId
        ? { ...(attrs ?? {}), mediaId }
        : attrs;
    const nextContent = node.content?.map(visit);
    return {
      ...node,
      ...(nextAttrs ? { attrs: nextAttrs } : {}),
      ...(nextContent ? { content: nextContent } : {}),
    };
  };

  return visit(document as RichTextNode) as Parameters<EditorProps["onChange"]>[0];
}

type LearnerRichTextEditorProps = Omit<EditorProps, "onError"> & {
  onError?: EditorProps["onError"];
};

export function LearnerRichTextEditor({
  onError,
  ...editorProps
}: LearnerRichTextEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingPicker = useRef<((image: PickedImage | null) => void) | null>(null);
  const selectedMediaByUrl = useRef(new Map<string, string>());
  const adapters = useLearnerCommunityMediaUploader();

  const filteredAdapters = {
    ...adapters,
    listMedia: async (query: string) => {
      const items = (await adapters.listMedia?.(query)) ?? [];
      return items.filter((item) =>
        COMMUNITY_TEXT_IMAGE_TYPES.some(
          (type) => item.mimeType?.toLowerCase() === type,
        ),
      );
    },
  };

  const pickImage = useCallback((): Promise<PickedImage | null> => {
    return new Promise((resolve) => {
      pendingPicker.current = resolve;
      setPickerOpen(true);
    });
  }, []);

  function finishPicker(selected: SelectedImage<LearnerCommunityMedia>) {
    const resolve = pendingPicker.current;
    pendingPicker.current = null;
    if (
      selected.media &&
      !COMMUNITY_TEXT_IMAGE_TYPES.includes(selected.media.mimeType ?? "")
    ) {
      setError("Only JPEG, PNG, GIF, or WebP images can be inserted.");
      resolve?.(null);
      return;
    }
    if (selected.media) {
      selectedMediaByUrl.current.set(selected.media.url, selected.media.id);
    }
    setError(null);
    resolve?.({ src: selected.media?.url ?? selected.src, alt: selected.alt });
  }

  function closePicker(open: boolean) {
    setPickerOpen(open);
    if (!open) {
      const resolve = pendingPicker.current;
      pendingPicker.current = null;
      resolve?.(null);
    }
  }

  function handleError(message: string) {
    setError(message);
    onError?.(message);
  }

  function handleChange(document: Parameters<EditorProps["onChange"]>[0]) {
    editorProps.onChange(annotateOwnedImages(document, selectedMediaByUrl.current));
  }

  return (
    <div className="space-y-2">
      <ImagePickerContextProvider pickImage={pickImage}>
        <Editor {...editorProps} onChange={handleChange} onError={handleError} />
      </ImagePickerContextProvider>
      <ImageUploadDialog<LearnerCommunityMedia>
        {...filteredAdapters}
        open={pickerOpen}
        onOpenChange={closePicker}
        title="Select image"
        acceptedTypes={COMMUNITY_TEXT_IMAGE_TYPES}
        allowUnsplash={false}
        metadataMode="alt"
        onSelect={finishPicker}
      />
      {error ? (
        <LearnerText2 role="alert" className="text-destructive">
          {error}
        </LearnerText2>
      ) : null}
    </div>
  );
}
