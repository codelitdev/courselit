import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createExpressApp } from "./express-app.js";
import { createAdminNotification, createLearnerNotification } from "./notifications.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  marker: string,
) {
  let output = "";
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) throw new Error("notification_stream_closed");
    output += new TextDecoder().decode(chunk.value);
    if (output.includes(marker)) return output;
  }
}

describe("admin notifications", () => {
  it("lists, marks, and isolates school-admin notifications", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    await createAdminNotification(
      runtime.db,
      { schoolId: world.schoolA.id, adminUserId: world.owner.id },
      {
        type: "community_post_created",
        title: "New community post",
        body: "A learner posted in a community.",
        href: "/communities",
      },
      clock,
    );

    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const listed = await dispatch(runtime, {
      method: "GET",
      path: "/v1/notifications",
      headers,
    });
    expect(listed.status).toBe(200);
    const item = (
      listed.body as { items: Array<{ id: string; readAt: string | null }> }
    ).items[0];
    expect(item).toMatchObject({ readAt: null });

    const read = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/notifications/${item.id}/read`,
      headers,
      body: {},
    });
    expect(read.status).toBe(200);
    expect((read.body as { readAt: string | null }).readAt).not.toBeNull();

    const schoolB = await dispatch(runtime, {
      method: "GET",
      path: "/v1/notifications",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(schoolB.status).toBe(200);
    expect((schoolB.body as { items: unknown[] }).items).toHaveLength(0);
    await runtime.close();
  });

  it("streams admin and learner notifications to authenticated portals", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "notification-learner@example.com",
        password: "learner-password-1",
        name: "Notification Learner",
      },
    });
    expect(signedUp.status).toBe(201);
    const learnerCookie = signedUp.headers?.["Set-Cookie"]?.split(";", 1)[0];
    expect(learnerCookie).toBeTruthy();
    const learners = await runtime.db
      .select({ id: schema.schoolAccounts.id, publicId: schema.schoolAccounts.publicId })
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "notification-learner@example.com"))
      .limit(1);
    expect(learners).toHaveLength(1);

    const app = createExpressApp(runtime);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const listening = app.listen(0, () => resolve(listening));
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("listen_failed");

    let adminReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let learnerReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const adminResponse = await fetch(
        `http://127.0.0.1:${address.port}/v1/notifications/stream?schoolId=${encodeURIComponent(world.schoolA.publicId)}`,
        { headers: { cookie: world.owner.sessionCookie } },
      );
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.headers.get("content-type")).toContain("text/event-stream");
      adminReader = adminResponse.body?.getReader();
      if (!adminReader) throw new Error("admin_stream_body_missing");
      await readUntil(adminReader, ": connected");

      const learnerResponse = await fetch(
        `http://127.0.0.1:${address.port}/v1/learner/notifications/stream`,
        { headers: { cookie: learnerCookie! } },
      );
      expect(learnerResponse.status).toBe(200);
      expect(learnerResponse.headers.get("content-type")).toContain(
        "text/event-stream",
      );
      learnerReader = learnerResponse.body?.getReader();
      if (!learnerReader) throw new Error("learner_stream_body_missing");
      await readUntil(learnerReader, ": connected");

      await createAdminNotification(
        runtime.db,
        { schoolId: world.schoolA.id, adminUserId: world.owner.id },
        {
          type: "community_membership_requested",
          title: "New community membership request",
          body: "A learner requested to join a community.",
        },
        clock,
      );
      await createLearnerNotification(
        runtime.db,
        { schoolId: world.schoolA.id, schoolAccountId: learners[0]!.id },
        {
          type: "community_membership_granted",
          title: "Community membership approved",
          body: "Your membership was approved.",
        },
        clock,
      );

      const [adminEvent, learnerEvent] = await Promise.all([
        readUntil(adminReader, "event: notification"),
        readUntil(learnerReader, "event: notification"),
      ]);
      expect(adminEvent).toContain('"title":"New community membership request"');
      expect(learnerEvent).toContain('"title":"Community membership approved"');
    } finally {
      await adminReader?.cancel();
      await learnerReader?.cancel();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await runtime.close();
    }
  });
});
