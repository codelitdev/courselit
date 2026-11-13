import type {
  ContactTagReferences,
  ContactTagSummary,
  DeleteContactTagResult,
  RenameContactTagResult,
} from "@courselit/api-contract";

/**
 * Calls the school's tag endpoints, which pass through to SendLit where
 * contact tags live. Errors carry the API's message for the tag screen.
 */
export function contactTagsApi(schoolId: string) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/contact-tags${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        "x-school-id": schoolId,
        ...(init.body ? { "content-type": "application/json" } : {}),
      },
    });
    const body = (await response.json().catch(() => null)) as
      | (T & { message?: string })
      | null;
    if (!response.ok) {
      throw new Error(body?.message || "Something went wrong. Try again.");
    }
    return body as T;
  }

  const tagPath = (tag: string) => `/${encodeURIComponent(tag)}`;
  return {
    listTags: async () =>
      (await request<{ items: ContactTagSummary[] }>("")).items,
    getTagReferences: (tag: string) =>
      request<ContactTagReferences>(`${tagPath(tag)}/references`),
    renameTag: (tag: string, name: string) =>
      request<RenameContactTagResult>(tagPath(tag), {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    deleteTag: (tag: string) =>
      request<DeleteContactTagResult>(tagPath(tag), { method: "DELETE" }),
  };
}

/** Where CourseLit edits a broadcast or sequence that uses a tag. */
export function tagSequenceHref(sequence: {
  sequenceId: string;
  type: "broadcast" | "sequence";
}): string {
  const id = encodeURIComponent(sequence.sequenceId);
  return sequence.type === "broadcast"
    ? `/marketing/broadcasts/${id}`
    : `/marketing/sequences/${id}`;
}
