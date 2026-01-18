import { responses } from "../../config/strings";
import constants from "../../config/constants";
import { repositories, Criteria } from "@courselit/orm-models";
import { Group, Lesson, Question, Quiz } from "@courselit/common-models";
import mongoose from "mongoose";
import { LessonWithStringContent } from "./logic";
const { text, audio, video, pdf, embed, quiz, file } = constants;

type LessonValidatorProps = Pick<
    LessonWithStringContent,
    "content" | "type" | "media"
>;

export const lessonValidator = (lessonData: LessonValidatorProps) => {
    validateTextContent(lessonData);
    // validateMediaContent(lessonData);
};

export function validateTextContent(lessonData: LessonValidatorProps) {
    const content = lessonData.content ? JSON.parse(lessonData.content) : null;

    const isTextOrEmbed = lessonData.type === text || lessonData.type === embed;

    if (isTextOrEmbed) {
        if (
            lessonData.type === text &&
            content &&
            typeof content === "object"
        ) {
            return;
        }
        if (lessonData.type === embed && content && content.value) {
            return;
        }

        throw new Error(responses.content_cannot_be_null);
    }

    if (lessonData.type === quiz) {
        if (content && content.questions) {
            validateQuizContent(content.questions);
        }
    }
}

function validateQuizContent(questions: Question[]) {
    for (const question of questions) {
        let correctAnswersCount = question.options.filter(
            (option) => option.correctAnswer,
        ).length;
        if (correctAnswersCount === 0) {
            throw new Error(responses.no_correct_answer);
        }
        let optionsWithNoText = question.options.filter(
            (option) => !option.text,
        ).length;
        if (optionsWithNoText) {
            throw new Error(responses.no_empty_option);
        }
    }
}

function validateMediaContent(lessonData: LessonValidatorProps) {
    if (
        (lessonData.type === audio ||
            lessonData.type === video ||
            lessonData.type === file ||
            lessonData.type === pdf) &&
        !(lessonData.media && lessonData.media.mediaId)
    ) {
        throw new Error(responses.media_id_cannot_be_null);
    }
}

type GroupLessonItem = Pick<Lesson, "lessonId" | "groupId">;
export const getGroupedLessons = async (
    courseId: string,
    domainId: mongoose.Types.ObjectId,
): Promise<GroupLessonItem[]> => {
    const courseCb = Criteria.create<any>();
    courseCb.where("courseId", "eq", courseId);
    courseCb.where("domain", "eq", domainId);
    const course = (await repositories.course.findOne(courseCb)) as any;

    const lessonCb = Criteria.create<Lesson>();
    lessonCb.where("courseId", "eq", courseId);
    lessonCb.where("domain" as keyof Lesson, "eq", domainId);

    const allLessons = await repositories.lesson.findMany(lessonCb);
    const lessonsInSequentialOrder: GroupLessonItem[] = [];
    for (let group of course.groups.sort(
        (a: Group, b: Group) => a.rank - b.rank,
    )) {
        lessonsInSequentialOrder.push(
            ...(allLessons
                .filter((lesson: any) => lesson.groupId === group.id)
                .sort(
                    (a: any, b: any) =>
                        group.lessonsOrder?.indexOf(a.lessonId) -
                        group.lessonsOrder?.indexOf(b.lessonId),
                ) as unknown as GroupLessonItem[]),
        );
    }
    return lessonsInSequentialOrder;
};

export const getPrevNextCursor = async (
    courseId: string,
    domainId: mongoose.Types.ObjectId,
    lessonId?: string,
) => {
    const lessonsInSequentialOrder = await getGroupedLessons(
        courseId,
        domainId,
    );
    const indexOfCurrentLesson = lessonId
        ? lessonsInSequentialOrder.findIndex(
              (item) => item.lessonId === lessonId,
          )
        : -1;

    return {
        prevLesson:
            indexOfCurrentLesson - 1 < 0
                ? ""
                : lessonsInSequentialOrder[indexOfCurrentLesson - 1].lessonId,
        nextLesson:
            indexOfCurrentLesson + 1 > lessonsInSequentialOrder.length - 1
                ? ""
                : lessonsInSequentialOrder[indexOfCurrentLesson + 1].lessonId,
    };
};

export function evaluateLessonResult(content: Quiz, answers: number[][]) {
    let userScore = 0;
    let actualScore = 0;

    for (
        let questionIndex = 0;
        questionIndex < content.questions.length;
        questionIndex++
    ) {
        const question = content.questions[questionIndex];
        const userAnswersForThisQuestion = answers[questionIndex] || [];

        for (
            let optionIndex = 0;
            optionIndex < question.options.length;
            optionIndex++
        ) {
            const isCorrectAnswer = question.options[optionIndex].correctAnswer;
            if (isCorrectAnswer) {
                actualScore += 1;
                const userAnswerContainsThisOption =
                    userAnswersForThisQuestion.indexOf(optionIndex) !== -1;
                if (userAnswerContainsThisOption) {
                    userScore += 1;
                }
            }
        }
    }

    const userScoreInPercentage = (userScore / actualScore) * 100;
    let pass = true;
    if (content.requiresPassingGrade) {
        if (userScoreInPercentage < content.passingGrade) {
            pass = false;
        }
    }

    return {
        pass,
        score: userScoreInPercentage,
    };
}

export async function isPartOfDripGroup(
    lesson: Lesson,
    domain: mongoose.Types.ObjectId,
) {
    const cb = Criteria.create<any>();
    cb.where("courseId", "eq", lesson.courseId);
    cb.where("domain", "eq", domain);

    const course = (await repositories.course.findOne(cb)) as any;
    if (!course) {
        throw new Error(responses.item_not_found);
    }
    const group = course.groups.find(
        (group: any) => (group._id || group.id).toString() === lesson.groupId,
    );
    if (group && group.drip && group.drip.status) {
        return true;
    }

    return false;
}

export function removeCorrectAnswersProp(lesson: Lesson) {
    if (lesson.content && (lesson.content as Quiz).questions) {
        for (let question of (lesson.content as Quiz).questions as any[]) {
            question.type =
                question.options.filter((option: any) => option.correctAnswer)
                    .length > 1
                    ? "multiple"
                    : "single";
            question.options = question.options.map((option: any) => ({
                text: option.text,
            }));
        }
    }

    return lesson;
}
