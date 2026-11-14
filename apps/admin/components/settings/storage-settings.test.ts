import { describe, expect, it } from "bun:test";
import { parseLearnerUploadMb } from "./storage-settings";

describe("parseLearnerUploadMb", () => {
  it("takes whole megabytes from 1 to 1024", () => {
    expect(parseLearnerUploadMb(" 100 ")).toEqual({ ok: true, mb: 100 });
    expect(parseLearnerUploadMb("1024")).toEqual({ ok: true, mb: 1024 });
    for (const value of ["0", "1025", "1.5", "", "abc"]) {
      expect(parseLearnerUploadMb(value).ok).toBe(false);
    }
  });
});
