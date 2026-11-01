import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createGifClientFromEnv, type GifClient, HttpGiphyClient } from "./gifs.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { MemoryPaymentProvider } from "./test-payment-provider.js";

const GIF_URL = "https://media2.giphy.com/media/abc123/200.gif";

function learnerCookie(response: { headers?: Record<string, string> }) {
  const value = response.headers?.["Set-Cookie"];
  if (!value) throw new Error("missing_learner_cookie");
  return value.split(";", 1)[0]!;
}

function giphyFetch(requests: URL[], body: unknown, status = 200): typeof fetch {
  return (async (input: string | URL | Request) => {
    requests.push(new URL(input instanceof Request ? input.url : input));
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

async function setup(gifs?: GifClient) {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const runtime = await createPgliteRuntime({
    clock,
    paymentProvider: new MemoryPaymentProvider(),
    ...(gifs ? { gifs } : {}),
  });
  const world = await seedWorld(runtime, clock);
  const learner = await dispatch(runtime, {
    method: "POST",
    path: "/v1/learner/auth/sign-up",
    headers: { "x-school-id": world.schoolA.publicId },
    body: {
      schoolId: world.schoolA.publicId,
      email: "gif-learner@example.com",
      password: "learner-password-1",
      name: "Gif Learner",
    },
  });
  expect(learner.status).toBe(201);
  const learnerHeaders = {
    cookie: learnerCookie(learner),
    "x-school-id": world.schoolA.publicId,
  };
  return { clock, runtime, world, learnerHeaders };
}

describe("GIPHY client", () => {
  it("lists trending GIFs without a query and searches with one", async () => {
    const requests: URL[] = [];
    const client = new HttpGiphyClient(
      "giphy-secret",
      giphyFetch(requests, {
        data: [
          {
            id: "abc123",
            title: "Party",
            images: {
              fixed_height: { url: GIF_URL, width: "356", height: "200" },
              fixed_width_small: {
                url: "https://media2.giphy.com/media/abc123/100w.gif",
              },
            },
          },
          {
            id: "tracker",
            images: { fixed_height: { url: "https://evil.example/x.gif" } },
          },
          {
            id: "insecure",
            images: { fixed_height: { url: "http://media.giphy.com/x.gif" } },
          },
        ],
      }),
    );

    const trending = await client.search();
    const searched = await client.search("  party  ");

    expect(requests.map((url) => url.pathname)).toEqual([
      "/v1/gifs/trending",
      "/v1/gifs/search",
    ]);
    expect(requests[0]!.searchParams.get("api_key")).toBe("giphy-secret");
    expect(requests[0]!.searchParams.has("q")).toBe(false);
    expect(requests[1]!.searchParams.get("q")).toBe("party");
    for (const result of [trending, searched]) {
      expect(result).toEqual({
        configured: true,
        items: [
          {
            id: "abc123",
            url: GIF_URL,
            previewUrl: "https://media2.giphy.com/media/abc123/100w.gif",
            title: "Party",
            width: 356,
            height: 200,
          },
        ],
      });
    }
  });

  it("reports provider failures and an unset key", async () => {
    const failing = new HttpGiphyClient("giphy-secret", giphyFetch([], {}, 403));
    await expect(failing.search("cats")).rejects.toThrow("giphy_request_failed_403");
    expect(await createGifClientFromEnv({}).search("cats")).toEqual({
      configured: false,
      items: [],
    });
  });
});

describe.serial("learner GIF search", () => {
  it("proxies GIF search for signed-in learners without exposing the key", async () => {
    const queries: Array<string | undefined> = [];
    const { runtime, world, learnerHeaders } = await setup({
      search: async (query) => {
        queries.push(query);
        return {
          configured: true,
          items: [
            {
              id: "abc123",
              url: GIF_URL,
              previewUrl: GIF_URL,
              title: "Party",
              width: 356,
              height: 200,
            },
          ],
        };
      },
    });

    const anonymous = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/gifs?q=party",
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(anonymous.status).toBe(401);

    const searched = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/gifs?q=party",
      headers: learnerHeaders,
    });
    expect(searched.status).toBe(200);
    expect(searched.body).toMatchObject({
      configured: true,
      items: [{ id: "abc123", url: GIF_URL }],
    });
    const trending = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/gifs",
      headers: learnerHeaders,
    });
    expect(trending.status).toBe(200);
    expect(queries).toEqual(["party", undefined]);
    await runtime.close();
  });

  it("tells the storefront when GIF search is not configured", async () => {
    const disabled = await setup();
    const unconfigured = await dispatch(disabled.runtime, {
      method: "GET",
      path: "/v1/learner/gifs?q=party",
      headers: disabled.learnerHeaders,
    });
    expect(unconfigured.status).toBe(200);
    expect(unconfigured.body).toEqual({ configured: false, items: [] });
    await disabled.runtime.close();
  });

  it("returns a clear error when the GIF provider fails", async () => {
    const failing = await setup({
      search: async () => {
        throw new Error("giphy_request_failed_500");
      },
    });
    const failed = await dispatch(failing.runtime, {
      method: "GET",
      path: "/v1/learner/gifs?q=party",
      headers: failing.learnerHeaders,
    });
    expect(failed.status).toBe(502);
    expect(failed.body).toMatchObject({ message: "Unable to search GIFs." });
    await failing.runtime.close();
  });

  it("stores picked GIFs on a post as external links, not media", async () => {
    const { clock, runtime, world, learnerHeaders } = await setup();
    const [community] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    await runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.id, community!.id));
    await runtime.db.insert(schema.storefrontPlans).values({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      publicId: "pln_gif_community",
      schoolId: world.schoolA.id,
      entityType: "community",
      entityId: community!.publicId,
      name: "Community access",
      description: "",
      includedProducts: [],
      providerProductId: null,
      kind: "free",
      oneTimeAmount: null,
      emiAmount: null,
      emiTotalInstallments: null,
      subscriptionMonthlyAmount: null,
      subscriptionYearlyAmount: null,
      amountMinor: 0,
      billingInterval: null,
      installmentCount: null,
      status: "active",
      isDefault: true,
      createdBy: world.owner.id,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    const joined = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${community!.publicId}/checkout`,
      headers: { ...learnerHeaders, "idempotency-key": "gif-community-join" },
      body: { planId: "pln_gif_community", joiningReason: "" },
    });
    expect(joined.status).toBe(201);
    const spaces = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/spaces",
      headers: learnerHeaders,
    });
    const spaceId = (spaces.body as { items: Array<{ id: string }> }).items[0]!.id;

    const rejected = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${spaceId}/posts`,
      headers: learnerHeaders,
      body: {
        title: "Tracker",
        content: "Not a GIF",
        gifUrls: ["https://tracker.example.com/pixel.gif"],
      },
    });
    expect(rejected.status).toBe(400);

    const posted = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/spaces/${spaceId}/posts`,
      headers: learnerHeaders,
      body: { title: "Party time", content: "Look at this", gifUrls: [GIF_URL] },
    });
    expect(posted.status).toBe(201);
    const postId = (posted.body as { id: string }).id;

    const detail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/spaces/${spaceId}/posts/${postId}`,
      headers: learnerHeaders,
    });
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({ id: postId, media: [], gifUrls: [GIF_URL] });
    const media = await runtime.db
      .select()
      .from(schema.media)
      .where(eq(schema.media.schoolId, world.schoolA.id));
    expect(media.filter((item) => item.canonicalUrl === GIF_URL)).toEqual([]);

    const keptOnEdit = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learner/community-posts/${postId}`,
      headers: learnerHeaders,
      body: { title: "Party time!" },
    });
    expect(keptOnEdit.status).toBe(200);
    expect(keptOnEdit.body).toMatchObject({ gifUrls: [GIF_URL] });
    const removed = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learner/community-posts/${postId}`,
      headers: learnerHeaders,
      body: { gifUrls: [] },
    });
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({ gifUrls: [] });
    await runtime.close();
  });
});
