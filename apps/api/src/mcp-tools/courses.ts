import { createPlatformError } from "@codelitdev/platform";
import { parseDocsMarkdown } from "@frontlit/text-editor/docs";
import { z } from "zod";
import { createLesson, createSection, getProduct } from "../catalog.js";
import type { McpToolModule } from "./context.js";

const outlineInputSchema = z.object({
  productId: z.string().min(1),
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        lessons: z
          .array(
            z.object({
              title: z.string().trim().min(1).max(200),
              markdown: z
                .string()
                .max(200_000)
                .optional()
                .describe(
                  "Lesson body in Markdown (headings, emphasis, lists, links, code blocks, tables). Raw HTML is not allowed.",
                ),
              status: z.enum(["draft", "published"]).optional(),
            }),
          )
          .max(100)
          .default([]),
      }),
    )
    .min(1)
    .max(50),
});

type OutlineInput = z.infer<typeof outlineInputSchema>;

const titleKey = (title: string) => title.trim().toLowerCase();

/** Markdown to the lesson editor's document, or the line it failed on. */
function lessonDocument(
  markdown: string | undefined,
): { ok: true; content: Record<string, unknown> } | { ok: false; line: number | null } {
  if (!markdown?.trim()) return { ok: true, content: { type: "doc", content: [] } };
  try {
    const parsed = parseDocsMarkdown(markdown, { frontmatter: false });
    return { ok: true, content: parsed.content as Record<string, unknown> };
  } catch (error) {
    const diagnostics = (error as { diagnostics?: Array<{ line?: number }> })
      .diagnostics;
    return { ok: false, line: diagnostics?.[0]?.line ?? null };
  }
}

export const courseTools: McpToolModule = (deps) => [
  {
    name: "courses.outline.apply",
    description:
      "Adds sections and text lessons to a course or download in one call, in the order given. A section or lesson whose title already exists (same section, case-insensitive) is kept as it is and not duplicated, so the call is safe to retry or to extend an outline. Lesson bodies are Markdown. New lessons are drafts unless status is published; the product's own status is unchanged. For video, audio, PDF, file, embed, quiz or SCORM lessons, use api.write with createLesson.",
    risk: "write",
    inputSchema: outlineInputSchema,
    async handler({ context, args }) {
      const input = args as OutlineInput;
      // Validate every lesson body before writing anything.
      const documents = new Map<string, Record<string, unknown>>();
      for (const [sectionIndex, section] of input.sections.entries()) {
        for (const [lessonIndex, lesson] of section.lessons.entries()) {
          const document = lessonDocument(lesson.markdown);
          if (!document.ok) {
            return {
              error: createPlatformError("validation_failed", {
                safeDetails: {
                  reason: "unsupported_markdown",
                  section: sectionIndex,
                  lesson: lessonIndex,
                  line: document.line,
                },
              }),
            };
          }
          documents.set(`${sectionIndex}:${lessonIndex}`, document.content);
        }
      }

      const product = await getProduct(
        deps.db,
        { schoolId: context.tenantId!, publicId: context.publicSchoolId },
        input.productId,
        { kind: "admin" },
      );
      if (!product.ok) return { error: product.error };
      const existingSections = new Map(
        product.value.sections.map((section) => [titleKey(section.title), section]),
      );
      // Lesson ids by title, per section.
      const existingLessons = new Map<string, Map<string, string>>();
      for (const lesson of product.value.lessons) {
        const key = lesson.sectionId ?? "";
        const titles = existingLessons.get(key) ?? new Map<string, string>();
        titles.set(titleKey(lesson.title), lesson.id);
        existingLessons.set(key, titles);
      }

      const sections = [];
      let createdSections = 0;
      let createdLessons = 0;
      for (const [sectionIndex, sectionInput] of input.sections.entries()) {
        let section = existingSections.get(titleKey(sectionInput.title));
        const sectionCreated = !section;
        if (!section) {
          const created = await createSection(
            deps.db,
            context,
            input.productId,
            { title: sectionInput.title },
            deps.clock,
          );
          if (!created.ok) return { error: created.error };
          section = created.value;
          existingSections.set(titleKey(section.title), section);
          createdSections += 1;
        }
        const titles = existingLessons.get(section.id) ?? new Map<string, string>();
        existingLessons.set(section.id, titles);
        const lessons = [];
        for (const [lessonIndex, lessonInput] of sectionInput.lessons.entries()) {
          const existingId = titles.get(titleKey(lessonInput.title));
          if (existingId) {
            lessons.push({ id: existingId, title: lessonInput.title, created: false });
            continue;
          }
          const created = await createLesson(
            deps.db,
            context,
            input.productId,
            {
              title: lessonInput.title,
              type: "text",
              content: documents.get(`${sectionIndex}:${lessonIndex}`)!,
              sectionId: section.id,
              status: lessonInput.status,
            },
            deps.clock,
          );
          if (!created.ok) return { error: created.error };
          titles.set(titleKey(lessonInput.title), created.value.id);
          createdLessons += 1;
          lessons.push({
            id: created.value.id,
            title: created.value.title,
            created: true,
          });
        }
        sections.push({
          id: section.id,
          title: section.title,
          created: sectionCreated,
          lessons,
        });
      }
      return {
        productId: input.productId,
        created: { sections: createdSections, lessons: createdLessons },
        sections,
      };
    },
  },
];
