import { describe, expect, test } from "bun:test";
import { lessonProfile } from "@courselit/lesson-content";
import { ContentRenderer } from "@frontlit/text-editor/renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { LESSON_BLOCK_RENDERERS, LessonPageRenderer } from "./lesson-page-renderer";
import { SchoolProvider } from "./school-context";

const quiz = {
  id: "qz_1",
  passingGrade: 70,
  questions: [
    {
      id: "q1",
      text: "Pick one",
      multiple: false,
      options: [
        { id: "o1", text: "Alpha" },
        { id: "o2", text: "Beta" },
      ],
    },
    {
      id: "q2",
      text: "Pick many",
      multiple: true,
      options: [
        { id: "o3", text: "Gamma" },
        { id: "o4", text: "Delta" },
      ],
    },
  ],
};
const text = (value: string) => ({
  type: "paragraph",
  content: [{ type: "text", text: value }],
});

function renderPage(
  content: Record<string, unknown>[],
  previewToken: string | null = null,
) {
  return renderToStaticMarkup(
    <SchoolProvider schoolId="sch_1">
      <LessonPageRenderer
        document={{ type: "doc", content }}
        productId="p1"
        lessonId="l1"
        previewToken={previewToken}
        onQuizChanged={() => undefined}
      />
    </SchoolProvider>,
  );
}

function renderBlocks(
  content: Record<string, unknown>[],
  media: Record<string, { url: string; name?: string }> = {},
) {
  return renderToStaticMarkup(
    <ContentRenderer
      profile={lessonProfile}
      json={{ type: "doc", content }}
      blocks={LESSON_BLOCK_RENDERERS}
      resolveMedia={(id) => media[id] ?? null}
    />,
  );
}

describe("LessonPageRenderer quiz", () => {
  test("draws the quiz where the author placed it", () => {
    const html = renderPage([
      text("Before"),
      { type: "quiz", attrs: quiz },
      text("After"),
    ]);
    const before = html.indexOf("Before");
    const quizAt = html.indexOf('data-lesson-quiz="qz_1"');
    const after = html.indexOf("After");
    expect(before).toBeGreaterThan(-1);
    expect(quizAt).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(quizAt);
    expect(html).toContain("Submit answers");
  });

  test("uses single choice for one answer and checkboxes for several", () => {
    const html = renderPage([{ type: "quiz", attrs: quiz }]);
    expect(html.match(/role="radio"/g)?.length).toBe(2);
    expect(html.match(/role="checkbox"/g)?.length).toBe(2);
    expect(html).toContain("Choose all that apply.");
  });

  test("never draws a quiz that still carries answers (L1)", () => {
    const leaked = {
      ...quiz,
      questions: [
        { ...quiz.questions[0], options: [{ id: "o1", text: "Alpha", correct: true }] },
      ],
    };
    const html = renderPage([{ type: "quiz", attrs: leaked }]);
    expect(html).not.toContain("data-lesson-quiz");
    expect(html).not.toContain("Alpha");
  });

  test("can't be answered in a preview", () => {
    const html = renderPage([{ type: "quiz", attrs: quiz }], "token");
    expect(html).not.toContain("Submit answers");
    expect(html).toContain("Enrolled learners answer this quiz");
  });
});

describe("lesson media and embed blocks", () => {
  test("render nothing until their media resolves", () => {
    const html = renderBlocks([
      { type: "image", attrs: { media: "m_img" } },
      { type: "video", attrs: { media: "m_vid" } },
      { type: "audio", attrs: { media: "m_aud" } },
      { type: "pdf", attrs: { media: "m_pdf" } },
      { type: "file", attrs: { media: "m_file" } },
    ]);
    expect(html).not.toMatch(/<(img|video|audio|object|a)\b/);
  });

  test("use the resolved URLs", () => {
    const html = renderBlocks(
      [
        { type: "image", attrs: { media: "m_img", alt: "Chart" } },
        { type: "video", attrs: { media: "m_vid", caption: "Walkthrough" } },
        { type: "audio", attrs: { media: "m_aud" } },
        { type: "pdf", attrs: { media: "m_pdf", title: "Notes" } },
        { type: "file", attrs: { media: "m_file", label: "Slides" } },
      ],
      {
        m_img: { url: "https://cdn.example/i.png" },
        m_vid: { url: "https://cdn.example/v.mp4" },
        m_aud: { url: "https://cdn.example/a.mp3" },
        m_pdf: { url: "https://cdn.example/n.pdf", name: "n.pdf" },
        m_file: { url: "https://cdn.example/s.key", name: "s.key" },
      },
    );
    expect(html).toContain('src="https://cdn.example/i.png"');
    expect(html).toContain('alt="Chart"');
    expect(html).toMatch(/<video[^>]*src="https:\/\/cdn.example\/v.mp4"/);
    expect(html).toContain("Walkthrough");
    expect(html).toMatch(/<audio[^>]*src="https:\/\/cdn.example\/a.mp3"/);
    expect(html).toMatch(/<object[^>]*data="https:\/\/cdn.example\/n.pdf"/);
    expect(html).toContain("Open Notes");
    expect(html).toMatch(
      /<a[^>]*href="https:\/\/cdn.example\/s.key"[^>]*download="s.key"/,
    );
    expect(html).toContain("Slides");
  });

  test("show Unsplash images and YouTube/Vimeo players without a lookup", () => {
    const html = renderBlocks([
      { type: "image", attrs: { src: "https://images.unsplash.com/photo-1", alt: "" } },
      { type: "image", attrs: { src: "https://tracker.example/pixel.gif", alt: "" } },
      { type: "video", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ" } },
      { type: "video", attrs: { provider: "vimeo", videoId: "76979871" } },
    ]);
    expect(html).toContain('src="https://images.unsplash.com/photo-1"');
    expect(html).not.toContain("tracker.example");
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('src="https://player.vimeo.com/video/76979871"');
  });

  test("embed only in the sandboxed srcdoc frame (L3)", () => {
    const html = renderBlocks([
      { type: "embed", attrs: { code: "<script>alert(1)</script>", title: "Widget" } },
    ]);
    expect(html).toContain('sandbox="allow-scripts allow-popups allow-forms"');
    expect(html).not.toContain("allow-same-origin");
    expect(html).toContain("srcDoc=");
    expect(html).not.toMatch(/<script>alert/);
  });

  test("draw callouts as a themed note", () => {
    const html = renderBlocks([
      {
        type: "callout",
        attrs: { type: "tip", title: "Tip" },
        content: [text("Three tiers")],
      },
    ]);
    expect(html).toContain('role="note"');
    expect(html).toContain('data-type="tip"');
    expect(html).toContain("Three tiers");
  });
});
