import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import { listContacts } from "./contacts.js";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { createSchool } from "./schools.js";
import { seedWorld } from "./seed.js";
import { encryptIntegrationSecret } from "./utils/integration-secrets.js";

describe("contact list paging", () => {
  it("asks SendLit for the page by its number, so no contact is skipped", async () => {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-thirty-two-characters";
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "test-secret-that-is-at-least-thirty-two-characters";
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    const created = await createSchool(
      runtime.db,
      {
        name: "Paging School",
        subdomain: "paging-school",
        locale: "en",
        currency: "USD",
        principalId: world.owner.id,
        requestId: "req-paging",
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
        remoteTeamId: "team_paging",
        encryptedTeamKey: encryptIntegrationSecret("sl_paging_key"),
      })
      .where(
        and(
          eq(schema.schoolIntegrations.schoolId, school!.id),
          eq(schema.schoolIntegrations.provider, "sendlit"),
        ),
      );

    const requested: URL[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requested.push(new URL(String(input)));
      return new Response(JSON.stringify({ items: [], total: 120 }));
    }) as typeof fetch;

    try {
      const ctx = {
        schoolId: school!.id,
        publicSchoolId: created.value.id,
        principalId: world.owner.id,
        requestId: "req-paging",
        permissions: new Set<never>(),
      };
      const config = { server: "http://sendlit.test", provisioningApiKey: null };
      for (const page of [1, 2, 3]) {
        const result = await listContacts(runtime.db, ctx, { page, rowsPerPage: 50 }, clock, {
          config,
        });
        expect(result.total).toBe(120);
      }
      // SendLit skips (offset - 1) * rowsPerPage rows: `offset` is the page.
      expect(requested.map((url) => url.searchParams.get("offset"))).toEqual(["1", "2", "3"]);
      expect(requested.every((url) => url.searchParams.get("rowsPerPage") === "50")).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      await runtime.close();
    }
  });
});
