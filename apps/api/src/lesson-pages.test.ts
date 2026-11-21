import { describe, expect, it } from "bun:test";
import { uuidv7 } from "@codelitdev/platform";
import { contract } from "@courselit/api-contract";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  lessonBlockAvailability,
  lessonContentError,
  lessonTypeAllowed,
  unavailableLessonBlocks,
} from "./lesson-pages.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { dispatch } from "./test-learner-auth.js";

type Lesson = {
  id: string;
  type: string;
  content: Record<string, unknown>;
  markdown: string | null;
  contentVersion: number;
};

async function setup(billingMode: "cloud" | "oss" = "cloud") {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({ clock, billingMode });
  const world = await seedWorld(runtime, clock);
  const headers = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };
  const call = (method: string, path: string, body?: unknown) =>
    dispatch(runtime, { method, path, headers, body });
  const newProduct = async (kind: "course" | "download") => {
    const created = await call("POST", "/v1/products", { kind, title: `A ${kind}` });
    expect(created.status).toBe(201);
    return (created.body as { id: string }).id;
  };
  const upload = async (fileName: string, mimeType: string) => {
    const authorization = await call("POST", "/v1/media/upload-authorizations", {
      fileName,
      mimeType,
      byteSize: 2048,
      purpose: "lesson_media",
      accessPolicy: "private",
    });
    expect(authorization.status).toBe(201);
    const finalized = await call("POST", "/v1/media", {
      uploadId: (authorization.body as { uploadId: string }).uploadId,
      accessPolicy: "private",
    });
    expect(finalized.status).toBe(201);
    return (finalized.body as { id: string }).id;
  };
  return { clock, runtime, world, call, newProduct, upload };
}

const reason = (body: unknown) =>
  (body as { details?: { reason?: string } }).details?.reason;
const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("lesson types", () => {
  it("takes page and SCORM in courses, file in downloads, and nothing else", async () => {
    const t = await setup();
    try {
      const course = await t.newProduct("course");
      const download = await t.newProduct("download");
      const create = (productId: string, body: Record<string, unknown>) =>
        t.call("POST", `/v1/products/${productId}/lessons`, {
          title: "Lesson",
          ...body,
        });

      const page = await create(course, {});
      expect(page).toMatchObject({
        status: 201,
        body: { type: "page", content: doc(), markdown: "" },
      });
      contract.createLesson.responses[201].parse(page.body);
      expect(reason((await create(course, { type: "file" })).body)).toBe(
        "lesson_type_not_allowed",
      );
      expect(reason((await create(download, { type: "page" })).body)).toBe(
        "lesson_type_not_allowed",
      );
      const file = await create(download, { type: "file" });
      expect(file).toMatchObject({
        status: 201,
        body: { type: "file", markdown: null },
      });
      for (const old of ["text", "video", "audio", "pdf", "embed", "quiz"]) {
        expect((await create(course, { type: old })).status).toBe(400);
      }
      // Pages hold their media in blocks, and file lessons hold no authored content.
      const media = await t.upload("a.mp4", "video/mp4");
      expect(reason((await create(course, { mediaId: media })).body)).toBe(
        "lesson_media_not_allowed",
      );
      expect(
        reason((await create(download, { type: "file", markdown: "Hi" })).body),
      ).toBe("lesson_content_not_allowed");
    } finally {
      await t.runtime.close();
    }
  });
});

describe("lesson page writes", () => {
  it("takes Markdown or JSON, not both, and returns both forms to authors", async () => {
    const t = await setup();
    try {
      const course = await t.newProduct("course");
      const created = await t.call("POST", `/v1/products/${course}/lessons`, {
        title: "Pricing",
        markdown:
          '## Why pricing matters\n\n<Callout type="tip">\n\nStart with three tiers.\n\n</Callout>\n\n<Quiz passingGrade={70}>\n\n<Question text="Anchor?">\n\n<Option text="Top" correct />\n\n<Option text="Middle" />\n\n</Question>\n\n</Quiz>\n',
      });
      expect(created.status).toBe(201);
      const lesson = created.body as Lesson;
      expect(
        (lesson.content.content as Array<{ type: string }>).map((n) => n.type),
      ).toEqual(["heading", "callout", "quiz"]);
      // The returned Markdown carries the generated IDs, for the next edit.
      expect(lesson.markdown).toMatch(
        /<Quiz id="qz_[A-Za-z0-9]+" passingGrade=\{70\}>/,
      );

      const read = await t.call("GET", `/v1/lessons/${lesson.id}`);
      expect(read).toMatchObject({ status: 200, body: { markdown: lesson.markdown } });

      const both = await t.call("PATCH", `/v1/lessons/${lesson.id}`, {
        content: doc(),
        markdown: "x",
        expectedContentVersion: 1,
      });
      expect(both.status).toBe(400);
      const edited = await t.call("PATCH", `/v1/lessons/${lesson.id}`, {
        markdown: (lesson.markdown ?? "").replace("Middle", "Bottom"),
        expectedContentVersion: 1,
      });
      expect(edited).toMatchObject({ status: 200, body: { contentVersion: 2 } });
      expect((edited.body as Lesson).markdown).toContain('text="Bottom"');

      const invalid = await t.call("PATCH", `/v1/lessons/${lesson.id}`, {
        markdown: "<div>raw</div>",
        expectedContentVersion: 2,
      });
      expect(invalid).toMatchObject({
        status: 400,
        body: {
          details: {
            reason: "lesson_content_invalid",
            code: "unsupported_syntax",
            line: 1,
          },
        },
      });
      const diagnostics = JSON.parse(
        (invalid.body as { details: { diagnostics: string } }).details.diagnostics,
      );
      expect(diagnostics[0]).toMatchObject({ code: "unsupported_syntax", line: 1 });
    } finally {
      await t.runtime.close();
    }
  });

  it("refuses to publish an incomplete page and keeps drafts saving", async () => {
    const t = await setup();
    try {
      const course = await t.newProduct("course");
      const halfQuiz = doc({
        type: "quiz",
        attrs: { questions: [{ text: "Q", options: [] }] },
      });
      const draft = await t.call("POST", `/v1/products/${course}/lessons`, {
        title: "Draft",
        content: halfQuiz,
        status: "draft",
      });
      expect(draft.status).toBe(201);
      const publish = await t.call(
        "PATCH",
        `/v1/lessons/${(draft.body as Lesson).id}`,
        {
          status: "published",
        },
      );
      expect(publish).toMatchObject({
        status: 400,
        body: {
          details: { reason: "lesson_content_invalid", code: "incomplete_block" },
        },
      });
    } finally {
      await t.runtime.close();
    }
  });

  it("checks block media for ownership and MIME family, and records references (L5)", async () => {
    const t = await setup();
    try {
      const course = await t.newProduct("course");
      const video = await t.upload("talk.mp4", "video/mp4");
      const pdf = await t.upload("book.pdf", "application/pdf");
      const audio = await t.upload("talk.mp3", "audio/mpeg");
      const create = (content: unknown) =>
        t.call("POST", `/v1/products/${course}/lessons`, { title: "Media", content });

      expect(await create(doc({ type: "video", attrs: { media: pdf } }))).toMatchObject(
        {
          status: 400,
          body: {
            details: {
              reason: "lesson_media_type_mismatch",
              fieldPath: "content.content[0].attrs.media",
            },
          },
        },
      );
      expect(
        reason((await create(doc({ type: "audio", attrs: { media: video } }))).body),
      ).toBe("lesson_media_type_mismatch");
      expect(
        reason((await create(doc({ type: "pdf", attrs: { media: "med_nope" } }))).body),
      ).toBe("lesson_media_not_found");

      // Another school's media is not found either.
      const [foreign] = await t.runtime.db
        .insert(schema.media)
        .values({
          id: uuidv7(t.clock),
          publicId: "med_foreign",
          schoolId: t.world.schoolB.id,
          mediaLitId: "ml_foreign",
          canonicalUrl: "https://cdn.test/foreign.mp4",
          fileName: "foreign.mp4",
          mimeType: "video/mp4",
          byteSize: 10,
          kind: "video",
          createdAt: t.clock.now(),
          updatedAt: t.clock.now(),
        })
        .returning({ publicId: schema.media.publicId });
      expect(
        reason(
          (await create(doc({ type: "video", attrs: { media: foreign!.publicId } })))
            .body,
        ),
      ).toBe("lesson_media_not_found");

      // The same video as a player and a download is one reference.
      const ok = await create(
        doc(
          { type: "video", attrs: { media: video } },
          { type: "file", attrs: { media: video } },
          { type: "pdf", attrs: { media: pdf } },
          {
            type: "image",
            attrs: { src: "https://images.unsplash.com/photo-1", alt: "" },
          },
        ),
      );
      expect(ok.status).toBe(201);
      const lessonId = (ok.body as Lesson).id;
      const references = async () => {
        const [lesson] = await t.runtime.db
          .select({ id: schema.lessons.id })
          .from(schema.lessons)
          .where(eq(schema.lessons.publicId, lessonId));
        const rows = await t.runtime.db
          .select({ publicId: schema.media.publicId })
          .from(schema.mediaReferences)
          .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
          .where(
            and(
              eq(schema.mediaReferences.resourceType, "lesson_content"),
              eq(schema.mediaReferences.resourceInternalId, lesson!.id),
            ),
          );
        return rows.map((row) => row.publicId).sort();
      };
      expect(await references()).toEqual([pdf, video].sort());

      const trimmed = await t.call("PATCH", `/v1/lessons/${lessonId}`, {
        content: doc({ type: "pdf", attrs: { media: pdf } }),
        expectedContentVersion: 1,
      });
      expect(trimmed.status).toBe(200);
      // The draft drops the video, but the published page still uses it, so
      // it stays referenced until the draft is published (or discarded).
      expect(await references()).toEqual([pdf, video].sort());
      const swapped = await t.call("PATCH", `/v1/lessons/${lessonId}`, {
        content: doc({ type: "audio", attrs: { media: audio } }),
        expectedContentVersion: 2,
      });
      expect(swapped.status).toBe(200);
      expect(await references()).toEqual([audio, pdf, video].sort());
      const discarded = await t.call(
        "POST",
        `/v1/lessons/${lessonId}/discard-draft`,
        {},
      );
      expect(discarded.status).toBe(200);
      expect(await references()).toEqual([pdf, video].sort());
      await t.call("PATCH", `/v1/lessons/${lessonId}`, {
        content: doc({ type: "pdf", attrs: { media: pdf } }),
        expectedContentVersion: (discarded.body as Lesson).contentVersion,
      });
      const published = await t.call(
        "POST",
        `/v1/lessons/${lessonId}/publish-content`,
        {},
      );
      expect(published.status).toBe(200);
      expect(await references()).toEqual([pdf]);
    } finally {
      await t.runtime.close();
    }
  });
});

describe("lesson content format", () => {
  it("describes the lesson blocks, with Embed available on a paid plan", async () => {
    const t = await setup();
    try {
      const format = await t.call("GET", "/v1/lesson-content-format");
      expect(format.status).toBe(200);
      const parsed = contract.getLessonContentFormat.responses[200].parse(format.body);
      expect(parsed.blocks.map((block) => block.name)).toContain("quiz");
      expect(
        parsed.blocks.find((block) => block.name === "embed")?.unavailable,
      ).toBeUndefined();
      // It describes the format only: nothing about a lesson's answers.
      expect(JSON.stringify(format.body)).not.toContain('"correct":true');
    } finally {
      await t.runtime.close();
    }
  });

  it("keeps Embed available on self-hosted installs", async () => {
    const t = await setup("oss");
    try {
      const format = await t.call("GET", "/v1/lesson-content-format");
      const embed = (
        format.body as { blocks: Array<{ name: string; unavailable?: string }> }
      ).blocks.find((block) => block.name === "embed");
      expect(embed).toBeDefined();
      expect(embed?.unavailable).toBeUndefined();
    } finally {
      await t.runtime.close();
    }
  });
});

describe("lessonBlockAvailability", () => {
  const unpaid = {
    commercialState: async () => ({ activePaidPlan: null, subscriptionStatus: null }),
    hasFeature: async () => false,
  } as never;

  it("makes Embed unavailable on a trial (L4) and on no plan", async () => {
    const t = await setup();
    try {
      const deps = { db: t.runtime.db, billing: unpaid, now: t.clock.now() };
      expect(await lessonBlockAvailability(deps, t.world.schoolA.id)).toEqual({
        embed: "plan_required",
      });
      await t.runtime.db.insert(schema.schoolTrials).values({
        id: uuidv7(t.clock),
        userId: "trial-user",
        normalizedEmail: "trial@example.com",
        schoolId: t.world.schoolA.id,
        startedAt: t.clock.now(),
        endsAt: new Date(t.clock.now().getTime() + 14 * 86_400_000),
      });
      expect(await lessonBlockAvailability(deps, t.world.schoolA.id)).toEqual({
        embed: "trial",
      });
      // School A's own (Pro) plan includes code injection.
      expect(
        await lessonBlockAvailability(
          { db: t.runtime.db, billing: t.runtime.billing.billing, now: t.clock.now() },
          t.world.schoolA.id,
        ),
      ).toEqual({});
    } finally {
      await t.runtime.close();
    }
  });
});

describe("lesson page helpers", () => {
  it("maps plan features to unavailable blocks", () => {
    expect(unavailableLessonBlocks(() => true, false)).toEqual({});
    expect(unavailableLessonBlocks(() => false, true)).toEqual({ embed: "trial" });
    expect(unavailableLessonBlocks(() => false, false)).toEqual({
      embed: "plan_required",
    });
  });

  it("allows lesson types by product kind", () => {
    expect(lessonTypeAllowed("course", "page")).toBe(true);
    expect(lessonTypeAllowed("course", "scorm")).toBe(true);
    expect(lessonTypeAllowed("course", "file")).toBe(false);
    expect(lessonTypeAllowed("download", "file")).toBe(true);
    expect(lessonTypeAllowed("download", "page")).toBe(false);
  });

  it("turns diagnostics into flat error details", () => {
    const error = lessonContentError([
      {
        code: "unsafe_url",
        message: "Bad link",
        severity: "error",
        blocksSave: true,
        blocksPublish: true,
        fieldPath: "content.content[0]",
      },
    ]);
    expect(error).toMatchObject({
      code: "validation_failed",
      safeDetails: {
        reason: "lesson_content_invalid",
        diagnosticCount: 1,
        code: "unsafe_url",
        fieldPath: "content.content[0]",
        line: null,
      },
    });
    expect(
      Object.values(error.safeDetails ?? {}).every(
        (value) => typeof value !== "object" || value === null,
      ),
    ).toBe(true);
    expect(
      lessonContentError([
        {
          code: "block_unavailable",
          message: "Embed can't be added (trial).",
          severity: "error",
          blocksSave: true,
          blocksPublish: true,
          reason: "trial",
        },
      ]),
    ).toMatchObject({
      code: "forbidden",
      safeDetails: { reason: "plan_required", blockReason: "trial" },
    });
  });
});
