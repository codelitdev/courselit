import { formatCourse } from "../helpers";

describe("course helpers formatCourse", () => {
    const makeCourse = () =>
        ({
            title: "Course",
            description: "{}",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator",
            slug: "course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-2",
                    name: "Group 2",
                    rank: 2000,
                    lessonsOrder: ["lesson-3", "lesson-2"],
                },
                {
                    id: "group-1",
                    name: "Group 1",
                    rank: 1000,
                    lessonsOrder: ["lesson-1"],
                },
            ],
            lessons: [
                {
                    lessonId: "lesson-2",
                    title: "Lesson 2",
                    groupId: "group-2",
                },
                {
                    lessonId: "lesson-1",
                    title: "Lesson 1",
                    groupId: "group-1",
                },
                {
                    lessonId: "lesson-3",
                    title: "Lesson 3",
                    groupId: "group-2",
                },
            ],
        }) as any;

    it("preserves group order from the backend response", () => {
        const formatted = formatCourse(makeCourse());

        expect(formatted.groups.map((group) => group.id)).toEqual([
            "group-2",
            "group-1",
        ]);
    });

    it("sorts lessons within each group by lessonsOrder", () => {
        const formatted = formatCourse(makeCourse());

        expect(
            formatted.groups[0].lessons.map((lesson) => lesson.lessonId),
        ).toEqual(["lesson-3", "lesson-2"]);
    });
});
