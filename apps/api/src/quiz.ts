import {
  type Clock,
  createPlatformError,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { lessonUnlockAt, sectionUnlockAt } from "./catalog.js";
import { ActivityType, recordActivity } from "./activities.js";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

export type QuizEvaluationDto = {
  pass: boolean;
  score: number;
  requiresPassingGrade: boolean;
  passingGrade: number;
};

type QuizEvaluationInput = {
  schoolId: string;
  learnerId: string;
  productPublicId: string;
  lessonPublicId: string;
};

type QuizOption = { correctAnswer: boolean };
type QuizQuestion = { options: QuizOption[] };
type QuizContent = {
  questions: QuizQuestion[];
  requiresPassingGrade: boolean;
  passingGrade: number;
};

function invalid(reason: string): { ok: false; error: PlatformError } {
  return {
    ok: false,
    error: createPlatformError("validation_failed", { safeDetails: { reason } }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readQuizContent(value: unknown): QuizContent | null {
  if (!isRecord(value) || !Array.isArray(value.questions) || value.questions.length === 0) {
    return null;
  }
  const questions: QuizQuestion[] = [];
  for (const questionValue of value.questions) {
    if (!isRecord(questionValue) || !Array.isArray(questionValue.options)) return null;
    const options: QuizOption[] = [];
    for (const optionValue of questionValue.options) {
      if (!isRecord(optionValue)) return null;
      options.push({ correctAnswer: optionValue.correctAnswer === true });
    }
    if (options.length === 0) return null;
    questions.push({ options });
  }
  const passingGrade =
    typeof value.passingGrade === "number" && Number.isFinite(value.passingGrade)
      ? value.passingGrade
      : 0;
  return {
    questions,
    requiresPassingGrade: value.requiresPassingGrade === true,
    passingGrade,
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
        enrollment: typeof schema.enrollments.$inferSelect;
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

  const enrollments = await db
    .select({ enrollment: schema.enrollments, grant: schema.enrollmentAccessGrants })
    .from(schema.enrollments)
    .innerJoin(
      schema.enrollmentAccessGrants,
      eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
    )
    .where(
      and(
        eq(schema.enrollments.schoolId, input.schoolId),
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.productId, row.product.id),
        eq(schema.enrollments.status, "active"),
        eq(schema.enrollmentAccessGrants.schoolId, input.schoolId),
        eq(schema.enrollmentAccessGrants.status, "active"),
        lte(schema.enrollmentAccessGrants.startsAt, now),
        or(
          isNull(schema.enrollmentAccessGrants.endsAt),
          gt(schema.enrollmentAccessGrants.endsAt, now),
        ),
      ),
    )
    .limit(1);
  const enrollmentRow = enrollments[0];
  if (!enrollmentRow) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const enrollmentStartedAt =
    enrollmentRow.enrollment.createdAt > enrollmentRow.grant.startsAt
      ? enrollmentRow.enrollment.createdAt
      : enrollmentRow.grant.startsAt;
  const sections = row.lesson.sectionId
    ? await db
        .select()
        .from(schema.productSections)
        .where(eq(schema.productSections.productId, row.product.id))
        .orderBy(asc(schema.productSections.position))
    : [];
  const section = sections.find((candidate) => candidate.id === row.lesson.sectionId);
  const sectionAvailableAt = section?.dripEnabled
    ? sectionUnlockAt(sections, section.id, enrollmentStartedAt)
    : null;
  const availableAt = [
    lessonUnlockAt(row.lesson, enrollmentStartedAt),
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
  return { ok: true, value: { lesson: row.lesson, product: row.product, enrollment: enrollmentRow.enrollment } };
}

export async function evaluateQuizLesson(
  db: AppDb,
  input: QuizEvaluationInput,
  answers: number[][],
  clock: Clock,
): Promise<
  { ok: true; value: QuizEvaluationDto } | { ok: false; error: PlatformError }
> {
  if (
    !Array.isArray(answers) ||
    answers.length === 0 ||
    answers.length > 100 ||
    answers.some(
      (questionAnswers) =>
        !Array.isArray(questionAnswers) ||
        questionAnswers.length > 1000 ||
        questionAnswers.some(
          (answer) => !Number.isInteger(answer) || answer < 0,
        ),
    )
  ) {
    return invalid("answers_missing_or_invalid");
  }

  const access = await loadQuizLessonAccess(db, input, clock.now());
  if (!access.ok) return access;
  const content = readQuizContent(access.value.lesson.content);
  if (!content || content.questions.some((question) => !question.options.some((option) => option.correctAnswer))) {
    return invalid("quiz_content_invalid");
  }

  // Keep this scoring rule identical to CourseLit's production evaluator:
  // each correct option selected earns one point; selecting an incorrect
  // option does not subtract a point.
  let actualScore = 0;
  let userScore = 0;
  for (const [questionIndex, question] of content.questions.entries()) {
    const selected = answers[questionIndex] ?? [];
    for (const [optionIndex, option] of question.options.entries()) {
      if (!option.correctAnswer) continue;
      actualScore += 1;
      if (selected.includes(optionIndex)) userScore += 1;
    }
  }
  if (actualScore === 0) return invalid("quiz_content_invalid");
  const score = (userScore / actualScore) * 100;
  const pass = !content.requiresPassingGrade || score >= content.passingGrade;
  const now = clock.now();
  const evaluationId = uuidv7(clock);
  await db.insert(schema.lessonEvaluations).values({
    id: evaluationId,
    schoolId: input.schoolId,
    enrollmentId: access.value.enrollment.id,
    learnerId: input.learnerId,
    lessonId: access.value.lesson.id,
    pass,
    score,
    requiresPassingGrade: content.requiresPassingGrade,
    passingGrade: content.passingGrade,
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
    actorId: input.learnerId,
    type: ActivityType.QUIZ_ATTEMPTED,
    entityId: input.lessonPublicId,
    metadata: activityMetadata,
  }, clock);
  if (pass) {
    await recordActivity(db, {
      schoolId: input.schoolId,
      actorId: input.learnerId,
      type: ActivityType.QUIZ_PASSED,
      entityId: input.lessonPublicId,
      metadata: activityMetadata,
    }, clock);
  }
  return {
    ok: true,
    value: {
      pass,
      score,
      requiresPassingGrade: content.requiresPassingGrade,
      passingGrade: content.passingGrade,
    },
  };
}
