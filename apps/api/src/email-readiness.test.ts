import { describe, expect, it } from "bun:test";
import { emailBodyProblem, emailReadinessProblem } from "./email-readiness.js";

const text = (content: string) => ({ blockType: "text", settings: { content } });
const footer = text("{{address}}\n\n[Unsubscribe]({{unsubscribe_link}})");
const body = (...blocks: unknown[]) => ({ content: blocks });

describe("emailBodyProblem", () => {
  it("flags the untouched Blank template body", () => {
    const blank = body(
      text("# Start writing here\n\nAdd your message, links, and call to action."),
      footer,
    );
    expect(emailBodyProblem(blank)).toBe("body_placeholder");
  });

  it("flags only the starter's lines, whatever their heading level, case or spacing", () => {
    expect(
      emailBodyProblem(
        body(text("## START WRITING HERE\n\n  add your message,  links, and call to action. ")),
      ),
    ).toBe("body_placeholder");
    expect(
      emailBodyProblem(
        body(text("# Start writing here"), text("Add your message, links, and call to action."), footer),
      ),
    ).toBe("body_placeholder");
  });

  it("accepts an email the creator wrote, even if a starter line is left in", () => {
    // An edited starter heading is the creator's own text.
    expect(
      emailBodyProblem(
        body(text("# Start writing here 2\n\nAdd your message, links, and call to action."), footer),
      ),
    ).toBeNull();
    // The starter heading kept above the creator's own words.
    expect(emailBodyProblem(body(text("# Start writing here\n\nOur next sprint starts Monday.")))).toBeNull();
    // Their own block after an untouched starter block.
    expect(
      emailBodyProblem(
        body(text("# Start writing here\n\nAdd your message, links, and call to action."), text("## Header 2\n\n- Orange")),
      ),
    ).toBeNull();
  });

  it("accepts a body the creator wrote", () => {
    expect(emailBodyProblem(body(text("# Big news\n\nWe launched."), footer))).toBeNull();
  });

  it("accepts non-text blocks as content", () => {
    expect(emailBodyProblem(body({ blockType: "image", settings: {} }, footer))).toBeNull();
  });

  it("flags a body with no blocks, no body, or only the footer", () => {
    expect(emailBodyProblem(body())).toBe("body_empty");
    expect(emailBodyProblem(null)).toBe("body_empty");
    expect(emailBodyProblem(undefined)).toBe("body_empty");
    expect(emailBodyProblem({})).toBe("body_empty");
    expect(emailBodyProblem(body(text("  "), footer))).toBe("body_empty");
  });

  it("reads a body stored as a JSON string", () => {
    expect(emailBodyProblem(JSON.stringify(body(text("Real words"))))).toBeNull();
    expect(emailBodyProblem(JSON.stringify(body(text("Start writing here"))))).toBe(
      "body_placeholder",
    );
    expect(emailBodyProblem("not json")).toBe("body_empty");
  });

  it("ignores malformed blocks", () => {
    expect(emailBodyProblem(body(null, "x", text("Hello")))).toBeNull();
    expect(emailBodyProblem(body({ blockType: "text" }))).toBe("body_empty");
  });
});

describe("wrapped bodies", () => {
  it("looks through nested and stringified content", () => {
    const real = { content: [text("Real words")] };
    const stub = { content: [text("Start writing here")] };
    expect(emailBodyProblem({ content: JSON.stringify(real) })).toBeNull();
    expect(emailBodyProblem({ content: stub })).toBe("body_placeholder");
    expect(emailBodyProblem({ content: { content: { content: { content: [] } } } })).toBe(
      "body_empty",
    );
  });
});

describe("emailReadinessProblem", () => {
  const good = body(text("Hello"));
  it("requires a subject first", () => {
    expect(emailReadinessProblem({ subject: "", content: good })).toBe("subject_empty");
    expect(emailReadinessProblem({ subject: "   ", content: good })).toBe("subject_empty");
    expect(emailReadinessProblem({ content: good })).toBe("subject_empty");
    expect(emailReadinessProblem({ subject: "", content: body() })).toBe("subject_empty");
  });
  it("then checks the body", () => {
    expect(emailReadinessProblem({ subject: "Hi", content: body() })).toBe("body_empty");
    expect(emailReadinessProblem({ subject: "Hi", content: good })).toBeNull();
  });
});
