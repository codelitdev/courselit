/** What a learner is told when "Mark complete" is refused (section 5.4). */
export function lessonCompletionError(status: number, reason: string | null): string {
  if (reason === "need_to_pass") return "Pass the quiz to complete this lesson.";
  if (reason === "scorm_content_incomplete") {
    return "Finish the SCORM activity to complete this lesson.";
  }
  if (status === 401) return "Sign in to complete this lesson.";
  if (status === 403) return "This lesson can't be completed yet.";
  return "Unable to complete the lesson.";
}

export type LessonCompletionResult =
  | { ok: true; courseCompleted: boolean; certificateId: string | null }
  | { ok: false; status: number; message: string };

/** Marks a lesson complete for the signed-in learner. */
export async function requestLessonCompletion(
  input: { lessonId: string; headers: (extra?: Record<string, string>) => HeadersInit },
  fetcher: typeof fetch = fetch,
): Promise<LessonCompletionResult> {
  try {
    const response = await fetcher(
      `/api/v1/learner/lessons/${encodeURIComponent(input.lessonId)}/complete`,
      {
        method: "POST",
        credentials: "include",
        headers: input.headers({ "content-type": "application/json" }),
        body: JSON.stringify({}),
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        details?: { reason?: string };
      } | null;
      return {
        ok: false,
        status: response.status,
        message: lessonCompletionError(response.status, body?.details?.reason ?? null),
      };
    }
    const body = (await response.json().catch(() => ({}))) as {
      courseCompleted?: boolean;
      certificateId?: string | null;
    };
    return {
      ok: true,
      courseCompleted: body.courseCompleted === true,
      certificateId: body.certificateId ?? null,
    };
  } catch {
    return { ok: false, status: 0, message: "Unable to complete the lesson." };
  }
}
