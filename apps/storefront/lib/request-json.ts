import { learnerHeaders } from "@/lib/school";

type ApiError = { message?: string };

export async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = learnerHeaders(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers,
  });
  const body = (await response.json().catch(() => null)) as T & ApiError;
  if (!response.ok) {
    throw new Error(body?.message ?? "The request could not be completed.");
  }
  return body as T;
}
