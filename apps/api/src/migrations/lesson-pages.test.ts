import { describe, expect, it } from "bun:test";
import { containsQuizAnswers } from "@courselit/api-contract/quiz";
import { prepareLessonContent, readLessonQuiz } from "@courselit/lesson-content";
import { importMainLesson, type LessonImportWarning, normalizeMainDocument } from "./lesson-pages.js";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const doc = (...content: unknown[]) => ({ type: "doc", content });

function imported(input: Partial<Parameters<typeof importMainLesson>[0]>) {
  const result = importMainLesson({
    type: "text",
    content: {},
    downloadable: false,
    productKind: "course",
    ...input,
  });
  if (!result) throw new Error("expected an imported lesson");
  // Every imported page is a valid lesson page.
  if (result.type === "page") {
    expect(prepareLessonContent({ content: result.content }).ok).toBe(true);
  }
  return result;
}

describe("main lesson import", () => {
  it("keeps SCORM and download files as they are", () => {
    expect(imported({ type: "scorm", content: { packageInfo: { a: 1 } } })).toEqual({
      type: "scorm",
      content: { packageInfo: { a: 1 } },
      warnings: [],
    });
    expect(imported({ type: "file", productKind: "download" })).toEqual({
      type: "file",
      content: {},
      warnings: [],
    });
  });

  it("maps a course file to a page with a File block", () => {
    expect(imported({ type: "file" }).content).toMatchObject({
      content: [{ type: "file", attrs: { media: null } }],
    });
  });

  it("maps video, audio and PDF to one media block, plus File when downloadable", () => {
    for (const type of ["video", "audio", "pdf"] as const) {
      expect(imported({ type }).content).toMatchObject({ content: [{ type, attrs: { media: null } }] });
      expect(imported({ type, downloadable: true }).content).toMatchObject({
        content: [{ type }, { type: "file" }],
      });
    }
    // A description main kept with the media follows it.
    expect(
      imported({ type: "video", content: doc(paragraph("About this video")) }).content,
    ).toMatchObject({ content: [{ type: "video" }, paragraph("About this video")] });
  });

  it("maps an embed to an Embed block, or a bare YouTube URL to a Video block", () => {
    expect(imported({ type: "embed", content: { value: "<b>hi</b>" } }).content).toMatchObject({
      content: [{ type: "embed", attrs: { code: "<b>hi</b>" } }],
    });
    expect(
      imported({ type: "embed", content: { value: " https://youtu.be/dQw4w9WgXcQ " } }).content,
    ).toMatchObject({
      content: [{ type: "video", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ" } }],
    });
  });

  it("maps a quiz to a page with one Quiz block, keeping answers for authors", () => {
    const quiz = {
      id: "qz_1",
      passingGrade: 60,
      questions: [
        {
          id: "q1",
          text: "Q",
          options: [
            { id: "a", text: "A", correct: true },
            { id: "b", text: "B", correct: false },
          ],
        },
      ],
    };
    const lesson = imported({ type: "quiz", quiz });
    expect(readLessonQuiz(lesson.content)).toEqual(quiz);
    expect(containsQuizAnswers(lesson.content)).toBe(true);
  });

  it("refuses a quiz the lesson profile can't hold", () => {
    const quiz = {
      id: "qz_1",
      passingGrade: null,
      questions: [
        {
          id: "q1",
          text: "x".repeat(5000),
          options: [
            { id: "a", text: "A", correct: true },
            { id: "b", text: "B", correct: false },
          ],
        },
      ],
    };
    expect(
      importMainLesson({ type: "quiz", quiz, content: {}, downloadable: false, productKind: "course" }),
    ).toBeNull();
  });
});

describe("normalizeMainDocument", () => {
  const normalize = (input: unknown) => {
    const warnings: LessonImportWarning[] = [];
    const content = normalizeMainDocument(input, (code) => warnings.push(code));
    return { content, warnings: [...new Set(warnings)] };
  };

  it("keeps what the profile holds", () => {
    const input = doc(
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
      paragraph("Body"),
      { type: "bulletList", content: [{ type: "listItem", content: [paragraph("One")] }] },
    );
    expect(normalize(input)).toEqual({ content: input.content as never, warnings: [] });
  });

  it("drops base64 images and reports them", () => {
    const result = normalize(
      doc(paragraph("Before"), { type: "image", attrs: { src: "data:image/png;base64,iVBORw0KGgo=" } }),
    );
    expect(result.content).toEqual([paragraph("Before")] as never);
    expect(result.warnings).toEqual(["base64_image_dropped"]);
  });

  it("keeps Unsplash images and links other https images", () => {
    const result = normalize(
      doc(
        { type: "image", attrs: { src: "https://images.unsplash.com/photo-1", alt: "Hill" } },
        { type: "image", attrs: { src: "https://cdn.example.com/a.png", alt: "Chart" } },
      ),
    );
    expect(result.content[0]).toMatchObject({ type: "image", attrs: { src: "https://images.unsplash.com/photo-1" } });
    expect(result.content[1]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Chart", marks: [{ type: "link", attrs: { href: "https://cdn.example.com/a.png" } }] }],
    } as never);
    expect(result.warnings).toEqual(["external_image_linked"]);
  });

  it("turns unknown nodes into paragraphs, moves headings into 2–4 and drops unknown marks", () => {
    const result = normalize(
      doc(
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Big" }] },
        { type: "heading", attrs: { level: 6 }, content: [{ type: "text", text: "Small" }] },
        { type: "youtube", attrs: { src: "x" }, content: [{ type: "text", text: "Caption" }] },
        { type: "paragraph", content: [{ type: "text", text: "u", marks: [{ type: "underline" }, { type: "bold" }] }] },
      ),
    );
    expect(result.content).toEqual([
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Big" }] },
      { type: "heading", attrs: { level: 4 }, content: [{ type: "text", text: "Small" }] },
      paragraph("Caption"),
      { type: "paragraph", content: [{ type: "text", text: "u", marks: [{ type: "bold" }] }] },
    ] as never);
    expect(result.warnings.sort()).toEqual(["heading_level_changed", "unknown_node_converted"]);
  });

  it("flattens a document it can't repair into paragraphs, keeping the text", () => {
    const result = normalize(
      doc({ type: "bulletList", content: [paragraph("Not a list item")] }),
    );
    expect(result.content).toEqual([paragraph("Not a list item")] as never);
    expect(result.warnings).toContain("content_flattened");
  });

  it("returns nothing for something that isn't a document", () => {
    expect(normalize("text").content).toEqual([]);
  });
});
