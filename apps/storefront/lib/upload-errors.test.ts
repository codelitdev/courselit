import { describe, expect, it } from "bun:test";
import { learnerUploadErrorMessage } from "./upload-errors";

describe("learnerUploadErrorMessage", () => {
  it("explains refusals without plan or usage numbers", () => {
    const storage = learnerUploadErrorMessage(403, "upload_not_allowed", "x");
    expect(storage).not.toMatch(/\d/);
    expect(learnerUploadErrorMessage(429, "", "x")).toContain("last hour");
    expect(learnerUploadErrorMessage(403, "", "x")).toContain("can't upload");
    expect(learnerUploadErrorMessage(500, "", "Unable to upload.")).toBe("Unable to upload.");
  });
});
