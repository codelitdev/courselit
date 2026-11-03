import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import { startSequence } from "./sendlit-service.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

describe("starting a sequence", () => {
  it("asks for a mailing address instead of failing with a vague error", async () => {
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

    let mailingAddress: string | null = null;
    const started: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/settings/general") && (init?.method ?? "GET") === "GET") {
        return new Response(JSON.stringify({ mailingAddress }));
      }
      if (url.includes("/start")) {
        started.push(url);
        return new Response(JSON.stringify({ status: "active" }));
      }
      return new Response("{}", { status: 404 });
    }) as typeof fetch;

    try {
      const blocked = await startSequence(runtime.db, school!.id, clock, "seq_1");
      expect(blocked.ok).toBe(false);
      if (!blocked.ok) {
        expect(blocked.error.code).toBe("conflict");
        expect(blocked.error.safeDetails).toMatchObject({
          reason: "Add your mailing address in Mails → Settings before sending email.",
        });
      }
      // Nothing was started while the address was missing.
      expect(started).toHaveLength(0);

      mailingAddress = "   ";
      expect((await startSequence(runtime.db, school!.id, clock, "seq_1")).ok).toBe(false);

      mailingAddress = "12 Sprite Lane, Portland, OR 97201";
      const ok = await startSequence(runtime.db, school!.id, clock, "seq_1");
      expect(ok.ok).toBe(true);
      expect(started).toHaveLength(1);
    } finally {
      globalThis.fetch = originalFetch;
      await runtime.close();
    }
  });
});
