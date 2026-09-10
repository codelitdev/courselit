export const SCHOOL_STORAGE_KEY = "courselit.learner.schoolId";

export function readSchoolId(): string | null {
  if (typeof window === "undefined") return null;
  const searchParams = new URLSearchParams(window.location.search);
  const fromQuery = searchParams.get("school") ?? searchParams.get("schoolId");
  if (fromQuery && fromQuery.trim().length > 0) {
    window.sessionStorage.setItem(SCHOOL_STORAGE_KEY, fromQuery.trim());
    return fromQuery.trim();
  }
  const value = window.sessionStorage.getItem(SCHOOL_STORAGE_KEY);
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function writeSchoolId(schoolId: string) {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(SCHOOL_STORAGE_KEY, schoolId);
  }
}

export function clearSchoolId() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SCHOOL_STORAGE_KEY);
  }
}

function shouldUseStoredSchoolId() {
  if (typeof window === "undefined") return true;
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function learnerHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const schoolId = readSchoolId();
  // On a school website, the host is authoritative. A school ID left in a
  // previous session must not make a valid request look like a cross-tenant
  // request. The stored ID remains useful for the generic localhost app.
  if (schoolId && shouldUseStoredSchoolId()) headers.set("x-school-id", schoolId);
  return headers;
}
