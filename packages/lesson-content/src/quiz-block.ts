/**
 * The Quiz block of a lesson page (docs/wip/lesson-pages.md, section 5.1).
 * Server-safe: no React. The admin editor and the storefront add their own
 * UI and renderer for it in their apps.
 *
 * Attributes: `id`, `passingGrade` (0–100 or null) and
 * `questions: [{ id, text, options: [{ id, text, correct }] }]`.
 *
 * Markdown form (canonical, as `serializeMarkdown` writes it):
 *
 * ```md
 * <Quiz id="qz_4" passingGrade={70}>
 *
 * <Question id="q1" text="Which tier anchors the price?">
 *
 * <Option id="o1" text="The top tier" correct />
 *
 * <Option id="o2" text="The middle tier" />
 *
 * </Question>
 *
 * </Quiz>
 * ```
 *
 * On read, a question's text may also be a plain paragraph inside
 * `<Question>`, and an option's text the content of `<Option>…</Option>`.
 */
import { QUIZ_ID_PATTERN, QUIZ_LIMITS } from "@courselit/api-contract/quiz";
import type {
  BlockSchema,
  MarkdownReadContext,
  MarkdownWriteContext,
} from "@frontlit/text-editor/blocks";

/** Character caps on quiz text, so a quiz can't carry a document's worth of text. */
export const QUIZ_TEXT_LIMITS = { question: 2000, option: 500 } as const;

type Json = Record<string, unknown>;
type JsonNode = { type?: string; attrs?: Json; content?: JsonNode[] };
type MdNode = Parameters<MarkdownReadContext["fail"]>[0];
type MdElement = Parameters<MarkdownReadContext["props"]>[0];
type MdAttribute = NonNullable<ReturnType<MarkdownWriteContext["prop"]>>;

const isRecord = (value: unknown): value is Json =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isOptionalId = (value: unknown) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && QUIZ_ID_PATTERN.test(value));

const ID_MESSAGE = "Quiz, question and option IDs are 1–64 letters, digits, _ or -.";

/** Shape and size of `questions`; completeness (text, answers) is checked before publishing. */
export function checkQuizQuestions(value: unknown): true | string {
  if (!Array.isArray(value)) return "Quiz questions must be a list.";
  if (value.length > QUIZ_LIMITS.questions) {
    return `A quiz holds at most ${QUIZ_LIMITS.questions} questions.`;
  }
  for (const question of value) {
    if (!isRecord(question)) return "Each quiz question must be an object.";
    for (const key of Object.keys(question)) {
      if (!["id", "text", "options"].includes(key)) {
        return `Unsupported quiz question field: ${key}.`;
      }
    }
    if (!isOptionalId(question.id)) return ID_MESSAGE;
    if (question.text !== undefined && typeof question.text !== "string") {
      return "Question text must be text.";
    }
    if (
      typeof question.text === "string" &&
      question.text.length > QUIZ_TEXT_LIMITS.question
    ) {
      return `Question text is at most ${QUIZ_TEXT_LIMITS.question} characters.`;
    }
    if (question.options !== undefined && !Array.isArray(question.options)) {
      return "Question options must be a list.";
    }
    const options = (question.options ?? []) as unknown[];
    if (options.length > QUIZ_LIMITS.optionsPerQuestion) {
      return `A question holds at most ${QUIZ_LIMITS.optionsPerQuestion} options.`;
    }
    for (const option of options) {
      if (!isRecord(option)) return "Each option must be an object.";
      for (const key of Object.keys(option)) {
        if (!["id", "text", "correct"].includes(key)) {
          return `Unsupported quiz option field: ${key}.`;
        }
      }
      if (!isOptionalId(option.id)) return ID_MESSAGE;
      if (option.text !== undefined && typeof option.text !== "string") {
        return "Option text must be text.";
      }
      if (
        typeof option.text === "string" &&
        option.text.length > QUIZ_TEXT_LIMITS.option
      ) {
        return `Option text is at most ${QUIZ_TEXT_LIMITS.option} characters.`;
      }
      if (option.correct !== undefined && typeof option.correct !== "boolean") {
        return "Option correct must be true or false.";
      }
    }
  }
  return true;
}

/** Canonical attributes: fixed key order, `correct` always a boolean. */
export function canonicalQuizAttrs(attrs: Json): Json {
  const questions = Array.isArray(attrs.questions) ? attrs.questions : [];
  return {
    id: attrs.id ?? null,
    passingGrade: attrs.passingGrade ?? null,
    questions: questions.filter(isRecord).map((question) => ({
      id: question.id ?? null,
      text: typeof question.text === "string" ? question.text : "",
      options: (Array.isArray(question.options) ? question.options : [])
        .filter(isRecord)
        .map((option) => ({
          id: option.id ?? null,
          text: typeof option.text === "string" ? option.text : "",
          correct: option.correct === true,
        })),
    })),
  };
}

/** Plain text of Markdown inline content; anything richer is refused. */
function plainText(node: MdNode, ctx: MarkdownReadContext, what: string): string {
  const record = node as unknown as {
    type: string;
    value?: string;
    children?: MdNode[];
  };
  if (record.type === "text" || record.type === "inlineCode") return record.value ?? "";
  if (record.type === "paragraph") {
    return (record.children ?? []).map((child) => plainText(child, ctx, what)).join("");
  }
  return ctx.fail(node, `${what} is plain text.`, "unsupported_syntax");
}

/**
 * `<Option id="o1" correct>The top tier</Option>` on a line of its own
 * reaches us as raw HTML (a one-line tag with text isn't a flow element).
 * Only that exact form is read: literal `id` and `text`-less props, plain
 * text, nothing else.
 */
const OPTION_LINE =
  /^<Option((?:\s+(?:id="[A-Za-z0-9_-]{1,64}"|correct(?:=\{(?:true|false)\})?))*)\s*>([^<>{}]*)<\/Option>$/;

function optionsFromHtml(node: MdNode, ctx: MarkdownReadContext): Json[] {
  const value = (node as unknown as { value?: string }).value ?? "";
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = OPTION_LINE.exec(line);
      if (!match)
        return ctx.fail(
          node,
          "Raw HTML is not allowed in <Question>.",
          "unsupported_syntax",
        );
      const props = match[1] ?? "";
      const id = /id="([^"]+)"/.exec(props)?.[1] ?? null;
      const correct = /correct(?!=\{false\})/.test(props);
      return { id, text: (match[2] ?? "").trim(), correct };
    });
}

function readOption(element: MdElement, ctx: MarkdownReadContext): Json {
  const props = ctx.props(element, ["id", "text", "correct"]);
  if (!isOptionalId(props.id)) ctx.fail(element, ID_MESSAGE, "unsupported_attribute");
  if (props.correct !== undefined && typeof props.correct !== "boolean") {
    ctx.fail(
      element,
      "<Option> correct must be true or false.",
      "unsupported_attribute",
    );
  }
  if (props.text !== undefined && typeof props.text !== "string") {
    ctx.fail(element, "<Option> text must be text.", "unsupported_attribute");
  }
  const children = element.children.filter((child) => child.type !== "definition");
  if (props.text !== undefined && children.length) {
    ctx.fail(element, "<Option> takes text or children, not both.", "invalid_document");
  }
  const text =
    typeof props.text === "string"
      ? props.text
      : children.map((child) => plainText(child, ctx, "Option text")).join("\n");
  return { id: props.id ?? null, text: text.trim(), correct: props.correct === true };
}

function readQuestion(element: MdElement, ctx: MarkdownReadContext): Json {
  const props = ctx.props(element, ["id", "text"]);
  if (!isOptionalId(props.id)) ctx.fail(element, ID_MESSAGE, "unsupported_attribute");
  if (props.text !== undefined && typeof props.text !== "string") {
    ctx.fail(element, "<Question> text must be text.", "unsupported_attribute");
  }
  const textParts: string[] = [];
  const options: Json[] = [];
  for (const child of element.children) {
    if (child.type === "definition") continue;
    if (child.type === "mdxJsxFlowElement" && child.name === "Option") {
      options.push(readOption(child, ctx));
    } else if (child.type === "html") {
      options.push(...optionsFromHtml(child, ctx));
    } else if (child.type === "paragraph" && !options.length) {
      textParts.push(plainText(child, ctx, "Question text"));
    } else {
      ctx.fail(
        child,
        "<Question> holds its text, then <Option> tags.",
        "invalid_document",
      );
    }
  }
  if (props.text !== undefined && textParts.length) {
    ctx.fail(
      element,
      "<Question> takes a text prop or a text paragraph, not both.",
      "invalid_document",
    );
  }
  const text = typeof props.text === "string" ? props.text : textParts.join("\n");
  return { id: props.id ?? null, text: text.trim(), options };
}

export const quizBlock: BlockSchema = {
  name: "quiz",
  tag: "Quiz",
  group: "block",
  attrs: {
    id: {
      default: null,
      type: "string",
      validate: (value) => isOptionalId(value) || ID_MESSAGE,
      description:
        "Quiz ID. Leave it out on create; the saved lesson returns it. Keep it when editing.",
    },
    passingGrade: {
      default: null,
      type: "number",
      validate: (value) =>
        value === null ||
        (typeof value === "number" &&
          Number.isFinite(value) &&
          value >= 0 &&
          value <= 100) ||
        "passingGrade is a number from 0 to 100.",
      description: "Pass mark in percent, 0–100. Without one every attempt passes.",
    },
    questions: {
      default: [],
      type: "Question[]",
      markdown: false,
      validate: checkQuizQuestions,
      description: "Questions, written as <Question> tags holding <Option> tags.",
    },
  },
  fromMarkdown(element, ctx) {
    const props = ctx.props(element, ["id", "passingGrade"]);
    const questions = ctx
      .elements(element, ["Question"])
      .map((child) => readQuestion(child, ctx));
    const attrs = {
      id: props.id ?? null,
      passingGrade: props.passingGrade ?? null,
      questions,
    };
    for (const [key, spec] of Object.entries(quizBlock.attrs)) {
      const check = spec.validate(attrs[key as keyof typeof attrs]);
      if (check !== true) {
        ctx.fail(
          element,
          typeof check === "string" ? check : `Invalid quiz ${key}.`,
          "invalid_document",
        );
      }
    }
    return { type: "quiz", attrs: canonicalQuizAttrs(attrs) };
  },
  toMarkdown(node, ctx) {
    const attrs = canonicalQuizAttrs((node.attrs ?? {}) as Json);
    const bare = (name: string): MdAttribute => ({
      type: "mdxJsxAttribute",
      name,
      value: null,
    });
    const questions = attrs.questions as {
      id: string | null;
      text: string;
      options: { id: string | null; text: string; correct: boolean }[];
    }[];
    return ctx.element(
      "Quiz",
      [
        ctx.prop("id", attrs.id),
        attrs.passingGrade === null
          ? undefined
          : ctx.prop("passingGrade", String(attrs.passingGrade), true),
      ],
      questions.map((question) =>
        ctx.element(
          "Question",
          [ctx.prop("id", question.id), ctx.prop("text", question.text)],
          question.options.map((option) =>
            ctx.element("Option", [
              ctx.prop("id", option.id),
              ctx.prop("text", option.text),
              option.correct ? bare("correct") : undefined,
            ]),
          ),
        ),
      ),
    );
  },
  validate(node, ctx) {
    const attrs = (node as JsonNode).attrs ?? {};
    if (checkQuizQuestions(attrs.questions ?? []) !== true) return;
    const seen = new Set<string>();
    const claim = (id: unknown, path: string) => {
      if (typeof id !== "string") return;
      if (seen.has(id))
        ctx.report("invalid_document", `Duplicate quiz ID: ${id}.`, path);
      seen.add(id);
    };
    claim(attrs.id, `${ctx.path}.attrs.id`);
    (attrs.questions as Json[] | undefined)?.forEach((question, q) => {
      claim(question.id, `${ctx.path}.attrs.questions[${q}].id`);
      (question.options as Json[] | undefined)?.forEach((option, o) => {
        claim(option.id, `${ctx.path}.attrs.questions[${q}].options[${o}].id`);
      });
    });
  },
  normalize: (node) => ({
    ...node,
    attrs: canonicalQuizAttrs((node.attrs ?? {}) as Json),
  }),
  docs: {
    summary:
      "A graded quiz; at most one per lesson. Each <Question> has a text prop and holds <Option> tags; mark right answers with correct. A question with several correct options is multiple-answer. Leave IDs out when creating; keep them when editing so learners' attempts stay attached.",
    example:
      '<Quiz passingGrade={70}>\n\n<Question text="Which tier anchors the price?">\n\n<Option text="The top tier" correct />\n\n<Option text="The middle tier" />\n\n</Question>\n\n</Quiz>',
    props: [
      {
        name: "Question",
        type: "child tag",
        required: true,
        description:
          '<Question id? text="…"> holding 2–20 <Option> tags; up to 100 per quiz.',
      },
      {
        name: "Option",
        type: "child tag",
        required: true,
        description:
          '<Option id? text="…" correct? />; at least one option per question is correct.',
      },
    ],
  },
};
