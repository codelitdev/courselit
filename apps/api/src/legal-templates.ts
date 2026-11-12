/**
 * Starter text for a new school's Terms of Service and Privacy policy. Both
 * pages start as unpublished drafts holding this text in a rich-text block, so
 * the creator edits something instead of facing an empty page. The text is
 * plain and generic on purpose: the creator is expected to review it.
 */

type TextNode = { type: "text"; text: string };
type Block =
  | { type: "heading"; attrs: { level: number }; content: TextNode[] }
  | { type: "paragraph"; content: TextNode[] }
  | { type: "bulletList"; content: Array<{ type: "listItem"; content: Block[] }> };
export type LegalDoc = { type: "doc"; content: Block[] };

const text = (value: string): TextNode => ({ type: "text", text: value });
const heading = (value: string): Block => ({
  type: "heading",
  attrs: { level: 2 },
  content: [text(value)],
});
const paragraph = (value: string): Block => ({
  type: "paragraph",
  content: [text(value)],
});
const bullets = (items: readonly string[]): Block => ({
  type: "bulletList",
  content: items.map((item) => ({ type: "listItem", content: [paragraph(item)] })),
});

export function termsOfServiceDoc(schoolName: string | null | undefined): LegalDoc {
  const us = schoolName?.trim() || "us";
  return {
    type: "doc",
    content: [
      paragraph(
        `These terms apply when you use this website or buy, join or download anything from ${us}. By using the site you agree to them.`,
      ),
      heading("Your account"),
      paragraph(
        "Keep your sign-in details to yourself. You're responsible for what happens under your account.",
      ),
      heading("Purchases and access"),
      paragraph(
        "When you buy or join a course, download or community, you get personal access to it for as long as its plan allows. Prices and what each plan includes are shown before you pay.",
      ),
      heading("Refunds"),
      paragraph(
        "If something isn't right, contact us. Refunds are handled case by case unless a product states its own refund terms.",
      ),
      heading("Using the content"),
      paragraph(
        "The courses, files and posts here are for your own use. Please don't copy, resell or share them without permission.",
      ),
      heading("Community conduct"),
      paragraph(
        "Be respectful in discussions and communities. We may remove posts or accounts that harass others, break the law or spam.",
      ),
      heading("Changes"),
      paragraph(
        "We may update these terms from time to time. The latest version is always on this page.",
      ),
      heading("Contact"),
      paragraph(`Questions about these terms? Get in touch with ${us}.`),
    ],
  };
}

export function privacyPolicyDoc(schoolName: string | null | undefined): LegalDoc {
  const name = schoolName?.trim();
  const opening = name ? `${name} respects your privacy.` : "We respect your privacy.";
  return {
    type: "doc",
    content: [
      paragraph(
        `${opening} This page explains what we collect when you use this website and how we use it.`,
      ),
      heading("What we collect"),
      bullets([
        "Your name and email address when you sign up, buy something or subscribe.",
        "Your purchases and your progress in courses.",
        "What you post in discussions and communities.",
        "Basic technical details, like your browser, needed to run the site.",
      ]),
      heading("How we use it"),
      bullets([
        "To give you access to what you bought or joined.",
        "To send you emails about your account and purchases.",
        "To send you newsletters, only if you subscribed. You can unsubscribe any time.",
      ]),
      heading("Payments"),
      paragraph(
        "Payments are handled by our payment provider. We don't store your card details.",
      ),
      heading("Sharing"),
      paragraph(
        "We don't sell your data. We share it only with the services that help us run this site, such as payments and email, and only as much as they need.",
      ),
      heading("Your choices"),
      paragraph(
        "You can ask to see, correct or delete your data at any time by contacting us.",
      ),
      heading("Changes"),
      paragraph(
        "We may update this policy from time to time. The latest version is always on this page.",
      ),
    ],
  };
}
