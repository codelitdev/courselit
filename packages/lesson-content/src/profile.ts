import {
  audio,
  callout,
  defineProfile,
  embed,
  file,
  image,
  pdf,
  video,
} from "@frontlit/text-editor/blocks";
import { quizBlock } from "./quiz-block.ts";

/** Unsplash is the only external image host (L6); its images never enter the media library. */
export const LESSON_IMAGE_HOSTS = ["images.unsplash.com"];

/**
 * The lesson page format (docs/wip/lesson-pages.md, section 4.1). Text:
 * paragraph, headings 2–4, lists, quote, code block, simple tables, links,
 * divider. Underline and highlight are left out because Markdown can't hold
 * them, and every lesson must round-trip through Markdown for the API.
 * Limits follow FrontLit's docs (L7): 1 MB, 20,000 nodes, depth 64.
 */
export const lessonProfile = defineProfile({
  base: {
    headings: { levels: [2, 3, 4] },
    marks: { exclude: ["underline", "highlight"] },
  },
  blocks: [
    image({ media: true, hosts: LESSON_IMAGE_HOSTS }),
    video(),
    audio(),
    pdf(),
    file(),
    embed(),
    callout(),
    quizBlock,
  ],
  limits: { bytes: 1024 * 1024, nodes: 20_000, depth: 64 },
  options: { tables: "simple" },
});

/** Block names in the lesson format. */
export type LessonBlockName =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "file"
  | "embed"
  | "callout"
  | "quiz";
