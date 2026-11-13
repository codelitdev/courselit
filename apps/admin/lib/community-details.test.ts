import { describe, expect, it } from "bun:test";
import { bannerSwitchUpdate, communityDetailsDirty } from "./community-details";

const saved = {
  name: "Makers",
  description: "{}",
  banner: '{"type":"doc"}',
  joiningReasonText: "Why join?",
};

describe("communityDetailsDirty", () => {
  it("is clean when nothing changed", () => {
    expect(communityDetailsDirty(saved, { ...saved, bannerOn: true })).toEqual({
      details: false,
      banner: false,
      question: false,
      any: false,
    });
  });

  it("tracks each card on its own", () => {
    expect(
      communityDetailsDirty(saved, { ...saved, name: "Makers club", bannerOn: true }),
    ).toMatchObject({ details: true, banner: false, question: false, any: true });
    expect(
      communityDetailsDirty(saved, { ...saved, banner: "new", bannerOn: true }),
    ).toMatchObject({ details: false, banner: true, question: false, any: true });
    expect(
      communityDetailsDirty(saved, { ...saved, joiningReasonText: "", bannerOn: true }),
    ).toMatchObject({ details: false, banner: false, question: true, any: true });
  });

  it("ignores an edited message while the banner is switched off", () => {
    expect(
      communityDetailsDirty(saved, { ...saved, banner: "draft", bannerOn: false }).any,
    ).toBe(false);
  });
});

describe("bannerSwitchUpdate", () => {
  it("clears a saved message when switched off", () => {
    expect(bannerSwitchUpdate(false, '{"type":"doc"}')).toEqual({ banner: "" });
  });

  it("saves nothing when switched on or when there is no message", () => {
    expect(bannerSwitchUpdate(true, "")).toBeNull();
    expect(bannerSwitchUpdate(true, '{"type":"doc"}')).toBeNull();
    expect(bannerSwitchUpdate(false, "")).toBeNull();
  });
});
