import { describe, expect, test } from "bun:test";
import { lessonCompletionError, requestLessonCompletion } from "./lesson-completion";

describe("lessonCompletionError", () => {
  test("explains each refusal", () => {
    expect(lessonCompletionError(409, "need_to_pass")).toBe(
      "Pass the quiz to complete this lesson.",
    );
    expect(lessonCompletionError(409, "scorm_content_incomplete")).toBe(
      "Finish the SCORM activity to complete this lesson.",
    );
    expect(lessonCompletionError(401, null)).toBe("Sign in to complete this lesson.");
    expect(lessonCompletionError(403, null)).toBe(
      "This lesson can't be completed yet.",
    );
    expect(lessonCompletionError(500, null)).toBe("Unable to complete the lesson.");
  });
});

describe("requestLessonCompletion", () => {
  const headers = (extra?: Record<string, string>) => new Headers(extra);

  test("posts to the lesson's complete route and returns the certificate", async () => {
    let seen: { url: string; method?: string } | null = null;
    const fetcher = (async (url: string, init: RequestInit) => {
      seen = { url, method: init.method };
      return Response.json({ courseCompleted: true, certificateId: "cert_1" });
    }) as unknown as typeof fetch;
    expect(
      await requestLessonCompletion({ lessonId: "l 1", headers }, fetcher),
    ).toEqual({
      ok: true,
      courseCompleted: true,
      certificateId: "cert_1",
    });
    expect(seen).toEqual({
      url: "/api/v1/learner/lessons/l%201/complete",
      method: "POST",
    });
  });

  test("maps a refusal to its reason", async () => {
    const fetcher = (async () =>
      Response.json(
        { code: "conflict", details: { reason: "need_to_pass" } },
        { status: 409 },
      )) as unknown as typeof fetch;
    expect(await requestLessonCompletion({ lessonId: "l1", headers }, fetcher)).toEqual(
      {
        ok: false,
        status: 409,
        message: "Pass the quiz to complete this lesson.",
      },
    );
  });

  test("reports a network failure", async () => {
    const fetcher = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await requestLessonCompletion({ lessonId: "l1", headers }, fetcher)).toEqual(
      {
        ok: false,
        status: 0,
        message: "Unable to complete the lesson.",
      },
    );
  });
});
