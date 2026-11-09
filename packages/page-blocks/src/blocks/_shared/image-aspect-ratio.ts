/** How a block crops its featured image. "original" keeps the image's own shape. */
export type ImageAspectRatio = "original" | "16:9" | "4:3" | "1:1" | "1200:630";

export const IMAGE_ASPECT_RATIO_OPTIONS: Array<{ label: string; value: ImageAspectRatio }> =
  [
    { label: "Widescreen (16:9)", value: "16:9" },
    { label: "Cover (1200 × 630)", value: "1200:630" },
    { label: "Standard (4:3)", value: "4:3" },
    { label: "Square (1:1)", value: "1:1" },
    { label: "Original (no cropping)", value: "original" },
  ];

// Full class names, so Tailwind finds them when it scans this file.
const ASPECT_CLASSES: Record<ImageAspectRatio, string> = {
  original: "h-auto",
  "16:9": "aspect-video object-cover",
  "1200:630": "aspect-[1200/630] object-cover",
  "4:3": "aspect-[4/3] object-cover",
  "1:1": "aspect-square object-cover",
};

export function imageAspectRatioClass(
  ratio: ImageAspectRatio | undefined,
  fallback: ImageAspectRatio,
): string {
  return ASPECT_CLASSES[ratio && ratio in ASPECT_CLASSES ? ratio : fallback];
}
