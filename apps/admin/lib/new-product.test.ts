import { describe, expect, it } from "bun:test";
import {
  newProductBody,
  newProductNextHint,
  productSlugPreview,
  storefrontLinkPrefix,
} from "./new-product";

describe("new product", () => {
  it("previews the slug the API will give the title", () => {
    expect(productSlugPreview("  Watercolour Basics! ")).toBe("watercolour-basics");
    expect(productSlugPreview("The six-colour palette guide")).toBe(
      "the-six-colour-palette-guide",
    );
    expect(productSlugPreview("!!!")).toBe("");
  });

  it("uses the school's address in the link, or a placeholder", () => {
    expect(storefrontLinkPrefix("https://acme.example.com:5443")).toBe(
      "acme.example.com:5443/p/",
    );
    expect(storefrontLinkPrefix(null)).toBe("[your-school]/p/");
    expect(storefrontLinkPrefix("not a url")).toBe("[your-school]/p/");
  });

  it("says what comes next for each kind", () => {
    expect(newProductNextHint("course", "sell")).toMatch(/sections and lessons/);
    expect(newProductNextHint("download", "sell")).toMatch(/set a price/);
    expect(newProductNextHint("download", "lead")).toMatch(/free for an email/);
  });

  it("asks for a lead magnet only for a download given away", () => {
    expect(newProductBody("download", "lead", " Guide ")).toEqual({
      kind: "download",
      title: "Guide",
      description: "",
      leadMagnet: true,
    });
    expect(newProductBody("download", "sell", "Guide")).not.toHaveProperty(
      "leadMagnet",
    );
    expect(newProductBody("course", "lead", "Course")).not.toHaveProperty("leadMagnet");
  });
});
