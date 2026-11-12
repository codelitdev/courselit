/**
 * The header's way in for learners. Public pages are cached for everyone, so
 * the server renders the signed-out header ("Log in", plus Join when the
 * school has a community) and the browser swaps in "Dashboard" for learners
 * who are signed in. Schools with nothing to buy or join get neither.
 */

type HeaderLink = { id?: string; label?: string; href: string; isButton?: boolean };
type HeaderSettings = Record<string, unknown> & {
  links?: HeaderLink[];
  ctaLabel?: string;
  ctaHref?: string;
};

export const HEADER_LOGIN_LINK_ID = "courselit-header-login";
export const HEADER_DASHBOARD_LINK_ID = "courselit-header-dashboard";
/** Set on headers that offer learners a way to sign in. */
export const HEADER_ACCOUNT_FLAG = "courselitLearnerAccount";

const isOwnButton = (settings: HeaderSettings) =>
  Boolean(settings.ctaLabel && settings.ctaHref) &&
  settings.ctaHref !== "/join" &&
  settings.ctaHref !== "/login";

/**
 * The signed-out header when the school sells something: "Log in" sits with
 * the buttons on the right. It is the header's button when there is none (no
 * community, so no Join), otherwise a second button before it. Skipped on the
 * login page itself and when the school already links to it.
 */
export function withLoginLink<T extends HeaderSettings>(
  settings: T,
  { sellsSomething, onLoginPage }: { sellsSomething: boolean; onLoginPage: boolean },
): T {
  if (!sellsSomething || onLoginPage) return settings;
  const links = settings.links ?? [];
  const flagged = { ...settings, [HEADER_ACCOUNT_FLAG]: true };
  if (settings.ctaHref === "/login" || links.some((link) => link.href === "/login")) {
    return flagged;
  }
  if (!settings.ctaLabel || !settings.ctaHref) {
    return { ...flagged, ctaLabel: "Log in", ctaHref: "/login" };
  }
  return {
    ...flagged,
    links: [
      ...links,
      { id: HEADER_LOGIN_LINK_ID, label: "Log in", href: "/login", isButton: true },
    ],
  };
}

/**
 * Whether learners have something to sign in to: any published product,
 * hidden ones included (they are sold through direct links), or a live
 * community. Falls back to the public catalogue when the API doesn't say.
 */
export function learnersCanSignIn(
  settings: { hasPublishedOffers?: boolean } | null | undefined,
  hasPublicOffers: boolean,
): boolean {
  return settings?.hasPublishedOffers ?? hasPublicOffers;
}

/** Whether the header offers a learner sign-in, i.e. the school sells something. */
export function headerHasAccountEntry(settings: HeaderSettings | undefined): boolean {
  return settings?.[HEADER_ACCOUNT_FLAG] === true;
}

/**
 * The header for a signed-in learner: "Log in" and Join give way to
 * "Dashboard". A school's own button stays, with Dashboard as a button beside
 * it.
 */
export function signedInHeaderSettings<T extends HeaderSettings>(settings: T): T {
  if (!headerHasAccountEntry(settings)) return settings;
  const links = (settings.links ?? []).filter(
    (link) => link.id !== HEADER_LOGIN_LINK_ID && link.href !== "/login",
  );
  if (!isOwnButton(settings)) {
    return { ...settings, links, ctaLabel: "Dashboard", ctaHref: "/dashboard" };
  }
  return {
    ...settings,
    links: [
      ...links,
      { id: HEADER_DASHBOARD_LINK_ID, label: "Dashboard", href: "/dashboard", isButton: true },
    ],
  };
}

const SIGNED_IN_HINT_KEY = "courselit-learner-signed-in";

/** Last known sign-in state, so a returning learner's header does not flash
 * "Log in" while the session check runs. Only a hint: the check decides. */
export function readSignedInHint(): boolean {
  try {
    return window.localStorage.getItem(SIGNED_IN_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSignedInHint(signedIn: boolean) {
  try {
    if (signedIn) window.localStorage.setItem(SIGNED_IN_HINT_KEY, "1");
    else window.localStorage.removeItem(SIGNED_IN_HINT_KEY);
  } catch {
    // Local storage may be restricted.
  }
}
