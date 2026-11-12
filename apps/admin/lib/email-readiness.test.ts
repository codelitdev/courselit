import { describe, expect, it } from "bun:test";
import { isEmailNotReadyError, isMailingAddressRequiredError } from "./mail-errors";
import {
  EMAIL_READINESS_MESSAGES,
  emailBodyProblem,
  emailReadinessMessage,
  emailReadinessProblem,
  isMailingAddressMissing,
  sequenceReadinessMessage,
} from "./email-readiness";

const text = (content: string) => ({ blockType: "text", settings: { content } });
const footer = text("{{address}}\n\n[Unsubscribe]({{unsubscribe_link}})");
const body = (...blocks: unknown[]) => ({ content: blocks });
const blank = body(
  text("# Start writing here\n\nAdd your message, links, and call to action."),
  footer,
);
const written = body(text("Real words"), footer);

describe("emailBodyProblem", () => {
  it("flags the untouched template, case-insensitively", () => {
    expect(emailBodyProblem(blank)).toBe("body_placeholder");
    expect(emailBodyProblem(body(text("START WRITING HERE")))).toBe("body_placeholder");
  });
  it("accepts an email the creator wrote, even if a starter line is left in", () => {
    expect(
      emailBodyProblem(
        body(text("# Start writing here 2\n\nAdd your message, links, and call to action."), footer),
      ),
    ).toBeNull();
    expect(emailBodyProblem(body(text("# Start writing here\n\nOur sprint starts Monday.")))).toBeNull();
  });
  it("accepts written text and non-text blocks", () => {
    expect(emailBodyProblem(written)).toBeNull();
    expect(emailBodyProblem(body({ blockType: "image", settings: {} }))).toBeNull();
  });
  it("flags empty bodies", () => {
    expect(emailBodyProblem(null)).toBe("body_empty");
    expect(emailBodyProblem({})).toBe("body_empty");
    expect(emailBodyProblem(body())).toBe("body_empty");
    expect(emailBodyProblem(body(footer))).toBe("body_empty");
    expect(emailBodyProblem("not json")).toBe("body_empty");
  });
  it("reads string bodies and skips malformed blocks", () => {
    expect(emailBodyProblem(JSON.stringify(written))).toBeNull();
    expect(emailBodyProblem(body(null, text("Hi")))).toBeNull();
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

describe("emailReadinessProblem and message", () => {
  it("checks the subject before the body", () => {
    expect(emailReadinessProblem({ subject: " ", content: blank })).toBe("subject_empty");
    expect(emailReadinessProblem({ content: written })).toBe("subject_empty");
    expect(emailReadinessProblem({ subject: "Hi", content: blank })).toBe("body_placeholder");
    expect(emailReadinessProblem({ subject: "Hi", content: written })).toBeNull();
  });
  it("returns text only when something is wrong", () => {
    expect(emailReadinessMessage({ subject: "Hi", content: written })).toBeNull();
    expect(emailReadinessMessage({ subject: "Hi", content: blank })).toContain(
      "Start writing here",
    );
    expect(emailReadinessMessage({ subject: "", content: written })).toContain("subject");
  });
});

describe("sequenceReadinessMessage", () => {
  const ok = { subject: "Hi", content: written, published: true };
  it("names the first published email that is not ready", () => {
    const message = sequenceReadinessMessage([ok, { ...ok, content: blank }]);
    expect(message).toStartWith("Email 2:");
  });
  it("ignores draft emails and empty sequences", () => {
    expect(sequenceReadinessMessage([ok, { ...ok, published: false, content: blank }])).toBeNull();
    expect(sequenceReadinessMessage([])).toBeNull();
  });
});

describe("mailing address helpers", () => {
  it("treats blank or absent addresses as missing", () => {
    expect(isMailingAddressMissing(null)).toBe(true);
    expect(isMailingAddressMissing({})).toBe(true);
    expect(isMailingAddressMissing({ mailingAddress: "  " })).toBe(true);
    expect(isMailingAddressMissing({ mailingAddress: "1 Main St" })).toBe(false);
  });
  it("recognises the API's mailing address conflict", () => {
    expect(
      isMailingAddressRequiredError(
        "Add your mailing address in Marketing → Settings before sending email.",
      ),
    ).toBe(true);
    expect(isMailingAddressRequiredError("Add a subject before sending this email.")).toBe(
      false,
    );
  });
});

describe("isEmailNotReadyError", () => {
  it("recognises every readiness message, with or without an email prefix", () => {
    for (const message of Object.values(EMAIL_READINESS_MESSAGES)) {
      expect(isEmailNotReadyError(message)).toBe(true);
      expect(isEmailNotReadyError(`Email 2: ${message}`)).toBe(true);
    }
  });
  it("ignores other errors", () => {
    expect(isEmailNotReadyError("Unable to activate sequence")).toBe(false);
    expect(
      isEmailNotReadyError("Add your mailing address in Marketing → Settings before sending email."),
    ).toBe(false);
  });
});
