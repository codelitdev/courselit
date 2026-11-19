import type { Instructor } from "@courselit/common-models";
import {
    getLessonInstructors,
    getPageInstructors,
    joinInstructorNames,
} from "../helpers";

const person = (id: string, name = id): Instructor => ({
    instructorId: id,
    name,
    links: [],
});

describe("instructor helpers", () => {
    describe("getPageInstructors", () => {
        it("lists the course instructors first, then the section ones, without repeats", () => {
            const result = getPageInstructors({
                instructors: [person("ann"), person("bob")],
                groups: [
                    { id: "g1", instructors: [person("bob"), person("cy")] },
                    { id: "g2", instructors: [person("dee"), person("cy")] },
                    { id: "g3" },
                ],
            });

            expect(result.map((i) => i.instructorId)).toEqual([
                "ann",
                "bob",
                "cy",
                "dee",
            ]);
        });

        it("returns an empty list when nobody is assigned", () => {
            expect(getPageInstructors({})).toEqual([]);
            expect(
                getPageInstructors({ instructors: [], groups: [{ id: "g1" }] }),
            ).toEqual([]);
        });
    });

    describe("getLessonInstructors", () => {
        const course = {
            instructors: [person("ann")],
            groups: [
                { id: "g1", instructors: [person("bob")] },
                { id: "g2", instructors: [] },
                { id: "g3" },
            ],
        };

        it("prefers the section's instructors", () => {
            expect(
                getLessonInstructors(course, "g1").map((i) => i.instructorId),
            ).toEqual(["bob"]);
        });

        it("falls back to the course's instructors", () => {
            for (const groupId of ["g2", "g3", "unknown", undefined]) {
                expect(
                    getLessonInstructors(course, groupId).map(
                        (i) => i.instructorId,
                    ),
                ).toEqual(["ann"]);
            }
        });

        it("is empty when neither has instructors", () => {
            expect(getLessonInstructors({ groups: [] }, "g1")).toEqual([]);
        });
    });

    describe("joinInstructorNames", () => {
        it("joins the names with commas", () => {
            expect(joinInstructorNames([person("a", "Ann")])).toBe("Ann");
            expect(
                joinInstructorNames([person("a", "Ann"), person("b", "Bob")]),
            ).toBe("Ann, Bob");
            expect(joinInstructorNames([])).toBe("");
        });
    });
});
