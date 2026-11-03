/** Build a public storefront URL from the school's API-provided storefront origin. */
export function storefrontUrl(path: string, storefrontOrigin?: string | null): string | null {
  const origin = storefrontOrigin?.trim();
  if (!origin) return null;
  try {
    return new URL(path, origin).toString();
  } catch {
    return null;
  }
}
