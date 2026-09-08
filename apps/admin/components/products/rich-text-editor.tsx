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
  type CourseLitMedia,
  filterCourseLitMediaAdapters,
  mediaMatchesAcceptedTypes,
  useCourseLitMediaUploader,
} from "@/lib/course-media-uploader";
import type { School } from "./product-types";

const RICH_TEXT_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

type RichTextImagePurpose = "product_content" | "lesson_content" | "community_content";

type RichTextEditorProps = Omit<EditorProps, "onError"> & {
  school: School;
  purpose: RichTextImagePurpose;
  onError?: EditorProps["onError"];
};

/**
 * The text editor continues to receive the production ProseMirror document
 * format, while image selection is supplied by the published media uploader.
 */
export function RichTextEditor({
  school,
  purpose,
  onError,
  ...editorProps
}: RichTextEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingPicker = useRef<((image: PickedImage | null) => void) | null>(null);
  const adapters = useCourseLitMediaUploader({
    schoolId: school.id,
    purpose,
    accessPolicy: "public",
  });
  const filteredAdapters = filterCourseLitMediaAdapters(
    adapters,
    RICH_TEXT_IMAGE_ACCEPTED_TYPES,
  );

  const pickImage = useCallback((): Promise<PickedImage | null> => {
    return new Promise((resolve) => {
      pendingPicker.current = resolve;
      setPickerOpen(true);
    });
  }, []);

  function finishPicker(selected: SelectedImage<CourseLitMedia>) {
    const resolve = pendingPicker.current;
    pendingPicker.current = null;
    if (
      selected.media &&
      !mediaMatchesAcceptedTypes(selected.media, RICH_TEXT_IMAGE_ACCEPTED_TYPES)
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
      <ImageUploadDialog<CourseLitMedia>
        {...filteredAdapters}
        open={pickerOpen}
        onOpenChange={closePicker}
        title="Select image"
        acceptedTypes={RICH_TEXT_IMAGE_ACCEPTED_TYPES}
        allowUnsplash
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
