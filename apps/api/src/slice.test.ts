import { describe, expect, it } from "bun:test";
import { contract } from "@courselit/api-contract";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { LEARNER_SESSION_COOKIE } from "./learners.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { textDoc } from "./test-content.js";

function cookieFrom(headers?: Record<string, string>) {
  const header = headers?.["Set-Cookie"];
  if (!header) throw new Error("missing_set_cookie");
  return header.split(";", 1)[0]!;
}

describe.serial("first vertical slice", () => {
  it("creates a school, invites a teammate, and keeps membership school-scoped", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    await runtime.db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.id, world.outsider.id));

    const catalog = await dispatch(runtime, {
      method: "GET",
      path: "/v1/billing/catalog",
      headers: { cookie: world.owner.sessionCookie },
    });
    expect(catalog.status).toBe(200);
    const catalogBody = catalog.body as {
      catalogRevision: number | null;
      checkoutAvailable: boolean;
      offers: Array<{ catalogKey: string }>;
    };
    expect(catalogBody.checkoutAvailable).toBe(true);
    expect(catalogBody.offers.some((offer) => offer.catalogKey === "pro_month")).toBe(
      true,
    );

    const missingPlan = await dispatch(runtime, {
      method: "POST",
      path: "/v1/schools",
      headers: { cookie: world.owner.sessionCookie },
      body: { name: "Unpaid School", subdomain: "unpaid-school" },
    });
    expect(missingPlan.status).toBe(400);
    expect(missingPlan.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "paid_plan_required" },
    });

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/schools",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-request-id": "req_school_create",
      },
      body: {
        name: "Slice School",
        subdomain: "slice-school",
        plan: "pro",
        interval: "month",
        catalogRevision: catalogBody.catalogRevision,
      },
    });
    expect(created.status).toBe(201);
    const school = created.body as {
      id: string;
      name: string;
      subdomain: string;
      status: string;
      locale: string;
      currency: string;
      checkoutUrl?: string;
    };
    expect(school).toMatchObject({
      name: "Slice School",
      subdomain: "slice-school",
      status: "active",
      locale: "en",
      currency: "USD",
    });
    expect(school.checkoutUrl).toMatch(/^https?:\/\//);

    const invited = await dispatch(runtime, {
      method: "POST",
      path: "/v1/invitations",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
        "x-request-id": "req_invite",
      },
      body: {
        email: world.outsider.email,
        role: "member",
        permissions: ["products:read", "products:write"],
      },
    });
    expect(invited.status).toBe(201);
    const invitation = invited.body as { id: string; token: string };

    const accepted = await dispatch(runtime, {
      method: "POST",
      path: "/v1/invitations/accept",
      headers: {
        cookie: world.outsider.sessionCookie,
        "x-request-id": "req_accept",
      },
      body: { token: invitation.token, email: world.outsider.email },
    });
    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({ ok: true, schoolId: school.id });

    const teammateSchools = await dispatch(runtime, {
      method: "GET",
      path: "/v1/schools",
      headers: { cookie: world.outsider.sessionCookie },
    });
    expect(teammateSchools.status).toBe(200);
    const teammateItems = (teammateSchools.body as { items: Array<{ id: string }> })
      .items;
    expect(teammateItems.map((item) => item.id)).toEqual([school.id]);

    const updatedSchool = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/schools/${school.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": school.id,
        "x-request-id": "req_school_update",
      },
      body: { currency: "inr" },
    });
    expect(updatedSchool.status).toBe(200);
    expect(updatedSchool.body).toMatchObject({ id: school.id, currency: "INR" });

    const memberUpdate = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/schools/${school.id}`,
      headers: {
        cookie: world.outsider.sessionCookie,
        "x-school-id": school.id,
      },
      body: { currency: "EUR" },
    });
    expect(memberUpdate.status).toBe(403);

    const listedAfterUpdate = await dispatch(runtime, {
      method: "GET",
      path: "/v1/schools",
      headers: { cookie: world.owner.sessionCookie },
    });
    expect(listedAfterUpdate.status).toBe(200);
    expect(
      (listedAfterUpdate.body as { items: Array<{ id: string; currency: string }> })
        .items,
    ).toContainEqual(expect.objectContaining({ id: school.id, currency: "INR" }));

    const outsiderOnSeeded = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: {
        cookie: world.outsider.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(outsiderOnSeeded.status).toBe(403);
    expect(outsiderOnSeeded.body).toMatchObject({ code: "tenant_forbidden" });

    const schoolEvents = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "school.created"));
    expect(
      schoolEvents.some(
        (event) =>
          event.resourceId === school.id &&
          event.actorId === world.owner.id &&
          event.requestId === "req_school_create" &&
          event.schoolId,
      ),
    ).toBe(true);
    const inviteEvents = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "invitation.created"));
    expect(
      inviteEvents.some(
        (event) => event.actorId === world.owner.id && event.requestId === "req_invite",
      ),
    ).toBe(true);
    const schoolUpdateEvents = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "school.updated"));
    expect(
      schoolUpdateEvents.some(
        (event) =>
          event.resourceId === school.id &&
          event.actorId === world.owner.id &&
          event.requestId === "req_school_update",
      ),
    ).toBe(true);
    await runtime.close();
  });

  it("publishes a free course with one lesson and hides unpublished content", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
        "x-request-id": "req_product_create",
      },
      body: {
        kind: "course",
        title: "Free slice course",
        description: "A free course",
      },
    });
    expect(created.status).toBe(201);
    const product = created.body as { id: string; status: string; kind: string };
    expect(product).toMatchObject({ kind: "course", status: "draft" });

    const productDetail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${product.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(productDetail.status).toBe(200);
    expect(productDetail.body).toMatchObject({
      sections: [{ title: "First section", position: 1 }],
    });

    const lessonCreated = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${product.id}/lessons`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
        "x-request-id": "req_lesson_create",
      },
      body: { title: "Lesson one", content: textDoc("Secret draft body") },
    });
    expect(lessonCreated.status).toBe(201);
    const lesson = lessonCreated.body as {
      id: string;
      status: string;
      content: Record<string, unknown>;
    };
    expect(lesson).toMatchObject({
      title: "Lesson one",
      status: "draft",
      content: textDoc("Secret draft body"),
    });

    const publicDraft = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${product.id}`,
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(publicDraft.status).toBe(404);

    const publishedCourse = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${product.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
        "x-request-id": "req_product_publish",
      },
      body: { status: "published" },
    });
    expect(publishedCourse.status).toBe(200);

    const publicCourseDraftLesson = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${product.id}`,
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(publicCourseDraftLesson.status).toBe(200);
    const publicBody = publicCourseDraftLesson.body as {
      status: string;
      lessons: Array<{ id: string; content: Record<string, unknown> | null }>;
    };
    expect(publicBody.status).toBe("published");
    expect(publicBody.lessons).toEqual([]);

    const publishedLesson = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lesson.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
        "x-request-id": "req_lesson_publish",
      },
      body: { status: "published" },
    });
    expect(publishedLesson.status).toBe(200);

    const publicPublished = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${product.id}`,
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(publicPublished.status).toBe(200);
    const visible = publicPublished.body as {
      lessons: Array<{
        id: string;
        content: Record<string, unknown> | null;
        title: string;
      }>;
    };
    expect(visible.lessons).toHaveLength(1);
    expect(visible.lessons[0]).toMatchObject({
      id: lesson.id,
      title: "Lesson one",
      content: null,
    });

    const adminRead = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${product.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(
      (
        adminRead.body as {
          lessons: Array<{ content: Record<string, unknown> | null }>;
        }
      ).lessons[0]?.content,
    ).toEqual(textDoc("Secret draft body"));

    const crossSchool = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${product.id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(crossSchool.status).toBe(404);

    const publishEvents = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "product.published"));
    expect(
      publishEvents.some(
        (event) =>
          event.resourceId === product.id &&
          event.actorId === world.owner.id &&
          event.requestId === "req_product_publish",
      ),
    ).toBe(true);
    await runtime.close();
  });

  it("keeps learners distinct, enrolls in a free course, and completes a lesson idempotently", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const course = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { kind: "course", title: "Learner course", description: "free" },
    });
    const productId = (course.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { status: "published" },
    });
    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { title: "Only lesson", content: textDoc("Do the work") },
    });
    const lessonId = (lesson.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${lessonId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { status: "published" },
    });

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: {
        "x-request-id": "req_learner_signup",
        "x-forwarded-host": "school-a.localhost:3001",
      },
      body: {
        email: world.owner.email,
        password: "learner-password-1",
        name: "Pat Learner",
      },
    });
    expect(signedUp.status).toBe(201);
    const learnerCookie = cookieFrom(signedUp.headers);
    expect(learnerCookie.startsWith(`${LEARNER_SESSION_COOKIE}=`)).toBe(true);
    expect(learnerCookie).not.toBe(world.owner.sessionCookie);

    const adminWithLearnerCookie = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products",
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
    });
    expect(adminWithLearnerCookie.status).toBe(401);

    const enrolled = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/enrollments",
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
        "x-request-id": "req_enroll",
      },
      body: { productId },
    });
    expect(enrolled.status).toBe(201);
    expect(enrolled.body).toMatchObject({
      productId,
      source: "free_signup",
      status: "active",
      schoolId: world.schoolA.publicId,
    });

    const myContent = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/products",
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
    });
    expect(myContent.status).toBe(200);
    expect(myContent.body).toMatchObject({
      items: [{ id: productId, title: "Learner course", kind: "course" }],
    });

    const enrolledRead = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
    });
    expect(
      (
        enrolledRead.body as {
          lessons: Array<{ content: Record<string, unknown> | null }>;
        }
      ).lessons[0]?.content,
    ).toEqual(textDoc("Do the work"));

    const first = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
        "x-request-id": "req_complete",
      },
      body: {},
    });
    const second = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolA.publicId,
        "x-request-id": "req_complete_again",
      },
      body: {},
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    const progressRows = await runtime.db.select().from(schema.lessonProgress);
    expect(progressRows).toHaveLength(1);

    const completedMyContent = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/products",
      headers: { cookie: learnerCookie, "x-school-id": world.schoolA.publicId },
    });
    expect(completedMyContent.body).toMatchObject({
      items: [
        {
          id: productId,
          totalLessons: 1,
          completedLessonsCount: 1,
          certificateId: null,
        },
      ],
    });

    const replay = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/lessons/${lessonId}/complete`,
      headers: {
        cookie: learnerCookie,
        "x-school-id": world.schoolB.publicId,
      },
      body: {},
    });
    expect(replay.status).toBe(403);
    expect(replay.body).toMatchObject({ code: "tenant_forbidden" });

    const otherSchoolProduct = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: { cookie: learnerCookie, "x-school-id": world.schoolB.publicId },
    });
    expect(otherSchoolProduct.status).toBe(403);

    const enrollEvents = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "enrollment.created"));
    expect(
      enrollEvents.some(
        (event) =>
          event.requestId === "req_enroll" && event.schoolId === world.schoolA.id,
      ),
    ).toBe(true);
    const completeEvents = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "lesson.completed"));
    expect(completeEvents).toHaveLength(1);
    expect(completeEvents[0]?.requestId).toBe("req_complete");
    await runtime.close();
  });

  it("serves the same access-filtered product read over REST and MCP", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const { validateParityManifest } = await import("@codelitdev/mcp-server-kit");
    const { mcpParityManifest } = await import("@courselit/api-contract");
    const { createCourseLitMcp } = await import("./mcp.js");
    const mcp = createCourseLitMcp(runtime);
    const issues = validateParityManifest([...mcpParityManifest], {
      restOperationIds: new Set(Object.keys(contract)),
      mcpToolNames: new Set(mcp.listTools().map((tool) => tool.name)),
      mcpToolRisks: new Map(
        mcp.listTools().map((tool) => [tool.name, tool.risk] as const),
      ),
      now: new Date("2026-09-02T00:00:00.000Z"),
    });
    expect(issues).toEqual([]);
    expect(mcp.listTools().some((tool) => tool.name === "products.get")).toBe(true);

    const course = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { kind: "course", title: "Parity course", description: "shared" },
    });
    const productId = (course.body as { id: string }).id;
    const lesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { title: "Parity lesson", content: textDoc("admin visible") },
    });
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { status: "published" },
    });
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/lessons/${(lesson.body as { id: string }).id}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { status: "published" },
    });

    const rest = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
      },
    });
    const mcpRead = await dispatch(runtime, {
      method: "POST",
      path: "/mcp",
      headers: {
        authorization: `Bearer ${world.owner.oauthToken}`,
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "products.get", arguments: { productId } },
      },
    });
    expect(rest.status).toBe(200);
    expect(mcpRead.status).toBe(200);
    const mcpJson = (
      mcpRead.body as {
        result: { content: Array<{ json: unknown }> };
      }
    ).result.content[0]?.json;
    expect(mcpJson).toEqual(rest.body);
    await runtime.close();
  });

  it("deletes a lesson within its school and records the deletion", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const productResponse = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { kind: "course", title: "Delete lesson course", description: "" },
    });
    const productId = (productResponse.body as { id: string }).id;
    const lessonResponse = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { title: "Lesson to delete", content: textDoc("Temporary content") },
    });
    const lessonId = (lessonResponse.body as { id: string }).id;

    const deleted = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/lessons/${lessonId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
        "x-request-id": "req_lesson_delete",
      },
    });
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ id: lessonId });

    const detail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(detail.status).toBe(200);
    expect((detail.body as { lessons: unknown[] }).lessons).toEqual([]);
    const events = await runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "lesson.deleted"));
    expect(events.some((event) => event.resourceId === lessonId)).toBe(true);
    await runtime.close();
  });

  it("lets OSS admins create unlimited schools without a paid plan", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);

    const catalog = await dispatch(runtime, {
      method: "GET",
      path: "/v1/billing/catalog",
      headers: { cookie: world.owner.sessionCookie },
    });
    expect(catalog.status).toBe(200);
    expect(catalog.body).toMatchObject({
      catalogRevision: null,
      checkoutAvailable: false,
      offers: [],
    });

    const first = await dispatch(runtime, {
      method: "POST",
      path: "/v1/schools",
      headers: { cookie: world.owner.sessionCookie },
      body: { name: "OSS One", subdomain: "oss-one" },
    });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ name: "OSS One", subdomain: "oss-one" });
    expect((first.body as { checkoutUrl?: string }).checkoutUrl).toBeUndefined();

    const second = await dispatch(runtime, {
      method: "POST",
      path: "/v1/schools",
      headers: { cookie: world.owner.sessionCookie },
      body: { name: "OSS Two", subdomain: "oss-two" },
    });
    expect(second.status).toBe(201);
    expect(second.body).toMatchObject({ name: "OSS Two", subdomain: "oss-two" });

    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/schools",
      headers: { cookie: world.owner.sessionCookie },
    });
    expect(listed.status).toBe(200);
    const names = (listed.body as { items: Array<{ name: string }> }).items.map(
      (item) => item.name,
    );
    expect(names).toEqual(expect.arrayContaining(["OSS One", "OSS Two"]));
    await runtime.close();
  });
});
