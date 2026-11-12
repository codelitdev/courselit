import { afterEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import {
  assertSequenceEmailsReady,
  startSequence,
  updateSequenceEmail,
} from "./sendlit-service.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

const text = (content: string) => ({ blockType: "text", settings: { content } });
const placeholder = {
  content: [text("# Start writing here\n\nAdd your message, links, and call to action.")],
};
const written = { content: [text("Real words")] };

type Email = {
  emailId: string;
  subject: string;
  content: unknown;
  delayInMillis: number;
  published: boolean;
};
const email = (over: Partial<Email> = {}): Email => ({
  emailId: "e1",
  subject: "Hello",
  content: written,
  delayInMillis: 0,
  published: true,
  ...over,
});

function reasonOf(fn: () => void): Record<string, unknown> | null {
  try {
    fn();
  } catch (error) {
    return { message: (error as Error).message };
  }
  return null;
}

describe("assertSequenceEmailsReady", () => {
  it("passes a broadcast with a written email", () => {
    expect(reasonOf(() => assertSequenceEmailsReady({ type: "broadcast", emails: [email()] }))).toBeNull();
  });
  it("rejects a broadcast with no email, a placeholder, or an empty subject", () => {
    expect(reasonOf(() => assertSequenceEmailsReady({ type: "broadcast", emails: [] }))).not.toBeNull();
    expect(reasonOf(() => assertSequenceEmailsReady({ type: "broadcast" }))).not.toBeNull();
    expect(
      reasonOf(() => assertSequenceEmailsReady({ type: "broadcast", emails: [email({ content: placeholder })] })),
    ).not.toBeNull();
    expect(
      reasonOf(() => assertSequenceEmailsReady({ type: "broadcast", emails: [email({ subject: " " })] })),
    ).not.toBeNull();
  });
  it("checks a broadcast email even when it is not marked published", () => {
    expect(
      reasonOf(() =>
        assertSequenceEmailsReady({
          type: "broadcast",
          emails: [email({ published: false, content: placeholder })],
        }),
      ),
    ).not.toBeNull();
  });
  it("only checks published emails of a sequence", () => {
    expect(
      reasonOf(() =>
        assertSequenceEmailsReady({
          type: "sequence",
          emails: [email(), email({ emailId: "e2", published: false, content: placeholder })],
        }),
      ),
    ).toBeNull();
    expect(reasonOf(() => assertSequenceEmailsReady({ type: "sequence", emails: [] }))).toBeNull();
    expect(
      reasonOf(() =>
        assertSequenceEmailsReady({
          type: "sequence",
          emails: [email(), email({ emailId: "e2", content: placeholder })],
        }),
      ),
    ).not.toBeNull();
  });
});

describe("sending through the service", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  async function setup() {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "test-secret-that-is-at-least-thirty-two-characters";
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    const created = await createSchool(
      runtime.db,
      {
        name: "Acme School",
        subdomain: "acme-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "req-1",
      },
      clock,
    );
    if (!created.ok) throw new Error("School creation failed");
    const [school] = await runtime.db
      .select()
      .from(schema.schools)
      .where(eq(schema.schools.publicId, created.value.id));
    await runtime.db
      .update(schema.schoolIntegrations)
      .set({
        status: "ready",
        remoteTeamId: "team_acme_1",
        encryptedTeamKey: encryptIntegrationSecret("sl_mock_team_key"),
        server: "http://127.0.0.1:4101",
      })
      .where(
        and(
          eq(schema.schoolIntegrations.schoolId, school!.id),
          eq(schema.schoolIntegrations.provider, "sendlit"),
        ),
      );
    return { runtime, clock, schoolId: school!.id };
  }

  function mockService(state: {
    sequence: Record<string, unknown>;
    started: string[];
    patched: unknown[];
  }) {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (url.includes("/settings/general")) {
        return new Response(JSON.stringify({ mailingAddress: "12 Sprite Lane" }));
      }
      if (url.endsWith("/sequences/seq_1") && method === "GET") {
        return new Response(JSON.stringify(state.sequence));
      }
      if (url.includes("/emails/e1") && method === "PATCH") {
        state.patched.push(JSON.parse(String(init?.body)));
        return new Response(JSON.stringify(email()));
      }
      if (url.includes("/start")) {
        state.started.push(url);
        return new Response(JSON.stringify({ status: "active" }));
      }
      return new Response("{}", { status: 404 });
    }) as typeof fetch;
  }

  it("refuses to start a broadcast that still has the placeholder body", async () => {
    const { runtime, clock, schoolId } = await setup();
    const state = {
      sequence: { sequenceId: "seq_1", type: "broadcast", emails: [email({ content: placeholder })] },
      started: [] as string[],
      patched: [] as unknown[],
    };
    mockService(state);
    try {
      const result = await startSequence(runtime.db, schoolId, clock, "seq_1");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("validation_failed");
        expect(result.error.safeDetails).toMatchObject({
          problem: "body_placeholder",
          emailId: "e1",
        });
        expect(String(result.error.safeDetails?.reason)).toContain("Start writing here");
      }
      expect(state.started).toHaveLength(0);
    } finally {
      await runtime.close();
    }
  });

  it("refuses to start a broadcast with an empty subject", async () => {
    const { runtime, clock, schoolId } = await setup();
    const state = {
      sequence: { sequenceId: "seq_1", type: "broadcast", emails: [email({ subject: "" })] },
      started: [] as string[],
      patched: [] as unknown[],
    };
    mockService(state);
    try {
      const result = await startSequence(runtime.db, schoolId, clock, "seq_1");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.safeDetails).toMatchObject({ problem: "subject_empty" });
      expect(state.started).toHaveLength(0);
    } finally {
      await runtime.close();
    }
  });

  it("names the email in a sequence and starts once it is edited", async () => {
    const { runtime, clock, schoolId } = await setup();
    const state = {
      sequence: {
        sequenceId: "seq_1",
        type: "sequence",
        emails: [email(), email({ emailId: "e2", content: placeholder })],
      } as Record<string, unknown>,
      started: [] as string[],
      patched: [] as unknown[],
    };
    mockService(state);
    try {
      const blocked = await startSequence(runtime.db, schoolId, clock, "seq_1");
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) {
        expect(String(blocked.error.safeDetails?.reason)).toStartWith("Email 2:");
        expect(blocked.error.safeDetails).toMatchObject({ emailId: "e2" });
      }
      state.sequence.emails = [email(), email({ emailId: "e2" })];
      const ok = await startSequence(runtime.db, schoolId, clock, "seq_1");
      expect(ok.ok).toBe(true);
      expect(state.started).toHaveLength(1);
    } finally {
      await runtime.close();
    }
  });

  it("blocks publishing a placeholder into an active sequence only", async () => {
    const { runtime, clock, schoolId } = await setup();
    const state = {
      sequence: {
        sequenceId: "seq_1",
        type: "sequence",
        status: "active",
        emails: [email({ published: false, content: placeholder })],
      } as Record<string, unknown>,
      started: [] as string[],
      patched: [] as unknown[],
    };
    mockService(state);
    try {
      const blocked = await updateSequenceEmail(runtime.db, schoolId, clock, "seq_1", "e1", {
        published: true,
      });
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) expect(blocked.error.code).toBe("validation_failed");
      expect(state.patched).toHaveLength(0);

      // Supplying real content in the same request is fine.
      const fixed = await updateSequenceEmail(runtime.db, schoolId, clock, "seq_1", "e1", {
        published: true,
        content: written,
      });
      expect(fixed.ok).toBe(true);

      // Saving a draft is never blocked.
      const draft = await updateSequenceEmail(runtime.db, schoolId, clock, "seq_1", "e1", {
        subject: "",
      });
      expect(draft.ok).toBe(true);

      // A sequence that is not sending yet may hold a published placeholder.
      state.sequence.status = "draft";
      const notLive = await updateSequenceEmail(runtime.db, schoolId, clock, "seq_1", "e1", {
        published: true,
      });
      expect(notLive.ok).toBe(true);

      // Subject cleared while publishing into an active sequence is blocked.
      state.sequence.status = "active";
      state.sequence.emails = [email()];
      const noSubject = await updateSequenceEmail(runtime.db, schoolId, clock, "seq_1", "e1", {
        published: true,
        subject: " ",
      });
      expect(noSubject.ok).toBe(false);
    } finally {
      await runtime.close();
    }
  });
});
