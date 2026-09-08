import { headers } from "next/headers";

export async function requestHost(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? headerList.get("x-forwarded-host");
  return (host ?? "").split(",")[0]?.trim() ?? "";
}
