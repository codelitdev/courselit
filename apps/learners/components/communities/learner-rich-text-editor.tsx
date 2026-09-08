"use client";

import { ImageUploadDialog, type SelectedImage } from "@frontlit/media-uploader";
import {
  Editor,
  type EditorProps,
  ImagePickerContextProvider,
  type PickedImage,
} from "@frontlit/text-editor";
import { useCallback, useRef, useState } from "react";
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
    setError(null);
    resolve?.({ src: selected.src, alt: selected.alt });
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

  return (
    <div className="space-y-2">
      <ImagePickerContextProvider pickImage={pickImage}>
        <Editor {...editorProps} onError={handleError} />
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
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
