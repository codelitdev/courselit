import { describe, expect, it } from "bun:test";
import {
  clearLearnerSessionCookieHeader,
  isSecureCookieUrl,
  learnerSessionCookieHeader,
  readLearnerSessionCookie,
} from "./learners.js";

describe("learner session cookie", () => {
  it("is a plain HttpOnly cookie over http", () => {
    const header = learnerSessionCookieHeader("tok");
    expect(header.startsWith("courselit.learner.session=tok;")).toBe(true);
    expect(header).toContain("Path=/");
    expect(header).toContain("HttpOnly");
    expect(header).not.toContain("Secure");
    expect(clearLearnerSessionCookieHeader()).toBe(
      "courselit.learner.session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    );
  });

  it("is a Secure __Host- cookie with Path=/ and no Domain over https", () => {
    const header = learnerSessionCookieHeader("tok", true);
    expect(header.startsWith("__Host-courselit.learner.session=tok;")).toBe(true);
    expect(header).toContain("; Secure");
    expect(header).toContain("Path=/");
    expect(header).not.toMatch(/Domain=/i);
    const cleared = clearLearnerSessionCookieHeader(true);
    expect(cleared.startsWith("__Host-courselit.learner.session=;")).toBe(true);
    expect(cleared).toContain("; Secure");
    expect(cleared).toContain("Max-Age=0");
  });

  it("derives secure mode from the public API URL", () => {
    expect(isSecureCookieUrl("https://api.example.com")).toBe(true);
    expect(isSecureCookieUrl("http://127.0.0.1:4000")).toBe(false);
  });

  it("reads only the name that matches the current mode", () => {
    const both = {
      cookie: "courselit.learner.session=plain; __Host-courselit.learner.session=host",
    };
    expect(readLearnerSessionCookie(both, true)).toBe("host");
    expect(readLearnerSessionCookie(both, false)).toBe("plain");
    expect(
      readLearnerSessionCookie({ cookie: "courselit.learner.session=plain" }, true),
    ).toBeNull();
    expect(
      readLearnerSessionCookie({ cookie: "__Host-courselit.learner.session=host" }, false),
    ).toBeNull();
  });

  it("uses the first occurrence when a name is repeated", () => {
    expect(
      readLearnerSessionCookie({
        cookie: "courselit.learner.session=first; courselit.learner.session=second",
      }),
    ).toBe("first");
    expect(
      readLearnerSessionCookie({
        cookie: ["courselit.learner.session=a", "courselit.learner.session=b"],
      }),
    ).toBe("a");
  });
});
