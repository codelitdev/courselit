import { describe, expect, it } from "bun:test";
import {
  COURSE_LESSON_TYPES,
  diagnosticLocation,
  editorUnavailableBlocks,
  imageAttrsForPick,
  isPendingImageToken,
  LESSON_CONFLICT_MESSAGE,
  lessonSaveFailure,
  lessonSaveFailureMessage,
  pendingImageToken,
  QUIZ_LIMIT_MESSAGE,
  unavailableBlockReasons,
} from "./lesson-page";

describe("lesson type picker", () => {
  it("offers Page and SCORM for courses, never File", () => {
    expect([...COURSE_LESSON_TYPES]).toEqual(["page", "scorm"]);
  });
});

describe("block availability", () => {
  it("reads reasons from the content format", () => {
    expect(
      unavailableBlockReasons({
        blocks: [
          { name: "video" },
          { name: "embed", unavailable: "trial" },
          { name: "quiz", unavailable: "" },
        ],
      }),
    ).toEqual({ embed: "trial" });
    expect(unavailableBlockReasons(null)).toEqual({});
  });

  it("turns reasons into messages and greys out a second quiz", () => {
    expect(editorUnavailableBlocks({ embed: "trial" }, { hasQuiz: false })).toEqual({
      embed: "Not available during the trial",
    });
    expect(
      editorUnavailableBlocks({ embed: "plan_required" }, { hasQuiz: true }),
    ).toEqual({ embed: "Needs a paid plan", quiz: QUIZ_LIMIT_MESSAGE });
    expect(editorUnavailableBlocks({ embed: "other" }, { hasQuiz: false }).embed).toBe(
      "Not available on your plan",
    );
  });
});

describe("lessonSaveFailure", () => {
  it("treats a version mismatch as a conflict", () => {
    const failure = lessonSaveFailure(409, {
      code: "conflict",
      details: { reason: "content_version_mismatch", contentVersion: 4 } as never,
    });
    expect(failure).toEqual({ kind: "conflict" });
    expect(lessonSaveFailureMessage(failure)).toBe(LESSON_CONFLICT_MESSAGE);
    // A 409 for another reason is not a content conflict.
    expect(lessonSaveFailure(409, { message: "Busy" })).toEqual({
      kind: "error",
      message: "Busy",
    });
  });

  it("reads every diagnostic the API reports", () => {
    const failure = lessonSaveFailure(400, {
      details: {
        reason: "lesson_content_invalid",
        message: "Question 1 needs a correct option.",
        diagnostics: JSON.stringify([
          {
            code: "incomplete_block",
            message: "Question 1 needs a correct option.",
            fieldPath: "content.content[2].attrs.questions[0].options",
          },
          { code: "invalid_document", message: "Bad link.", line: 4, column: 2 },
          { code: "x" },
        ]),
      },
    });
    expect(failure).toEqual({
      kind: "invalid",
      diagnostics: [
        {
          code: "incomplete_block",
          message: "Question 1 needs a correct option.",
          fieldPath: "content.content[2].attrs.questions[0].options",
          line: null,
          column: null,
        },
        {
          code: "invalid_document",
          message: "Bad link.",
          fieldPath: null,
          line: 4,
          column: 2,
        },
      ],
    });
  });

  it("falls back to the first diagnostic when the list is missing", () => {
    expect(
      lessonSaveFailure(400, {
        details: {
          reason: "lesson_content_invalid",
          code: "quiz_limit",
          message: "A lesson holds at most one quiz.",
          fieldPath: "content.content[5]",
        },
      }),
    ).toEqual({
      kind: "invalid",
      diagnostics: [
        {
          code: "quiz_limit",
          message: "A lesson holds at most one quiz.",
          fieldPath: "content.content[5]",
          line: null,
          column: null,
        },
      ],
    });
  });

  it("explains an unavailable block, media problems and a quiz in a free preview", () => {
    const trial = lessonSaveFailure(403, {
      details: {
        reason: "plan_required",
        blockReason: "trial",
        message: "Embed can't be added.",
      },
    });
    expect(trial.kind).toBe("invalid");
    expect(lessonSaveFailureMessage(trial)).toContain("Not available during the trial");
    for (const reason of [
      "quiz_cannot_be_previewed",
      "lesson_media_not_found",
      "lesson_media_type_mismatch",
    ]) {
      const failure = lessonSaveFailure(400, { details: { reason } });
      expect(failure.kind).toBe("invalid");
    }
  });

  it("keeps other errors retryable", () => {
    expect(lessonSaveFailure(500, null)).toEqual({
      kind: "error",
      message: "Unable to save the lesson.",
    });
  });
});

describe("diagnosticLocation", () => {
  it("names the block, question and option, or the Markdown line", () => {
    expect(
      diagnosticLocation({
        code: "x",
        message: "",
        fieldPath: "content.content[2].attrs.questions[1].options[0].text",
      }),
    ).toBe("Block 3, question 2, option 1");
    expect(diagnosticLocation({ code: "x", message: "", line: 7 })).toBe("Line 7");
    expect(diagnosticLocation({ code: "x", message: "", fieldPath: "content" })).toBe(
      null,
    );
    expect(diagnosticLocation({ code: "x", message: "" })).toBe(null);
  });
});

describe("Unsplash image picks", () => {
  it("marks placeholder IDs from the / menu", () => {
    const token = pendingImageToken(3);
    expect(isPendingImageToken(token)).toBe(true);
    expect(isPendingImageToken("med_123")).toBe(false);
    expect(isPendingImageToken(null)).toBe(false);
  });

  it("stores uploads by media ID and Unsplash photos by URL only", () => {
    expect(
      imageAttrsForPick(
        { kind: "media", id: "med_1", url: "https://cdn/x.png" },
        "Old",
      ),
    ).toEqual({ media: "med_1", src: null, alt: "Old" });
    expect(
      imageAttrsForPick({
        kind: "unsplash",
        url: "https://images.unsplash.com/photo-1",
        alt: "A desk",
      }),
    ).toEqual({
      media: null,
      src: "https://images.unsplash.com/photo-1",
      alt: "A desk",
    });
  });
});
