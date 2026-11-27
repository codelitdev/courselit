import { describe, expect, it } from "bun:test";
import { uploadErrorMessage } from "./course-media-uploader";

describe("uploadErrorMessage", () => {
  it("explains a full plan and falls back to the API's message", () => {
    expect(uploadErrorMessage({ details: { reason: "plan_limit_reached" } }, "x")).toContain(
      "out of storage",
    );
    expect(uploadErrorMessage({ message: "Nope" }, "x")).toBe("Nope");
    expect(uploadErrorMessage(null, "Unable.")).toBe("Unable.");
  });

  it("names the branding image limit when a logo is refused", () => {
    for (const reason of ["file_too_large", "logo_too_large"]) {
      expect(uploadErrorMessage({ details: { reason } }, "x")).toBe(
        "Choose an image under 2 MB.",
      );
    }
    for (const reason of ["unsupported_branding_type", "logo_not_image"]) {
      expect(uploadErrorMessage({ details: { reason } }, "x")).toBe(
        "Choose an image file.",
      );
    }
  });
});
