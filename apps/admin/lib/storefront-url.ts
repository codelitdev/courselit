const DEFAULT_LOCAL_STOREFRONT_ORIGIN = "http://localhost:3001";

function configuredStorefrontOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_STOREFRONT_ORIGIN?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") return DEFAULT_LOCAL_STOREFRONT_ORIGIN;
  if (typeof window !== "undefined") return window.location.origin;
  return null;
}

function applySchoolHost(url: URL, subdomain: string | undefined): void {
  if (!subdomain) return;

  const normalizedSubdomain = subdomain.trim().toLowerCase();
  if (!normalizedSubdomain) return;

  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    url.hostname = `${normalizedSubdomain}.localhost`;
    return;
  }

  if (url.hostname === "courselit.app" || url.hostname === "www.courselit.app") {
    url.hostname = `${normalizedSubdomain}.courselit.app`;
  }
}

/** Build a public storefront URL for a school-scoped route. */
export function storefrontUrl(path: string, subdomain?: string): string | null {
  const origin = configuredStorefrontOrigin();
  if (!origin) return null;

  try {
    const url = new URL(path, origin);
    applySchoolHost(url, subdomain);
    return url.toString();
  } catch {
    return null;
  }
}
