/** An IdP endpoint we will redirect browsers to: absolute https, no credentials. */
export function isSafeIdpUrl(value: string): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return false;
  }
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) {
      return false; // whitespace and control characters
    }
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    parsed.hostname.length > 0 &&
    parsed.username === "" &&
    parsed.password === ""
  );
}
