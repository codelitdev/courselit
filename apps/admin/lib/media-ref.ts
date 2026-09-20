import type { MediaRef } from "@courselit/api-contract";
import type { SelectedMedia } from "@frontlit/media-uploader";
import type { CourseLitMedia } from "./course-media-uploader";

/** Convert a picker selection into the platform's shared media reference. */
export function toMediaRef(image: SelectedMedia<CourseLitMedia>): MediaRef {
  const media = image.media;
  return {
    ...(media ? { mediaId: media.id } : {}),
    url: media?.url ?? image.src,
    ...(media?.thumbnailUrl ? { thumbnailUrl: media.thumbnailUrl } : {}),
    ...(media?.alt || image.alt ? { alt: media?.alt || image.alt } : {}),
    ...(media?.fileName || image.fileName
      ? { fileName: media?.fileName || image.fileName }
      : {}),
    ...(media?.mimeType || image.mimeType
      ? { mimeType: media?.mimeType || image.mimeType }
      : {}),
    ...((media?.byteSize ?? image.byteSize) !== undefined
      ? { byteSize: media?.byteSize ?? image.byteSize }
      : {}),
    ...(media?.title ? { title: media.title } : {}),
    ...(media?.kind ? { kind: media.kind } : {}),
  };
}
