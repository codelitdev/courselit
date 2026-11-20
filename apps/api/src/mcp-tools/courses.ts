import { emptyLessonDocument, prepareLessonContent } from "@courselit/lesson-content";
import { z } from "zod";
import { createLesson, createSection, getProduct } from "../catalog.js";
import { lessonBlockAvailability, lessonContentError } from "../lesson-pages.js";
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
                  "Lesson page in Markdown: headings (## to ####), emphasis, lists, links, code blocks, tables, and the block tags get_lesson_content_format lists (<Video>, <Callout>, <Quiz>, …). Raw HTML is not allowed.",
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

export const courseTools: McpToolModule = (deps) => [
  {
    name: "apply_course_outline",
    description:
      "Adds sections and page lessons to a course in one call, in the order given. A section or lesson whose title already exists (same section, case-insensitive) is kept as it is and not duplicated, so the call is safe to retry or to extend an outline. Each lesson page is Markdown and may hold any lesson block (video, audio, PDF, file, embed, callout, one quiz); call get_lesson_content_format for the tags. New lessons are drafts unless status is published; the product's own status is unchanged. For SCORM lessons, or files in a download product, use create_lesson.",
    risk: "write",
    inputSchema: outlineInputSchema,
    async handler({ context, args }) {
      const input = args as OutlineInput;
      // Validate every lesson page before writing anything.
      const unavailable = await lessonBlockAvailability(
        { db: deps.db, billing: deps.billing.billing, now: deps.clock.now() },
        context.tenantId!,
      );
      for (const [sectionIndex, section] of input.sections.entries()) {
        for (const [lessonIndex, lesson] of section.lessons.entries()) {
          if (!lesson.markdown?.trim()) continue;
          const prepared = prepareLessonContent(
            { markdown: lesson.markdown },
            { previous: emptyLessonDocument(), unavailable },
          );
          if (!prepared.ok) {
            const error = lessonContentError(prepared.diagnostics);
            return {
              error: {
                ...error,
                safeDetails: {
                  ...error.safeDetails,
                  section: sectionIndex,
                  lesson: lessonIndex,
                },
              },
            };
          }
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
      for (const sectionInput of input.sections) {
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
        for (const lessonInput of sectionInput.lessons) {
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
              type: "page",
              ...(lessonInput.markdown?.trim()
                ? { markdown: lessonInput.markdown }
                : {}),
              sectionId: section.id,
              status: lessonInput.status,
              unavailable,
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
