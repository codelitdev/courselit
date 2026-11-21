/**
 * Main's lesson types to the rewrite's (docs/wip/lesson-pages.md, section 8):
 *
 * | Main              | New                                                         |
 * |-------------------|-------------------------------------------------------------|
 * | text              | page; main's Tiptap doc normalized to the lesson profile     |
 * | video, audio, pdf | page with one matching media block, plus a File block when   |
 * |                   | main marked it downloadable                                  |
 * | embed             | page with one Embed block (a bare YouTube or Vimeo URL, which |
 * |                   | main played as a video, becomes a Video block)               |
 * | quiz              | page with one Quiz block; IDs generated; pass mark carried   |
 * | file              | page with a File block in a course; `file` in a download     |
 * | scorm             | scorm                                                        |
 *
 * Media blocks start empty: main's media can't be referenced until MediaLit
 * media is imported (lessons with media are refused before this runs).
 */
import type { Quiz } from "@courselit/api-contract/quiz";
import { LESSON_IMAGE_HOSTS, lessonProfile } from "@courselit/lesson-content";
import {
  isAllowedImageUrl,
  isBase64Image,
  parseVideoUrl,
  validateContent,
} from "@frontlit/text-editor/blocks";

type Json = Record<string, unknown>;
type Node = { type: string; attrs?: Json; content?: Node[]; marks?: Json[]; text?: string };

export type MainLessonType =
  | "text"
  | "video"
  | "audio"
  | "pdf"
  | "file"
  | "embed"
  | "quiz"
  | "scorm";

/** What the import changed while normalizing a lesson, for the run's report. */
export type LessonImportWarning =
  | "base64_image_dropped"
  | "external_image_linked"
  | "image_dropped"
  | "unknown_node_converted"
  | "heading_level_changed"
  | "content_flattened";

export type ImportedLesson = {
  type: "page" | "scorm" | "file";
  content: Json;
  warnings: LessonImportWarning[];
};

const isRecord = (value: unknown): value is Json =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const TEXT_NODES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
]);

/** All text inside a node, blocks separated by newlines. */
function textOf(value: unknown): string {
  if (!isRecord(value)) return "";
  if (typeof value.text === "string") return value.text;
  if (!Array.isArray(value.content)) return "";
  const parts = value.content.map(textOf).filter(Boolean);
  return parts.join(value.type === "paragraph" ? "" : "\n");
}

const paragraph = (text: string, marks?: Json[]): Node =>
  text
    ? { type: "paragraph", content: [{ type: "text", text, ...(marks ? { marks } : {}) }] }
    : { type: "paragraph" };

/** Text with only the marks the lesson profile holds; links keep just their href. */
function normalizeText(node: Json): Node | null {
  if (typeof node.text !== "string" || !node.text) return null;
  const marks = (Array.isArray(node.marks) ? node.marks : [])
    .filter(isRecord)
    .filter((mark) => lessonProfile.marks.includes(mark.type as never))
    .map((mark) =>
      mark.type === "link" && isRecord(mark.attrs)
        ? { type: "link", attrs: { href: mark.attrs.href } }
        : { type: mark.type },
    );
  return { type: "text", text: node.text, ...(marks.length ? { marks } : {}) };
}

function normalizeNode(value: unknown, warn: (code: LessonImportWarning) => void): Node[] {
  if (!isRecord(value) || typeof value.type !== "string") return [];
  const type = value.type;
  const children = (Array.isArray(value.content) ? value.content : []).flatMap((child) =>
    normalizeNode(child, warn),
  );
  if (type === "text") {
    const text = normalizeText(value);
    return text ? [text] : [];
  }
  if (type === "image") {
    const attrs = isRecord(value.attrs) ? value.attrs : {};
    const src = attrs.src;
    if (isBase64Image(src)) {
      warn("base64_image_dropped");
      return [];
    }
    if (isAllowedImageUrl(src, LESSON_IMAGE_HOSTS)) {
      return [
        {
          type: "image",
          attrs: {
            src,
            alt: typeof attrs.alt === "string" ? attrs.alt : "",
            title: typeof attrs.title === "string" ? attrs.title : null,
          },
        },
      ];
    }
    if (typeof src === "string" && /^https:\/\//i.test(src)) {
      warn("external_image_linked");
      const label = typeof attrs.alt === "string" && attrs.alt.trim() ? attrs.alt : "Image";
      return [paragraph(label, [{ type: "link", attrs: { href: src } }])];
    }
    warn("image_dropped");
    return [];
  }
  if (type === "heading") {
    const level = isRecord(value.attrs) ? Number(value.attrs.level) : 2;
    const allowed = lessonProfile.headingLevels as readonly number[];
    const next = allowed.includes(level) ? level : level < 2 ? 2 : 4;
    if (next !== level) warn("heading_level_changed");
    return [{ type, attrs: { level: next }, ...(children.length ? { content: children } : {}) }];
  }
  if (TEXT_NODES.has(type)) {
    const attrs = isRecord(value.attrs) ? value.attrs : undefined;
    return [
      {
        type,
        ...(attrs && type !== "paragraph" ? { attrs } : {}),
        ...(children.length ? { content: children } : {}),
      },
    ];
  }
  warn("unknown_node_converted");
  const text = textOf(value);
  return text ? [paragraph(text)] : [];
}

/**
 * Main's Tiptap document normalized to the lesson profile: unknown nodes
 * become paragraphs of their text, base64 images are dropped, images the
 * profile can't hold become links, headings move into 2–4, unknown marks go.
 * If the result still isn't a valid page, it is flattened to plain
 * paragraphs so no text is lost.
 */
export function normalizeMainDocument(
  input: unknown,
  warn: (code: LessonImportWarning) => void,
): Node[] {
  if (!isRecord(input) || input.type !== "doc" || !Array.isArray(input.content)) return [];
  const blocks = input.content.flatMap((child) => normalizeNode(child, warn));
  const valid = validateContent(lessonProfile, { type: "doc", content: blocks });
  if (valid.content && !valid.diagnostics.some((item) => item.blocksSave)) {
    return (valid.content.content ?? []) as Node[];
  }
  warn("content_flattened");
  return input.content
    .map(textOf)
    .flatMap((text) => text.split("\n"))
    .filter((line) => line.trim())
    .map((line) => paragraph(line));
}

/** A page, in canonical form; null when the lesson profile can't hold it. */
function page(content: Node[], warnings: LessonImportWarning[]): ImportedLesson | null {
  const valid = validateContent(lessonProfile, { type: "doc", content });
  if (!valid.content || valid.diagnostics.some((item) => item.blocksSave)) return null;
  return { type: "page", content: valid.content as Json, warnings: [...new Set(warnings)] };
}

export function importMainLesson(input: {
  type: MainLessonType;
  content: Json;
  downloadable: boolean;
  productKind: "course" | "download";
  /** Main's quiz in the rewrite's shape (see `quizFromMainContent`). */
  quiz?: Quiz;
}): ImportedLesson | null {
  const warnings: LessonImportWarning[] = [];
  const warn = (code: LessonImportWarning) => warnings.push(code);
  const text = () => normalizeMainDocument(input.content, warn);
  switch (input.type) {
    case "scorm":
      return { type: "scorm", content: input.content, warnings };
    case "file":
      if (input.productKind === "download") return { type: "file", content: {}, warnings };
      return page([{ type: "file", attrs: { media: null, label: null } }, ...text()], warnings);
    case "text":
      return page(text(), warnings);
    case "quiz":
      return page(input.quiz ? [{ type: "quiz", attrs: input.quiz }] : [], warnings);
    case "embed": {
      const code = typeof input.content.value === "string" ? input.content.value : "";
      const hosted = parseVideoUrl(code.trim());
      if (hosted) {
        return page(
          [{ type: "video", attrs: { media: null, ...hosted, caption: null } }],
          warnings,
        );
      }
      return page([{ type: "embed", attrs: { code, title: null, height: null } }], warnings);
    }
    case "video":
    case "audio":
    case "pdf": {
      const block: Node = { type: input.type, attrs: { media: null } };
      const download: Node[] = input.downloadable
        ? [{ type: "file", attrs: { media: null, label: null } }]
        : [];
      return page([block, ...download, ...text()], warnings);
    }
  }
}
