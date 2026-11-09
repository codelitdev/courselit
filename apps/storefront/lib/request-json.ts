import { learnerHeaders } from "@/lib/school";

type ApiError = { message?: string };

/** A failed API response, with its HTTP status for callers that need to tell
 * "not found" from "try again". */
export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

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
    throw new RequestError(
      body?.message ?? "The request could not be completed.",
      response.status,
    );
  }
  return body as T;
}
