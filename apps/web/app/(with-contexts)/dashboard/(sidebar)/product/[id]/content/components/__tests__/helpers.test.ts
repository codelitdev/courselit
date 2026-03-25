import { applyLessonMove, buildLessonMap } from "../helpers";

describe("content lesson helpers", () => {
    it("builds lesson map by section order", () => {
        const sections: any[] = [
            {
                id: "group-1",
                lessonsOrder: ["lesson-2", "lesson-1"],
            },
        ];
        const lessons: any[] = [
            { lessonId: "lesson-1", groupId: "group-1", title: "L1" },
            { lessonId: "lesson-2", groupId: "group-1", title: "L2" },
        ];

        const map = buildLessonMap(sections as any, lessons as any);
        expect(map["group-1"].map((lesson) => lesson.lessonId)).toEqual([
            "lesson-2",
            "lesson-1",
        ]);
    });

    it("moves lessons across sections optimistically", () => {
        const current: any = {
            "group-1": [
                { lessonId: "lesson-1", groupId: "group-1", title: "L1" },
                { lessonId: "lesson-2", groupId: "group-1", title: "L2" },
            ],
            "group-2": [],
        };

        const next = applyLessonMove({
            current,
            lessonId: "lesson-2",
            sourceSectionId: "group-1",
            destinationSectionId: "group-2",
            destinationIndex: 0,
        });

        expect(next["group-1"].map((lesson: any) => lesson.lessonId)).toEqual([
            "lesson-1",
        ]);
        expect(next["group-2"].map((lesson: any) => lesson.lessonId)).toEqual([
            "lesson-2",
        ]);
        expect(next["group-2"][0].groupId).toBe("group-2");
    });
});
