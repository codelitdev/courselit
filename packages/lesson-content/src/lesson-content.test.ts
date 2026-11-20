import { describe, expect, test } from "bun:test";
import { containsQuizAnswers, type QuizIdKind } from "@courselit/api-contract/quiz";
import {
  fillQuizIds,
  hasLessonQuiz,
  incompleteLessonBlocks,
  lessonContentFormat,
  lessonMarkdown,
  lessonMediaUses,
  mediaMatchesAcceptedTypes,
  prepareLessonContent,
  QUIZ_LIMIT_CODE,
  readLessonQuiz,
  stripLessonAnswers,
} from "./index.js";

function counterIds() {
  let n = 0;
  return (kind: QuizIdKind) => `${kind}_${++n}`;
}

const quizNode = (overrides: Record<string, unknown> = {}) => ({
  type: "quiz",
  attrs: {
    id: "qz_1",
    passingGrade: 70,
    questions: [
      {
        id: "q1",
        text: "Which tier anchors the price?",
        options: [
          { id: "o1", text: "The top tier", correct: true },
          { id: "o2", text: "The middle tier", correct: false },
        ],
      },
    ],
    ...overrides,
  },
});

const doc = (...content: unknown[]) => ({ type: "doc", content });
const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

function prepared(input: Parameters<typeof prepareLessonContent>[0], options = {}) {
  const result = prepareLessonContent(input, { newId: counterIds(), ...options });
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  return result;
}

function refused(input: Parameters<typeof prepareLessonContent>[0], options = {}) {
  const result = prepareLessonContent(input, { newId: counterIds(), ...options });
  if (result.ok) throw new Error("expected a refusal");
  return result.diagnostics;
}

describe("lesson Markdown", () => {
  const markdown = `## Why pricing matters

Most creators **undercharge**.

<Video media="med_123" caption="Walkthrough" />

<Callout type="tip">

Start with three tiers.

</Callout>

<Quiz id="qz_4" passingGrade={70}>

<Question id="q1" text="Which tier anchors the price?">

<Option id="o1" text="The top tier" correct />

<Option id="o2" text="The middle tier" />

</Question>

</Quiz>
`;

  test("parses every v1 block and round-trips through the canonical form", () => {
    const { content } = prepared({ markdown });
    expect(content.content?.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "video",
      "callout",
      "quiz",
    ]);
    expect(readLessonQuiz(content)).toEqual({
      id: "qz_4",
      passingGrade: 70,
      questions: [
        {
          id: "q1",
          text: "Which tier anchors the price?",
          options: [
            { id: "o1", text: "The top tier", correct: true },
            { id: "o2", text: "The middle tier", correct: false },
          ],
        },
      ],
    });
    expect(lessonMarkdown(content)).toBe(markdown);
  });

  test("reads question text as a paragraph and one-line options with text children", () => {
    const { content } = prepared({
      markdown: `<Quiz passingGrade={50}>

<Question id="q1">

Which tier anchors the price?

<Option id="o1" correct>The top tier</Option>
<Option id="o2">The middle tier</Option>

</Question>

</Quiz>`,
    });
    const quiz = readLessonQuiz(content);
    expect(quiz?.questions[0]?.text).toBe("Which tier anchors the price?");
    expect(quiz?.questions[0]?.options).toEqual([
      { id: "o1", text: "The top tier", correct: true },
      { id: "o2", text: "The middle tier", correct: false },
    ]);
  });

  test("fills missing quiz, question and option IDs", () => {
    const { content } = prepared({
      markdown:
        '<Quiz>\n\n<Question text="Q?">\n\n<Option text="A" correct />\n\n<Option text="B" />\n\n</Question>\n\n</Quiz>',
    });
    expect(readLessonQuiz(content)).toEqual({
      id: "quiz_1",
      passingGrade: null,
      questions: [
        {
          id: "question_2",
          text: "Q?",
          options: [
            { id: "option_3", text: "A", correct: true },
            { id: "option_4", text: "B", correct: false },
          ],
        },
      ],
    });
  });

  test("refuses raw HTML and expressions (L8)", () => {
    expect(refused({ markdown: "<div>hi</div>" })[0]?.code).toBe("unsupported_syntax");
    // Braces in prose are literal text, never evaluated.
    expect(prepared({ markdown: "Hello {1 + 1}" }).content.content?.[0]).toEqual(
      paragraph("Hello {1 + 1}"),
    );
    expect(refused({ markdown: '<Video media={"a" + "b"} />' }).length).toBeGreaterThan(
      0,
    );
    expect(
      refused({
        markdown:
          '<Quiz>\n\n<Question text="Q">\n\n<Option onClick="x">A</Option>\n\n</Question>\n\n</Quiz>',
      }).length,
    ).toBeGreaterThan(0);
  });

  test("refuses blocks outside the profile", () => {
    expect(
      refused({ markdown: '<Tabs>\n\n<Tab value="a">\n\nx\n\n</Tab>\n\n</Tabs>' })[0]
        ?.code,
    ).toBe("block_not_allowed");
    expect(refused({ markdown: '<Button label="Go" href="/x" />' })[0]?.code).toBe(
      "block_not_allowed",
    );
    expect(refused({ markdown: "# Top heading" }).length).toBeGreaterThan(0);
  });

  test("refuses incomplete blocks in Markdown, which arrives whole", () => {
    const diagnostics = refused({
      markdown:
        '<Quiz>\n\n<Question text="Q?">\n\n<Option text="A" />\n\n<Option text="B" />\n\n</Question>\n\n</Quiz>',
    });
    expect(diagnostics[0]?.code).toBe("incomplete_block");
  });
});

describe("lesson JSON", () => {
  test("accepts every v1 block", () => {
    const { content, incomplete } = prepared({
      content: doc(
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Intro" }],
        },
        { type: "image", attrs: { media: "med_img", src: null, alt: "x" } },
        {
          type: "image",
          attrs: { src: "https://images.unsplash.com/photo-1", alt: "x" },
        },
        { type: "video", attrs: { media: "med_vid" } },
        { type: "audio", attrs: { media: "med_aud" } },
        { type: "pdf", attrs: { media: "med_pdf" } },
        { type: "file", attrs: { media: "med_file" } },
        { type: "embed", attrs: { code: "<b>hi</b>" } },
        { type: "callout", attrs: { type: "tip" }, content: [paragraph("Tip")] },
        quizNode(),
      ),
    });
    expect(content.content).toHaveLength(10);
    expect(incomplete).toEqual([]);
  });

  test("returns incomplete quiz parts without refusing the save", () => {
    const { incomplete } = prepared({
      content: doc(quizNode({ questions: [{ text: "", options: [{ text: "A" }] }] })),
    });
    expect(incomplete.map((item) => item.fieldPath)).toEqual([
      "content.content[0].attrs.questions[0].text",
      "content.content[0].attrs.questions[0].options",
      "content.content[0].attrs.questions[0].options",
    ]);
    expect(incomplete.every((item) => !item.blocksSave && item.blocksPublish)).toBe(
      true,
    );
    expect(incompleteLessonBlocks(doc(quizNode({ questions: [] })))).toHaveLength(1);
  });

  test("allows at most one quiz, even nested in a callout", () => {
    const diagnostics = refused({
      content: doc(quizNode(), {
        type: "callout",
        attrs: { type: "tip" },
        content: [quizNode({ id: "qz_2" })],
      }),
    });
    expect(diagnostics.map((item) => [item.code, item.fieldPath])).toEqual([
      [QUIZ_LIMIT_CODE, "content.content[1].content[0]"],
    ]);
  });

  test("refuses duplicate and malformed quiz IDs (L7)", () => {
    const duplicate = refused({
      content: doc(
        quizNode({
          questions: [
            { id: "q1", text: "A", options: [{ id: "q1", text: "x", correct: true }] },
          ],
        }),
      ),
    });
    expect(duplicate[0]?.message).toContain("Duplicate quiz ID");
    expect(refused({ content: doc(quizNode({ id: "bad id!" })) }).length).toBe(1);
    expect(refused({ content: doc(quizNode({ id: "x".repeat(65) })) }).length).toBe(1);
  });

  test("caps questions per quiz and options per question (L7)", () => {
    const option = (i: number) => ({ id: `o${i}`, text: "x", correct: i === 0 });
    const tooManyOptions = Array.from({ length: 21 }, (_, i) => option(i));
    expect(
      refused({
        content: doc(
          quizNode({ questions: [{ id: "q", text: "Q", options: tooManyOptions }] }),
        ),
      }).length,
    ).toBe(1);
    const tooManyQuestions = Array.from({ length: 101 }, (_, i) => ({
      id: `q${i}`,
      text: "Q",
      options: [
        { id: `a${i}`, text: "A", correct: true },
        { id: `b${i}`, text: "B" },
      ],
    }));
    expect(
      refused({ content: doc(quizNode({ questions: tooManyQuestions })) }).length,
    ).toBe(1);
    expect(
      refused({
        content: doc(
          quizNode({
            questions: [{ id: "q", text: "Q", options: [], multiple: true }],
          }),
        ),
      })[0]?.message,
    ).toContain("Unsupported quiz question field");
  });

  test("refuses a document over the byte cap before parsing (L7)", () => {
    const diagnostics = refused({ content: doc(paragraph("x".repeat(1024 * 1024))) });
    expect(diagnostics[0]?.code).toBe("too_large");
    expect(refused({ markdown: "x".repeat(1024 * 1024 + 1) })[0]?.code).toBe(
      "too_large",
    );
  });

  test("refuses unsafe and off-list URLs (L6)", () => {
    const link = (href: string) =>
      doc({
        type: "paragraph",
        content: [
          { type: "text", text: "x", marks: [{ type: "link", attrs: { href } }] },
        ],
      });
    expect(refused({ content: link("javascript:alert(1)") })[0]?.code).toBe(
      "unsafe_url",
    );
    expect(refused({ content: link("data:text/html,hi") })[0]?.code).toBe("unsafe_url");
    prepared({ content: link("mailto:hi@example.com") });
    prepared({ content: link("/relative") });
    const image = (src: string) => doc({ type: "image", attrs: { src } });
    expect(
      refused({ content: image("https://tracker.example.com/p.gif") })[0]?.code,
    ).toBe("unsafe_url");
    expect(refused({ content: image("http://images.unsplash.com/p") })[0]?.code).toBe(
      "unsafe_url",
    );
    expect(
      refused({ markdown: '<Video url="https://evil.example.com/v" />' })[0]?.code,
    ).toBe("unsafe_url");
  });

  test("reduces YouTube URLs to an ID (L6)", () => {
    const { content } = prepared({
      markdown:
        '<Video url="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10&utm=x" />',
    });
    expect(content.content?.[0]?.attrs).toMatchObject({
      provider: "youtube",
      videoId: "dQw4w9WgXcQ",
      media: null,
    });
  });

  test("refuses adding an unavailable block but keeps existing ones (availability)", () => {
    const embed = { type: "embed", attrs: { code: "<b>x</b>" } };
    const unavailable = { embed: "trial" };
    const added = refused({ content: doc(embed) }, { previous: doc(), unavailable });
    expect(added[0]).toMatchObject({ code: "block_unavailable", reason: "trial" });
    prepared(
      { content: doc(embed, paragraph("edit")) },
      { previous: doc(embed), unavailable },
    );
    expect(
      refused({ content: doc(embed, embed) }, { previous: doc(embed), unavailable })[0]
        ?.code,
    ).toBe("block_unavailable");
  });
});

describe("stripLessonAnswers (L1)", () => {
  test("drops every correct flag and unknown quiz fields", () => {
    const stored = doc(paragraph("Intro"), {
      type: "callout",
      attrs: { type: "tip" },
      content: [
        quizNode({
          secret: "x",
          questions: [
            {
              id: "q1",
              text: "Pick two",
              hint: "nope",
              options: [
                { id: "a", text: "A", correct: true },
                { id: "b", text: "B", correct: true },
                { id: "c", text: "C", correct: false },
              ],
            },
          ],
        }),
      ],
    });
    const learner = stripLessonAnswers(stored);
    expect(containsQuizAnswers(learner)).toBe(false);
    expect(JSON.stringify(learner)).not.toContain("secret");
    expect(JSON.stringify(learner)).not.toContain("nope");
    expect(learner.content?.[1]?.content?.[0]).toEqual({
      type: "quiz",
      attrs: {
        id: "qz_1",
        passingGrade: 70,
        questions: [
          {
            id: "q1",
            text: "Pick two",
            multiple: true,
            options: [
              { id: "a", text: "A" },
              { id: "b", text: "B" },
              { id: "c", text: "C" },
            ],
          },
        ],
      },
    });
    expect(learner.content?.[0]).toEqual(paragraph("Intro"));
  });

  test("survives malformed quiz attributes and non-documents", () => {
    expect(
      containsQuizAnswers(stripLessonAnswers(doc({ type: "quiz", attrs: "x" }))),
    ).toBe(false);
    expect(
      containsQuizAnswers(
        stripLessonAnswers(
          doc({
            type: "quiz",
            attrs: { questions: [{ options: [{ correct: true }] }] },
          }),
        ),
      ),
    ).toBe(false);
    expect(stripLessonAnswers(null)).toEqual({ type: "doc", content: [] });
  });
});

describe("quiz lookup and IDs", () => {
  test("reads the page's quiz only when it is complete", () => {
    expect(readLessonQuiz(doc(paragraph("x")))).toBeNull();
    expect(hasLessonQuiz(doc(paragraph("x")))).toBe(false);
    expect(hasLessonQuiz(doc(quizNode({ questions: [] })))).toBe(true);
    expect(readLessonQuiz(doc(quizNode({ questions: [] })))).toBeNull();
    expect(readLessonQuiz(doc(quizNode()))?.id).toBe("qz_1");
  });

  test("fillQuizIds keeps existing IDs and never reuses one", () => {
    const ids = ["q1", "fresh"];
    const filled = fillQuizIds(
      doc(quizNode({ questions: [{ id: "q1", text: "x", options: [{ text: "a" }] }] })),
      () => ids.shift() ?? "late",
    ) as ReturnType<typeof doc>;
    const quiz = filled.content[0] as ReturnType<typeof quizNode>;
    expect(quiz.attrs.id).toBe("qz_1");
    expect(quiz.attrs.questions[0]?.options[0]?.id).toBe("fresh");
  });
});

describe("media", () => {
  test("lists every uploaded media ID with its block", () => {
    expect(
      lessonMediaUses(
        doc(
          { type: "image", attrs: { media: "m1" } },
          {
            type: "image",
            attrs: { src: "https://images.unsplash.com/x", media: null },
          },
          { type: "callout", content: [{ type: "video", attrs: { media: "m2" } }] },
          { type: "file", attrs: { media: "m2" } },
        ),
      ),
    ).toEqual([
      { mediaId: "m1", block: "image", path: "content.content[0].attrs.media" },
      {
        mediaId: "m2",
        block: "video",
        path: "content.content[2].content[0].attrs.media",
      },
      { mediaId: "m2", block: "file", path: "content.content[3].attrs.media" },
    ]);
  });

  test("matches MIME families", () => {
    const pdf = { fileName: "w.pdf", mimeType: "application/octet-stream" };
    expect(mediaMatchesAcceptedTypes(pdf, ["application/pdf", ".pdf"])).toBe(true);
    expect(mediaMatchesAcceptedTypes(pdf, ["video/*"])).toBe(false);
    expect(
      mediaMatchesAcceptedTypes({ fileName: "a", mimeType: "Video/MP4" }, ["video/*"]),
    ).toBe(true);
    expect(mediaMatchesAcceptedTypes({ fileName: "f", mimeType: "x/y" }, ["*/*"])).toBe(
      true,
    );
    expect(
      mediaMatchesAcceptedTypes({ fileName: "noext", mimeType: "x/y" }, [".t"]),
    ).toBe(false);
  });
});

describe("format reference", () => {
  test("lists the lesson blocks, the quiz and unavailable blocks", () => {
    const format = lessonContentFormat({ embed: "trial" });
    expect(format.blocks.map((block) => block.name)).toEqual([
      "image",
      "video",
      "audio",
      "pdf",
      "file",
      "embed",
      "callout",
      "quiz",
    ]);
    expect(format.blocks.find((block) => block.name === "embed")?.unavailable).toBe(
      "trial",
    );
    expect(format.markdown.headingLevels).toEqual([2, 3, 4]);
    expect(format.limits).toEqual({ bytes: 1024 * 1024, nodes: 20_000, depth: 64 });
    const quiz = format.blocks.find((block) => block.name === "quiz");
    expect(prepared({ markdown: quiz?.example ?? "" }).ok).toBe(true);
  });
});
