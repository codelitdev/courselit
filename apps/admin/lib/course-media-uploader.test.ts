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
});
