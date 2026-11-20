import { describe, expect, test } from "bun:test";
import {
  fetchLessonMedia,
  lessonMediaIds,
  lessonMediaItemPath,
  lessonMediaResolver,
  lessonPageHasQuiz,
  readLessonMedia,
  readLessonPage,
} from "./lesson-page";

const paragraph = { type: "paragraph", content: [{ type: "text", text: "Hi" }] };
const page = {
  type: "doc",
  content: [
    paragraph,
    { type: "image", attrs: { media: "med_img", src: null } },
    {
      type: "image",
      attrs: { media: null, src: "https://images.unsplash.com/photo-1" },
    },
    {
      type: "video",
      attrs: { media: null, provider: "youtube", videoId: "dQw4w9WgXcQ" },
    },
    {
      type: "callout",
      content: [{ type: "pdf", attrs: { media: "med_pdf" } }],
    },
    { type: "file", attrs: { media: "med_pdf", label: "Slides" } },
    { type: "audio", attrs: { media: "med_audio" } },
    { type: "embed", attrs: { code: "<p>x</p>", media: "ignored" } },
  ],
};

describe("readLessonPage", () => {
  test("accepts a page document and nothing else", () => {
    expect(readLessonPage(page)).toBe(page as never);
    expect(readLessonPage({ launchUrl: "index.html" })).toBeNull();
    expect(readLessonPage({ type: "doc" })).toBeNull();
    expect(readLessonPage(null)).toBeNull();
  });
});

describe("lessonPageHasQuiz", () => {
  test("finds nested quizzes", () => {
    expect(
      lessonPageHasQuiz({
        type: "doc",
        content: [{ type: "callout", content: [{ type: "quiz" }] }],
      }),
    ).toBe(true);
    expect(lessonPageHasQuiz({ type: "doc", content: [paragraph] })).toBe(false);
    expect(lessonPageHasQuiz(null)).toBe(false);
  });
});

describe("lessonMediaIds", () => {
  test("lists each media block's ID once, skipping Unsplash, providers and non-media blocks", () => {
    expect(lessonMediaIds(page)).toEqual(["med_img", "med_pdf", "med_audio"]);
    expect(lessonMediaIds({ type: "doc", content: [paragraph] })).toEqual([]);
  });
});

describe("lessonMediaItemPath", () => {
  const base = { schoolId: "sch 1", productId: "p/1", lessonId: "l1", mediaId: "m1" };
  test("uses the school's public route for learners and the public", () => {
    expect(lessonMediaItemPath({ ...base, preview: false })).toBe(
      "/api/v1/public/sch%201/products/p%2F1/lessons/l1/media/m1",
    );
  });
  test("uses the preview route for previews", () => {
    expect(lessonMediaItemPath({ ...base, preview: true })).toBe(
      "/api/v1/preview/products/p%2F1/lessons/l1/media/m1",
    );
  });
});

describe("readLessonMedia", () => {
  test("keeps the URL, file name and type", () => {
    expect(
      readLessonMedia({
        id: "m1",
        url: "https://cdn.example/a.pdf",
        fileName: "a.pdf",
        mimeType: "application/pdf",
      }),
    ).toEqual({
      url: "https://cdn.example/a.pdf",
      name: "a.pdf",
      mimeType: "application/pdf",
    });
  });
  test("refuses responses without a web URL", () => {
    expect(readLessonMedia({ url: "javascript:alert(1)" })).toBeNull();
    expect(readLessonMedia({ url: "not a url" })).toBeNull();
    expect(readLessonMedia(null)).toBeNull();
  });
});

describe("fetchLessonMedia", () => {
  test("fetches every item in parallel and leaves out the ones that fail", async () => {
    const calls: Array<{ url: string; headers: Headers }> = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: new Headers(init.headers) });
      if (url.endsWith("/m2")) return new Response("{}", { status: 404 });
      if (url.endsWith("/m3")) throw new Error("offline");
      return Response.json({ url: "https://cdn.example/m1.png", fileName: "m1.png" });
    }) as unknown as typeof fetch;
    const media = await fetchLessonMedia(
      {
        schoolId: "s",
        productId: "p",
        lessonId: "l",
        mediaIds: ["m1", "m2", "m3"],
        previewToken: "tok",
        headers: (extra) => new Headers(extra),
      },
      fetcher,
    );
    expect([...media.keys()]).toEqual(["m1"]);
    expect(calls.map((call) => call.url)).toEqual([
      "/api/v1/preview/products/p/lessons/l/media/m1",
      "/api/v1/preview/products/p/lessons/l/media/m2",
      "/api/v1/preview/products/p/lessons/l/media/m3",
    ]);
    expect(calls[0]?.headers.get("x-preview-token")).toBe("tok");

    const resolve = lessonMediaResolver(media);
    expect(resolve("m1")).toEqual({
      url: "https://cdn.example/m1.png",
      name: "m1.png",
      mimeType: undefined,
    });
    expect(resolve("m2")).toBeNull();
  });
});
