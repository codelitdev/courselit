import { describe, expect, it } from "bun:test";
import { createPgliteRuntime, freezeRuntimeClock } from "../runtime.js";
import { seedWorld } from "../seed.js";
import {
  hasRecentAuthentication,
  RECENT_AUTHENTICATION_MS,
} from "./recent-authentication.js";

describe("hasRecentAuthentication", () => {
  it("accepts a browser session signed into within the window and refuses older ones", async () => {
    // Better Auth stamps sessions with the real time.
    const signedInAround = new Date();
    const clock = freezeRuntimeClock(signedInAround);
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const headers = { cookie: world.owner.sessionCookie };
    const at = (offsetMs: number) =>
      freezeRuntimeClock(new Date(signedInAround.getTime() + offsetMs));

    expect(await hasRecentAuthentication(runtime.auth, headers, at(0))).toBe(true);
    expect(
      await hasRecentAuthentication(
        runtime.auth,
        headers,
        at(RECENT_AUTHENTICATION_MS - 60_000),
      ),
    ).toBe(true);
    expect(
      await hasRecentAuthentication(
        runtime.auth,
        headers,
        at(RECENT_AUTHENTICATION_MS + 60_000),
      ),
    ).toBe(false);
    // A session stamped well ahead of the API's clock is not trusted as recent.
    expect(
      await hasRecentAuthentication(runtime.auth, headers, at(-60 * 60 * 1000)),
    ).toBe(false);
    await runtime.close();
  });

  it("refuses a request with no browser session", async () => {
    const clock = freezeRuntimeClock(new Date());
    const runtime = await createPgliteRuntime({ clock });
    expect(await hasRecentAuthentication(runtime.auth, {}, clock)).toBe(false);
    await runtime.close();
  });
});
