import { describe, expect, it } from "bun:test";
import { hostnameFromHeaders, schoolLookupKeyFromHost } from "./school-host.js";

describe("schoolLookupKeyFromHost", () => {
  it("reads the school label from a platform subdomain", () => {
    expect(schoolLookupKeyFromHost("acme.courselit.app")).toBe("acme");
    expect(schoolLookupKeyFromHost("acme.localhost")).toBe("acme");
  });

  it("uses the full hostname for a custom domain", () => {
    expect(schoolLookupKeyFromHost("learn.acme.org")).toBe("learn.acme.org");
  });

  it("ignores bare localhost and the apex platform domain", () => {
    expect(schoolLookupKeyFromHost("localhost")).toBeNull();
    expect(schoolLookupKeyFromHost("courselit.app")).toBeNull();
    expect(schoolLookupKeyFromHost("www.courselit.app")).toBeNull();
  });

  it("reads x-forwarded-host from the learner BFF", () => {
    expect(hostnameFromHeaders({ "x-forwarded-host": "acme.localhost:3001" })).toBe(
      "acme.localhost",
    );
  });
});
