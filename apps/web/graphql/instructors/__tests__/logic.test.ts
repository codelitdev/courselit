import { graphql } from "graphql";
import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import InstructorModel from "@models/Instructor";
import constants from "@/config/constants";
import { responses } from "@/config/strings";
import { deleteMedia, sealMedia } from "@/services/medialit";
import { updateCourse, updateGroup } from "../../courses/logic";
import type { InternalCourse } from "@courselit/orm-models";
import schema from "../../index";
import {
    createInstructor,
    deleteInstructor,
    getInstructors,
    updateInstructor,
} from "../logic";

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn().mockResolvedValue(true),
    sealMedia: jest.fn(),
}));
// the shared nanoid mock always returns the same id
jest.mock("nanoid", () => ({
    nanoid: () => Math.random().toString(36).substring(2),
}));
jest.unmock("@courselit/utils");

const sealMediaMock = sealMedia as jest.Mock;
const deleteMediaMock = deleteMedia as jest.Mock;

const SUITE_PREFIX = `instructors-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

const updateCourseById = (
    courseId: string,
    data: Partial<InternalCourse>,
    ctx: Parameters<typeof updateCourse>[1],
) => updateCourse({ ...data, id: courseId as any }, ctx);

const sealedAvatar = (mediaId: string, access = "public") => ({
    mediaId,
    originalFileName: "avatar.webp",
    mimeType: "image/webp",
    size: 1200,
    access,
    thumbnail: `https://cdn.example.com/${mediaId}/thumb.webp`,
    file: `https://cdn.example.com/${mediaId}/main.webp`,
});

describe("Instructors", () => {
    let domain: any;
    let otherDomain: any;
    let admin: any;
    let teacher: any;
    let learner: any;
    let adminCtx: any;
    let teacherCtx: any;
    let learnerCtx: any;
    let anonCtx: any;
    let otherCtx: any;

    const makeCourse = (overrides: Record<string, unknown> = {}) =>
        CourseModel.create({
            domain: domain._id,
            courseId: id(`course-${Math.random().toString(36).slice(2)}`),
            title: id(`title-${Math.random().toString(36).slice(2)}`),
            slug: id(`slug-${Math.random().toString(36).slice(2)}`),
            creatorId: admin.userId,
            type: "course",
            privacy: "public",
            costType: "free",
            cost: 0,
            published: true,
            groups: [
                {
                    _id: id("group-a"),
                    name: "Group A",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
                {
                    _id: id("group-b"),
                    name: "Group B",
                    rank: 2000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            ...overrides,
        });

    const newInstructor = (name: string, extra: Record<string, unknown> = {}) =>
        createInstructor({
            data: { name, ...extra },
            ctx: adminCtx,
        });

    beforeAll(async () => {
        domain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });
        otherDomain = await DomainModel.create({
            name: id("other-domain"),
            email: email("other-domain"),
        });
        admin = await UserModel.create({
            domain: domain._id,
            userId: id("admin"),
            email: email("admin"),
            name: "Admin",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: id("unsub-admin"),
            purchases: [],
        });
        teacher = await UserModel.create({
            domain: domain._id,
            userId: id("teacher"),
            email: email("teacher"),
            name: "Teacher",
            permissions: [constants.permissions.manageCourse],
            active: true,
            unsubscribeToken: id("unsub-teacher"),
            purchases: [],
        });
        learner = await UserModel.create({
            domain: domain._id,
            userId: id("learner"),
            email: email("learner"),
            name: "Learner",
            permissions: [],
            active: true,
            unsubscribeToken: id("unsub-learner"),
            purchases: [],
        });
        adminCtx = { subdomain: domain, user: admin, address: "" };
        teacherCtx = { subdomain: domain, user: teacher, address: "" };
        learnerCtx = { subdomain: domain, user: learner, address: "" };
        anonCtx = { subdomain: domain, address: "" };
        otherCtx = {
            subdomain: otherDomain,
            user: { ...admin.toObject(), domain: otherDomain._id },
            address: "",
        };
    });

    beforeEach(async () => {
        await InstructorModel.deleteMany({
            domain: { $in: [domain._id, otherDomain._id] },
        });
        await CourseModel.deleteMany({ domain: domain._id });
        jest.clearAllMocks();
        sealMediaMock.mockImplementation((mediaId: string) =>
            Promise.resolve(sealedAvatar(mediaId)),
        );
    });

    afterAll(async () => {
        await InstructorModel.deleteMany({
            domain: { $in: [domain._id, otherDomain._id] },
        });
        await CourseModel.deleteMany({ domain: domain._id });
        await UserModel.deleteMany({ domain: domain._id });
        await DomainModel.deleteMany({
            _id: { $in: [domain._id, otherDomain._id] },
        });
    });

    describe("createInstructor", () => {
        it("stores the profile with trimmed text and links", async () => {
            const instructor = await newInstructor("  Ada Lovelace ", {
                bio: "  Wrote the first program.  ",
                links: [
                    { label: " Website ", url: "https://ada.example.com" },
                    { label: "Blog", url: "http://blog.example.com/ada" },
                ],
            });

            expect(instructor.instructorId).toEqual(expect.any(String));
            expect(instructor.name).toBe("Ada Lovelace");
            expect(instructor.bio).toBe("Wrote the first program.");
            expect(instructor.links).toEqual([
                { label: "Website", url: "https://ada.example.com" },
                { label: "Blog", url: "http://blog.example.com/ada" },
            ]);
            const stored = await InstructorModel.findOne({
                domain: domain._id,
                instructorId: instructor.instructorId,
            }).lean();
            expect(stored?.name).toBe("Ada Lovelace");
        });

        it("only lets people who manage any course or the site create instructors", async () => {
            await expect(
                createInstructor({ data: { name: "X" }, ctx: teacherCtx }),
            ).rejects.toThrow(responses.action_not_allowed);
            await expect(
                createInstructor({ data: { name: "X" }, ctx: learnerCtx }),
            ).rejects.toThrow(responses.action_not_allowed);
            await expect(
                createInstructor({ data: { name: "X" }, ctx: anonCtx }),
            ).rejects.toThrow();
            expect(
                await InstructorModel.countDocuments({ domain: domain._id }),
            ).toBe(0);
        });

        it("accepts a site manager", async () => {
            const siteManager = {
                ...admin.toObject(),
                permissions: [constants.permissions.manageSite],
            };
            const created = await createInstructor({
                data: { name: "Site Manager Pick" },
                ctx: { subdomain: domain, user: siteManager, address: "" },
            });
            expect(created.name).toBe("Site Manager Pick");
        });

        it.each([
            ["an empty name", { name: "   " }],
            ["a name over 100 characters", { name: "n".repeat(101) }],
            [
                "a bio over 2000 characters",
                { name: "A", bio: "b".repeat(2001) },
            ],
            [
                "more than 10 links",
                {
                    name: "A",
                    links: Array.from({ length: 11 }, (_, i) => ({
                        label: `L${i}`,
                        url: `https://example.com/${i}`,
                    })),
                },
            ],
            [
                "a link without a label",
                { name: "A", links: [{ label: " ", url: "https://a.com" }] },
            ],
        ])("rejects %s", async (_, data) => {
            await expect(
                createInstructor({ data: data as any, ctx: adminCtx }),
            ).rejects.toThrow(responses.invalid_input);
        });

        it.each([
            "javascript:alert(1)",
            "data:text/html;base64,AAAA",
            "ftp://example.com/file",
            "//example.com",
            "example.com",
            "not a url",
        ])("rejects the link url %s", async (url) => {
            await expect(
                createInstructor({
                    data: { name: "A", links: [{ label: "x", url }] },
                    ctx: adminCtx,
                }),
            ).rejects.toThrow(responses.invalid_input);
        });

        it("seals a public avatar and stores it", async () => {
            const instructor = await newInstructor("With Photo", {
                avatar: { mediaId: "avatar-1" },
            });

            expect(sealMediaMock).toHaveBeenCalledWith("avatar-1");
            expect(instructor.avatar?.mediaId).toBe("avatar-1");
            expect(instructor.avatar?.file).toContain("avatar-1");
        });

        it("rejects an avatar that is not public and cleans it up", async () => {
            sealMediaMock.mockResolvedValueOnce(
                sealedAvatar("private-1", "private"),
            );

            await expect(
                newInstructor("Private Photo", {
                    avatar: { mediaId: "private-1" },
                }),
            ).rejects.toThrow(responses.invalid_input);
            expect(deleteMediaMock).toHaveBeenCalledWith("private-1");
            expect(
                await InstructorModel.countDocuments({ domain: domain._id }),
            ).toBe(0);
        });

        it("links an existing user of the same school and rejects others", async () => {
            const linked = await newInstructor("Linked", {
                userId: learner.userId,
            });
            expect(linked.userId).toBe(learner.userId);

            await expect(
                newInstructor("Ghost", { userId: "does-not-exist" }),
            ).rejects.toThrow(responses.invalid_input);
        });
    });

    describe("updateInstructor", () => {
        it("updates only the provided fields", async () => {
            const created = await newInstructor("Grace", {
                bio: "Compiler pioneer",
                links: [{ label: "Site", url: "https://grace.example.com" }],
            });

            const updated = await updateInstructor({
                instructorId: created.instructorId,
                data: { name: "Grace Hopper" },
                ctx: adminCtx,
            });

            expect(updated.name).toBe("Grace Hopper");
            expect(updated.bio).toBe("Compiler pioneer");
            expect(updated.links).toHaveLength(1);
        });

        it("clears the bio, links and user link when sent empty", async () => {
            const created = await newInstructor("Grace", {
                bio: "Compiler pioneer",
                links: [{ label: "Site", url: "https://grace.example.com" }],
                userId: learner.userId,
            });

            const updated = await updateInstructor({
                instructorId: created.instructorId,
                data: { bio: "", links: [], userId: null },
                ctx: adminCtx,
            });

            expect(updated.bio).toBeFalsy();
            expect(updated.links).toEqual([]);
            expect(updated.userId).toBeFalsy();
        });

        it("replaces the avatar and deletes the previous file", async () => {
            const created = await newInstructor("Grace", {
                avatar: { mediaId: "old-avatar" },
            });

            const updated = await updateInstructor({
                instructorId: created.instructorId,
                data: { avatar: { mediaId: "new-avatar" } },
                ctx: adminCtx,
            });

            expect(updated.avatar?.mediaId).toBe("new-avatar");
            expect(deleteMediaMock).toHaveBeenCalledWith("old-avatar");
        });

        it("removes the avatar when null is sent", async () => {
            const created = await newInstructor("Grace", {
                avatar: { mediaId: "old-avatar" },
            });

            const updated = await updateInstructor({
                instructorId: created.instructorId,
                data: { avatar: null },
                ctx: adminCtx,
            });

            expect(updated.avatar).toBeFalsy();
            expect(deleteMediaMock).toHaveBeenCalledWith("old-avatar");
        });

        it("validates like create does", async () => {
            const created = await newInstructor("Grace");
            await expect(
                updateInstructor({
                    instructorId: created.instructorId,
                    data: { name: " " },
                    ctx: adminCtx,
                }),
            ).rejects.toThrow(responses.invalid_input);
            await expect(
                updateInstructor({
                    instructorId: created.instructorId,
                    data: {
                        links: [{ label: "x", url: "javascript:alert(1)" }],
                    },
                    ctx: adminCtx,
                }),
            ).rejects.toThrow(responses.invalid_input);
        });

        it("does not touch instructors of another school or without permission", async () => {
            const created = await newInstructor("Grace");

            await expect(
                updateInstructor({
                    instructorId: created.instructorId,
                    data: { name: "Hacked" },
                    ctx: otherCtx,
                }),
            ).rejects.toThrow(responses.item_not_found);
            await expect(
                updateInstructor({
                    instructorId: created.instructorId,
                    data: { name: "Hacked" },
                    ctx: teacherCtx,
                }),
            ).rejects.toThrow(responses.action_not_allowed);
        });
    });

    describe("deleteInstructor", () => {
        it("removes the instructor, its avatar and every assignment", async () => {
            const keep = await newInstructor("Keep");
            const gone = await newInstructor("Gone", {
                avatar: { mediaId: "gone-avatar" },
            });
            const course = await makeCourse({
                instructors: [gone.instructorId, keep.instructorId],
            });
            await CourseModel.updateOne(
                { courseId: course.courseId, "groups._id": id("group-a") },
                {
                    $set: {
                        "groups.$.instructors": [
                            keep.instructorId,
                            gone.instructorId,
                        ],
                    },
                },
            );

            const result = await deleteInstructor({
                instructorId: gone.instructorId,
                ctx: adminCtx,
            });

            expect(result).toBe(true);
            expect(
                await InstructorModel.countDocuments({
                    instructorId: gone.instructorId,
                }),
            ).toBe(0);
            expect(deleteMediaMock).toHaveBeenCalledWith("gone-avatar");
            const stored: any = await CourseModel.findOne({
                courseId: course.courseId,
            }).lean();
            expect(stored.instructors).toEqual([keep.instructorId]);
            expect(stored.groups[0].instructors).toEqual([keep.instructorId]);
        });

        it("only affects the school it belongs to and needs permission", async () => {
            const created = await newInstructor("Stays");

            await expect(
                deleteInstructor({
                    instructorId: created.instructorId,
                    ctx: otherCtx,
                }),
            ).rejects.toThrow(responses.item_not_found);
            await expect(
                deleteInstructor({
                    instructorId: created.instructorId,
                    ctx: teacherCtx,
                }),
            ).rejects.toThrow(responses.action_not_allowed);
            expect(
                await InstructorModel.countDocuments({
                    instructorId: created.instructorId,
                }),
            ).toBe(1);
        });
    });

    describe("getInstructors", () => {
        it("lists the school's instructors by name for course managers", async () => {
            await newInstructor("Zed");
            await newInstructor("Ann");
            await InstructorModel.create({
                domain: otherDomain._id,
                name: "Elsewhere",
                links: [],
            });

            const asAdmin = await getInstructors(adminCtx);
            const asTeacher = await getInstructors(teacherCtx);

            expect(asAdmin.map((i: any) => i.name)).toEqual(["Ann", "Zed"]);
            expect(asTeacher.map((i: any) => i.name)).toEqual(["Ann", "Zed"]);
            await expect(getInstructors(learnerCtx)).rejects.toThrow(
                responses.action_not_allowed,
            );
        });
    });

    describe("assigning instructors to a course", () => {
        // validateCourse demands a payment plan for published courses
        it("stores the ordered, de-duplicated ids", async () => {
            const a = await newInstructor("A");
            const b = await newInstructor("B");
            const course = await makeCourse({ published: false });

            await updateCourseById(
                course.courseId,
                {
                    instructors: [
                        b.instructorId,
                        a.instructorId,
                        b.instructorId,
                    ],
                },
                adminCtx,
            );

            const stored: any = await CourseModel.findOne({
                courseId: course.courseId,
            }).lean();
            expect(stored.instructors).toEqual([
                b.instructorId,
                a.instructorId,
            ]);
        });

        it("rejects ids that are not instructors of this school", async () => {
            const foreign = await InstructorModel.create({
                domain: otherDomain._id,
                name: "Elsewhere",
                links: [],
            });
            const course = await makeCourse();

            await expect(
                updateCourseById(
                    course.courseId,
                    { instructors: ["nope"] },
                    adminCtx,
                ),
            ).rejects.toThrow(responses.invalid_input);
            await expect(
                updateCourseById(
                    course.courseId,
                    { instructors: [foreign.instructorId] },
                    adminCtx,
                ),
            ).rejects.toThrow(responses.invalid_input);
        });

        it("clears with an empty list and ignores the field when omitted", async () => {
            const a = await newInstructor("A");
            const course = await makeCourse({
                instructors: [a.instructorId],
                published: false,
            });

            await updateCourseById(
                course.courseId,
                { title: id("renamed") },
                adminCtx,
            );
            let stored: any = await CourseModel.findOne({
                courseId: course.courseId,
            }).lean();
            expect(stored.instructors).toEqual([a.instructorId]);

            await updateCourseById(
                course.courseId,
                { instructors: [] },
                adminCtx,
            );
            stored = await CourseModel.findOne({
                courseId: course.courseId,
            }).lean();
            expect(stored.instructors).toEqual([]);
        });
    });

    describe("assigning instructors to a section", () => {
        it("stores, orders and clears the section's instructors", async () => {
            const a = await newInstructor("A");
            const b = await newInstructor("B");
            const course = await makeCourse();

            await updateGroup({
                id: id("group-a"),
                courseId: course.courseId,
                instructors: [b.instructorId, a.instructorId, b.instructorId],
                ctx: adminCtx,
            });
            let stored: any = await CourseModel.findOne({
                courseId: course.courseId,
            }).lean();
            expect(stored.groups[0].instructors).toEqual([
                b.instructorId,
                a.instructorId,
            ]);
            expect(stored.groups[1].instructors ?? []).toEqual([]);

            await updateGroup({
                id: id("group-a"),
                courseId: course.courseId,
                name: "Renamed",
                ctx: adminCtx,
            });
            stored = await CourseModel.findOne({
                courseId: course.courseId,
            }).lean();
            expect(stored.groups[0].instructors).toEqual([
                b.instructorId,
                a.instructorId,
            ]);

            await updateGroup({
                id: id("group-a"),
                courseId: course.courseId,
                instructors: [],
                ctx: adminCtx,
            });
            stored = await CourseModel.findOne({
                courseId: course.courseId,
            }).lean();
            expect(stored.groups[0].instructors).toEqual([]);
        });

        it("rejects unknown instructors", async () => {
            const course = await makeCourse();
            await expect(
                updateGroup({
                    id: id("group-a"),
                    courseId: course.courseId,
                    instructors: ["nope"],
                    ctx: adminCtx,
                }),
            ).rejects.toThrow(responses.invalid_input);
        });
    });

    describe("public read through GraphQL", () => {
        const GET_COURSE = `
            query ($id: String!) {
                course: getCourse(id: $id) {
                    instructors {
                        instructorId
                        name
                        bio
                        avatar { file }
                        links { label url }
                        userId
                    }
                    groups {
                        id
                        instructors { instructorId name }
                    }
                }
            }
        `;

        it("returns the course and section instructors in stored order without the user link", async () => {
            const a = await newInstructor("Ann", {
                bio: "Teaches basics",
                avatar: { mediaId: "ann-avatar" },
                links: [{ label: "Site", url: "https://ann.example.com" }],
                userId: learner.userId,
            });
            const b = await newInstructor("Bob");
            const course = await makeCourse({
                instructors: [b.instructorId, a.instructorId],
            });
            await CourseModel.updateOne(
                { courseId: course.courseId, "groups._id": id("group-b") },
                { $set: { "groups.$.instructors": [a.instructorId] } },
            );

            const result: any = await graphql({
                schema,
                source: GET_COURSE,
                variableValues: { id: course.courseId },
                contextValue: anonCtx,
            });

            expect(result.errors).toBeUndefined();
            const { instructors, groups } = result.data.course;
            expect(instructors.map((i: any) => i.name)).toEqual(["Bob", "Ann"]);
            expect(instructors[1]).toEqual({
                instructorId: a.instructorId,
                name: "Ann",
                bio: "Teaches basics",
                avatar: { file: expect.stringContaining("ann-avatar") },
                links: [{ label: "Site", url: "https://ann.example.com" }],
                userId: null,
            });
            expect(groups[0].instructors).toEqual([]);
            expect(groups[1].instructors).toEqual([
                { instructorId: a.instructorId, name: "Ann" },
            ]);
        });

        it("shows the user link only to people who manage courses", async () => {
            const a = await newInstructor("Ann", { userId: learner.userId });
            const course = await makeCourse({ instructors: [a.instructorId] });

            const asLearner: any = await graphql({
                schema,
                source: GET_COURSE,
                variableValues: { id: course.courseId },
                contextValue: learnerCtx,
            });
            const asAdmin: any = await graphql({
                schema,
                source: GET_COURSE,
                variableValues: { id: course.courseId },
                contextValue: adminCtx,
            });

            expect(asLearner.data.course.instructors[0].userId).toBeNull();
            expect(asAdmin.data.course.instructors[0].userId).toBe(
                learner.userId,
            );
        });

        it("skips ids whose instructor no longer exists and returns [] when none are set", async () => {
            const a = await newInstructor("Ann");
            const withStale = await makeCourse({
                instructors: ["stale-id", a.instructorId],
            });
            const without = await makeCourse();

            const stale: any = await graphql({
                schema,
                source: GET_COURSE,
                variableValues: { id: withStale.courseId },
                contextValue: anonCtx,
            });
            const none: any = await graphql({
                schema,
                source: GET_COURSE,
                variableValues: { id: without.courseId },
                contextValue: anonCtx,
            });

            expect(
                stale.data.course.instructors.map((i: any) => i.name),
            ).toEqual(["Ann"]);
            expect(none.data.course.instructors).toEqual([]);
            expect(none.data.course.groups[0].instructors).toEqual([]);
        });
    });

    describe("GraphQL management API", () => {
        it("creates, lists, updates and deletes through the schema", async () => {
            const created: any = await graphql({
                schema,
                source: `
                    mutation ($data: InstructorInput!) {
                        instructor: createInstructor(instructorData: $data) {
                            instructorId
                            name
                        }
                    }
                `,
                variableValues: {
                    data: {
                        name: "Via API",
                        links: [
                            { label: "Site", url: "https://a.example.com" },
                        ],
                    },
                },
                contextValue: adminCtx,
            });
            expect(created.errors).toBeUndefined();
            const instructorId = created.data.instructor.instructorId;

            const renamed: any = await graphql({
                schema,
                source: `
                    mutation ($instructorId: String!, $data: InstructorInput!) {
                        instructor: updateInstructor(instructorId: $instructorId, instructorData: $data) {
                            name
                        }
                    }
                `,
                variableValues: {
                    instructorId,
                    data: { name: "Via API 2" },
                },
                contextValue: adminCtx,
            });
            expect(renamed.errors).toBeUndefined();
            expect(renamed.data.instructor.name).toBe("Via API 2");

            const listed: any = await graphql({
                schema,
                source: `{ instructors: getInstructors { instructorId name userId } }`,
                contextValue: adminCtx,
            });
            expect(listed.data.instructors).toEqual([
                { instructorId, name: "Via API 2", userId: null },
            ]);

            const removed: any = await graphql({
                schema,
                source: `mutation ($instructorId: String!) { deleted: deleteInstructor(instructorId: $instructorId) }`,
                variableValues: { instructorId },
                contextValue: adminCtx,
            });
            expect(removed.data.deleted).toBe(true);
        });
    });
});
