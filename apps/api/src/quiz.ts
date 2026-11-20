import {
  type Clock,
  createPlatformError,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { type QuizAnswers, readStoredQuiz, scoreQuiz } from "@courselit/api-contract/quiz";
import { and, asc, eq } from "drizzle-orm";
import { ActivityType, recordActivity } from "./activities.js";
import * as schema from "./db/schema/index.js";
import { lessonUnlockAt, sectionUnlockAt } from "./catalog.js";
import { assertRateLimit } from "./rate-limit.js";
import type { AppDb } from "./types.js";

export type QuizEvaluationDto = {
  quizId: string;
  pass: boolean;
  score: number;
  passingGrade: number | null;
};

export type QuizEvaluationInput = {
  schoolId: string;
  schoolAccountId?: string;
  learnerId?: string;
  productPublicId: string;
  lessonPublicId: string;
};

/**
 * Attempts are unlimited, but every score says something about the answers,
 * so a membership gets a bounded number of attempts per window (L10).
 */
export const QUIZ_EVALUATION_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  limit: 30,
} as const;

function invalid(reason: string): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("validation_failed", { safeDetails: { reason } }),
  };
}

async function loadQuizLessonAccess(
  db: AppDb,
  input: QuizEvaluationInput,
  now: Date,
): Promise<
  | {
      ok: true;
      value: {
        lesson: typeof schema.lessons.$inferSelect;
        product: typeof schema.products.$inferSelect;
        membership: typeof schema.learnerMemberships.$inferSelect;
      };
    }
  | { ok: false; error: PlatformError }
> {
  const rows = await db
    .select({ lesson: schema.lessons, product: schema.products })
    .from(schema.lessons)
    .innerJoin(schema.products, eq(schema.products.id, schema.lessons.productId))
    .where(
      and(
        eq(schema.lessons.schoolId, input.schoolId),
        eq(schema.lessons.publicId, input.lessonPublicId),
        eq(schema.products.schoolId, input.schoolId),
        eq(schema.products.publicId, input.productPublicId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (
    !row ||
    row.product.status !== "published" ||
    row.lesson.status !== "published" ||
    row.lesson.type !== "quiz"
  ) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  const accountId = input.schoolAccountId ?? input.learnerId!;
  const memberships = await db
    .select({ membership: schema.learnerMemberships })
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, input.schoolId),
        eq(schema.learnerMemberships.schoolAccountId, accountId),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.entityId, row.product.publicId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    )
    .limit(1);
  const membership = memberships[0]?.membership;
  if (!membership) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const membershipStartedAt = membership.createdAt;
  const sections = row.lesson.sectionId
    ? await db
        .select()
        .from(schema.productSections)
        .where(eq(schema.productSections.productId, row.product.id))
        .orderBy(asc(schema.productSections.position))
    : [];
  const section = sections.find((candidate) => candidate.id === row.lesson.sectionId);
  const sectionAvailableAt = section?.dripEnabled
    ? sectionUnlockAt(sections, section.id, membershipStartedAt)
    : null;
  const availableAt = [
    lessonUnlockAt(row.lesson, membershipStartedAt),
    sectionAvailableAt,
  ].reduce<Date | null>(
    (latest, candidate) => (!candidate || (latest && latest >= candidate) ? latest : candidate),
    null,
  );
  if (availableAt && availableAt > now) {
    return {
      ok: false,
      error: createPlatformError("forbidden", {
        safeDetails: {
          reason: "lesson_locked",
          availableAt: serializeDate(availableAt),
        },
      }),
    };
  }
  return { ok: true, value: { lesson: row.lesson, product: row.product, membership } };
}

export async function evaluateQuizLesson(
  db: AppDb,
  input: QuizEvaluationInput,
  attempt: { quizId: string; answers: QuizAnswers },
  clock: Clock,
): Promise<
  { ok: true; value: QuizEvaluationDto } | { ok: false; error: PlatformError }
> {
  const access = await loadQuizLessonAccess(db, input, clock.now());
  if (!access.ok) return access;
  const accountId = input.schoolAccountId ?? input.learnerId!;
  const limited = await assertRateLimit(
    db,
    {
      schoolId: input.schoolId,
      userId: accountId,
      scope: "learner_quiz",
      action: "evaluate",
      subjectId: access.value.membership.id,
      ...QUIZ_EVALUATION_RATE_LIMIT,
    },
    clock,
  );
  if (!limited.ok) return limited;

  const quiz = readStoredQuiz(access.value.lesson.content);
  if (!quiz) return invalid("quiz_content_invalid");
  // Answers belong to one version of the quiz. A learner still showing a
  // replaced quiz must reload it instead of being graded against another.
  if (quiz.id !== attempt.quizId) {
    return {
      ok: false,
      error: createPlatformError("conflict", { safeDetails: { reason: "quiz_changed" } }),
    };
  }
  const scored = scoreQuiz(quiz, attempt.answers);
  if (!scored.ok) return invalid(scored.reason);
  const { score, pass } = scored.value;

  const now = clock.now();
  const evaluationId = uuidv7(clock);
  await db.insert(schema.lessonEvaluations).values({
    id: evaluationId,
    schoolId: input.schoolId,
    membershipId: access.value.membership.id,
    schoolAccountId: accountId,
    lessonId: access.value.lesson.id,
    quizId: quiz.id,
    pass,
    score,
    passingGrade: quiz.passingGrade,
    createdAt: now,
  });
  const activityMetadata = {
    productId: access.value.product.publicId,
    score,
    pass,
    attemptId: evaluationId,
  };
  await recordActivity(db, {
    schoolId: input.schoolId,
    actorId: accountId,
    type: ActivityType.QUIZ_ATTEMPTED,
    entityId: input.lessonPublicId,
    metadata: activityMetadata,
  }, clock);
  if (pass) {
    await recordActivity(db, {
      schoolId: input.schoolId,
      actorId: accountId,
      type: ActivityType.QUIZ_PASSED,
      entityId: input.lessonPublicId,
      metadata: activityMetadata,
    }, clock);
  }
  return {
    ok: true,
    value: { quizId: quiz.id, pass, score, passingGrade: quiz.passingGrade },
  };
}
