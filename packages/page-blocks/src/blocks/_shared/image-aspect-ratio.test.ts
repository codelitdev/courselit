import { describe, expect, it } from "bun:test";
import { IMAGE_ASPECT_RATIO_OPTIONS, imageAspectRatioClass } from "./image-aspect-ratio";

describe("imageAspectRatioClass", () => {
  it("uses the block's default until a ratio is chosen", () => {
    expect(imageAspectRatioClass(undefined, "16:9")).toBe("aspect-video object-cover");
    expect(imageAspectRatioClass(undefined, "1200:630")).toBe(
      "aspect-[1200/630] object-cover",
    );
    // Settings saved by an older or hand-edited page fall back as well.
    expect(imageAspectRatioClass("21:9" as never, "16:9")).toBe("aspect-video object-cover");
  });

  it("keeps the image's own shape for original, and crops the others", () => {
    expect(imageAspectRatioClass("original", "16:9")).toBe("h-auto");
    for (const option of IMAGE_ASPECT_RATIO_OPTIONS) {
      const classes = imageAspectRatioClass(option.value, "16:9");
      expect(classes.includes("object-cover")).toBe(option.value !== "original");
    }
  });
});
