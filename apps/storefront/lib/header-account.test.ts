import { describe, expect, it } from "bun:test";
import {
  HEADER_ACCOUNT_FLAG,
  HEADER_DASHBOARD_LINK_ID,
  HEADER_LOGIN_LINK_ID,
  headerHasAccountEntry,
  learnersCanSignIn,
  signedInHeaderSettings,
  withLoginLink,
} from "./header-account";

const products = { id: "products", label: "Products", href: "/products" };
const join = { ctaLabel: "Join", ctaHref: "/join" };
const noButton = { ctaLabel: "", ctaHref: "" };
const loginButton = { id: HEADER_LOGIN_LINK_ID, label: "Log in", href: "/login", isButton: true };
const sells = { sellsSomething: true, onLoginPage: false };

describe("signed-out header", () => {
  it("makes Log in the header's button when there is no Join", () => {
    const settings = withLoginLink({ links: [products], ...noButton }, sells);
    expect(settings).toMatchObject({ links: [products], ctaLabel: "Log in", ctaHref: "/login" });
    expect(headerHasAccountEntry(settings)).toBe(true);
  });

  it("puts Log in as a button before Join", () => {
    const settings = withLoginLink({ links: [products], ...join }, sells);
    expect(settings).toMatchObject({ links: [products, loginButton], ...join });
  });

  it("leaves a landing-page-only school's header alone", () => {
    const settings = { links: [products], ...join };
    expect(withLoginLink(settings, { sellsSomething: false, onLoginPage: false })).toBe(
      settings,
    );
  });

  it("skips Log in on the login page", () => {
    const settings = { links: [products], ...noButton };
    expect(withLoginLink(settings, { sellsSomething: true, onLoginPage: true })).toBe(settings);
  });

  it("does not add a second Log in when the school already links to it", () => {
    const own = { links: [{ id: "x", label: "Sign in", href: "/login" }], ...join };
    expect(withLoginLink(own, sells)).toEqual({ ...own, [HEADER_ACCOUNT_FLAG]: true });
  });
});

describe("signed-in header", () => {
  it("turns Log in into Dashboard", () => {
    const signedOut = withLoginLink({ links: [products], ...noButton }, sells);
    expect(signedInHeaderSettings(signedOut)).toMatchObject({
      links: [products],
      ctaLabel: "Dashboard",
      ctaHref: "/dashboard",
    });
  });

  it("replaces Log in and Join with a single Dashboard", () => {
    const signedOut = withLoginLink({ links: [products], ...join }, sells);
    expect(signedInHeaderSettings(signedOut)).toMatchObject({
      links: [products],
      ctaLabel: "Dashboard",
      ctaHref: "/dashboard",
    });
  });

  it("keeps a school's own button and adds Dashboard beside it", () => {
    const signedOut = withLoginLink(
      { links: [products], ctaLabel: "Book a call", ctaHref: "/call" },
      sells,
    );
    const settings = signedInHeaderSettings(signedOut);
    expect(settings).toMatchObject({ ctaLabel: "Book a call", ctaHref: "/call" });
    expect(settings.links).toEqual([
      products,
      { id: HEADER_DASHBOARD_LINK_ID, label: "Dashboard", href: "/dashboard", isButton: true },
    ]);
  });

  it("does nothing for a header without sign-in", () => {
    const settings = { links: [products], ...join };
    expect(signedInHeaderSettings(settings)).toBe(settings);
  });
});

describe("whether learners can sign in", () => {
  it("follows the API, so a school with only hidden products gets Log in", () => {
    expect(learnersCanSignIn({ hasPublishedOffers: true }, false)).toBe(true);
  });

  it("follows the API when nothing is published, even if the catalogue disagrees", () => {
    expect(learnersCanSignIn({ hasPublishedOffers: false }, true)).toBe(false);
  });

  it("falls back to the public catalogue when the API doesn't say", () => {
    expect(learnersCanSignIn({}, true)).toBe(true);
    expect(learnersCanSignIn(null, false)).toBe(false);
  });
});
