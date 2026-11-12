import { describe, expect, it } from "bun:test";
import { privacyPolicyDoc, termsOfServiceDoc } from "./legal-templates.js";

const textOf = (node: unknown): string => {
  if (!node || typeof node !== "object") return "";
  const record = node as { text?: string; content?: unknown[] };
  return [record.text ?? "", ...(record.content ?? []).map(textOf)].join(" ");
};

describe("legal starter text", () => {
  it("names the school in both documents", () => {
    expect(textOf(termsOfServiceDoc("Acme Academy"))).toContain(
      "buy, join or download anything from Acme Academy",
    );
    expect(textOf(privacyPolicyDoc("Acme Academy"))).toContain(
      "Acme Academy respects your privacy",
    );
  });

  it("reads naturally without a school name", () => {
    expect(textOf(termsOfServiceDoc("  "))).toContain("anything from us.");
    expect(textOf(privacyPolicyDoc(null))).toContain("We respect");
  });

  it("is an editor document with headings", () => {
    for (const doc of [termsOfServiceDoc("A"), privacyPolicyDoc("A")]) {
      expect(doc.type).toBe("doc");
      expect(doc.content.some((block) => block.type === "heading")).toBe(true);
    }
  });
});
