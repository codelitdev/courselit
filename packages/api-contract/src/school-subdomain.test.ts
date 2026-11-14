import { describe, expect, it } from "bun:test";
import { createSchoolBodySchema } from "./index.js";
import { isReservedSubdomain } from "./school-subdomain.js";

describe("reserved subdomains (S19)", () => {
  it("covers CourseLit's own names, whatever the case", () => {
    for (const name of ["www", "app", "api", "admin", "mail", "login", "billing", "support", "status", "docs", "LOGIN "]) {
      expect(isReservedSubdomain(name)).toBe(true);
    }
    expect(isReservedSubdomain("maya-studio")).toBe(false);
  });

  it("can't be used to create a school", () => {
    const base = { name: "A school", locale: "en", currency: "USD" };
    expect(createSchoolBodySchema.safeParse({ ...base, subdomain: "billing" }).success).toBe(false);
    expect(createSchoolBodySchema.safeParse({ ...base, subdomain: "maya-studio" }).success).toBe(true);
  });
});
