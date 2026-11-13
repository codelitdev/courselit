import { afterEach, describe, expect, it, mock } from "bun:test";
import { contactTagsApi, tagSequenceHref } from "./contact-tags";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return calls;
}

describe("contactTagsApi", () => {
  it("lists tags for the school", async () => {
    const calls = stubFetch(200, { items: [{ tag: "vip", contactCount: 3 }] });
    expect(await contactTagsApi("sch_1").listTags()).toEqual([
      { tag: "vip", contactCount: 3 },
    ]);
    expect(calls[0]?.url).toBe("/api/v1/contact-tags");
    expect((calls[0]?.init.headers as Record<string, string>)["x-school-id"]).toBe(
      "sch_1",
    );
  });

  it("encodes the tag and sends renames and deletes", async () => {
    const calls = stubFetch(200, {});
    const api = contactTagsApi("sch_1");
    await api.getTagReferences("a/b c");
    await api.renameTag("a/b c", "ab");
    await api.deleteTag("a/b c");
    expect(calls.map((call) => [call.init.method ?? "GET", call.url])).toEqual([
      ["GET", "/api/v1/contact-tags/a%2Fb%20c/references"],
      ["PATCH", "/api/v1/contact-tags/a%2Fb%20c"],
      ["DELETE", "/api/v1/contact-tags/a%2Fb%20c"],
    ]);
    expect(calls[1]?.init.body).toBe(JSON.stringify({ name: "ab" }));
  });

  it("surfaces the API's message", async () => {
    stubFetch(404, { message: "The requested resource was not found." });
    await expect(contactTagsApi("sch_1").deleteTag("gone")).rejects.toThrow(
      "The requested resource was not found.",
    );
  });
});

describe("tagSequenceHref", () => {
  it("links broadcasts and sequences to their editors", () => {
    expect(tagSequenceHref({ sequenceId: "q1", type: "broadcast" })).toBe(
      "/marketing/broadcasts/q1",
    );
    expect(tagSequenceHref({ sequenceId: "q2", type: "sequence" })).toBe(
      "/marketing/sequences/q2",
    );
  });
});
