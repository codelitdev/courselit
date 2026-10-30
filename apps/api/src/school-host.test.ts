import { describe, expect, it } from "bun:test";
import { normalizeRequestHostname, platformSubdomainFromHost } from "./school-host.js";

describe("platformSubdomainFromHost", () => {
  it("reads the school label from a platform subdomain", () => {
    expect(platformSubdomainFromHost("acme.courselit.app")).toBe("acme");
    expect(platformSubdomainFromHost("acme.localhost")).toBe("acme");
  });

  it("does not treat custom domains or internal hosts as subdomains", () => {
    expect(platformSubdomainFromHost("learn.acme.org")).toBeNull();
    expect(platformSubdomainFromHost("courselit-api")).toBeNull();
    expect(platformSubdomainFromHost("a.b.courselit.app")).toBeNull();
  });

  it("ignores bare localhost and the apex platform domain", () => {
    expect(platformSubdomainFromHost("localhost")).toBeNull();
    expect(platformSubdomainFromHost("courselit.app")).toBeNull();
    expect(platformSubdomainFromHost("www.courselit.app")).toBeNull();
  });
});

describe("normalizeRequestHostname", () => {
  it("lowercases and strips the port and trailing dot", () => {
    expect(normalizeRequestHostname("Acme.Localhost:3002")).toBe("acme.localhost");
    expect(normalizeRequestHostname("LEARN.EXAMPLE.COM.")).toBe("learn.example.com");
    expect(normalizeRequestHostname("")).toBeNull();
  });
});
