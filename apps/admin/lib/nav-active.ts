function hrefQuery(href: string): string {
  const queryStart = href.indexOf("?");
  if (queryStart === -1) return "";
  return href.slice(queryStart + 1).split("#", 1)[0] ?? "";
}

export function isNavItemActive(pathname: string, href: string): boolean {
  const targetPathname = href.split(/[?#]/, 1)[0] || "/";
  if (targetPathname === "/") return pathname === "/";
  return pathname === targetPathname || pathname.startsWith(`${targetPathname}/`);
}

export function isNavHrefActive(pathname: string, href: string, search = ""): boolean {
  if (!isNavItemActive(pathname, href)) return false;
  const requiredQuery = hrefQuery(href);
  if (!requiredQuery) return true;
  const required = new URLSearchParams(requiredQuery);
  const current = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  if (pathname === "/settings" && !current.has("tab")) {
    current.set("tab", "payment");
  }
  for (const [key, value] of required) {
    if (current.get(key) !== value) return false;
  }
  return true;
}
