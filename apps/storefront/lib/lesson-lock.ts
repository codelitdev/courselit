/**
 * Why a lesson can't be shown, if it can't. The API leaves a lesson's
 * content out until the learner may see it, so "no content" alone doesn't
 * mean "not enrolled": an enrolled learner can open a lesson the school
 * hasn't filled in yet.
 */
export function lessonLockState(input: {
  preview: boolean;
  enrolled: boolean;
  requiresEnrollment: boolean;
  isQuiz: boolean;
  hasContent: boolean;
  availableAt: string | null;
}): "unlocked" | "enrollment" | "dripped" | "empty" {
  if (input.preview) return "unlocked";
  if (!input.enrolled && (input.requiresEnrollment || input.isQuiz)) return "enrollment";
  if (input.hasContent) return "unlocked";
  if (input.availableAt) return "dripped";
  return input.enrolled || !input.requiresEnrollment ? "empty" : "enrollment";
}
