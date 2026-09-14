import { Constants } from "@courselit/common-models";
import DomainModel from "@/models/Domain";
import UserModel from "@/models/User";
import CourseModel from "@/models/Course";
import LessonModel from "@/models/Lesson";
import ActivityModel from "@/models/Activity";
import { createLesson, deleteLesson, updateLesson } from "../logic";
import { deleteMedia, sealMedia } from "@/services/medialit";

jest.mock("@/services/medialit", () => ({
    deleteMedia: jest.fn(),
    sealMedia: jest.fn(),
}));

const SUITE_PREFIX = `lesson-logic-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

const mediaUrl = (mediaId: string) =>
    `https://media.example.com/${mediaId}/main.jpg`;

const docWithImage = (mediaId: string) => ({
    type: "doc",
    content: [
        {
            type: "image",
            attrs: { src: mediaUrl(mediaId) },
        },
    ],
});

const attachment = (mediaId: string, originalFileName: string) => ({
    mediaId,
    originalFileName,
    mimeType: "application/pdf",
    size: 1024,
    access: "private",
    file: `https://media.example.com/${mediaId}/main.pdf`,
    thumbnail: "",
});

describe("Lesson description and attachments", () => {
    let testDomain: any;
    let owner: any;
    let ownerCtx: any;
    let course: any;
    let groupId: string;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
            features: [],
        });

        owner = await UserModel.create({
            domain: testDomain._id,
            userId: id("owner"),
            email: email("owner"),
            name: "Owner",
            active: true,
            permissions: ["course:manage"],
            unsubscribeToken: id("unsubscribe-owner"),
            purchases: [],
        });

        groupId = id("group-1");

        course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course"),
            title: "Media Course",
            lessons: [],
            creatorId: owner.userId,
            cost: 0,
            privacy: "public",
            type: "course",
            costType: "free",
            slug: id("course-slug"),
            published: true,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    lessonsOrder: [],
                    rank: 1,
                    collapsed: true,
                    drip: {
                        status: false,
                        type: "relative-date",
                    },
                },
            ],
        });

        ownerCtx = {
            user: owner,
            subdomain: testDomain,
        } as any;
    });

    afterAll(async () => {
        await ActivityModel.deleteMany({ domain: testDomain._id });
        await LessonModel.deleteMany({ domain: testDomain._id });
        await CourseModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    beforeEach(async () => {
        // nanoid is globally mocked to a constant, so every lesson created in
        // this file would share a lessonId. Keep one lesson at a time.
        await LessonModel.deleteMany({ domain: testDomain._id });
        (sealMedia as jest.Mock).mockReset();
        (deleteMedia as jest.Mock).mockReset();
        (sealMedia as jest.Mock).mockResolvedValue(undefined);
    });

    const createVideoLesson = async (
        overrides: Record<string, unknown> = {},
    ) => {
        return await createLesson(
            {
                title: "Video lesson",
                type: Constants.LessonType.VIDEO,
                content: "",
                courseId: course.courseId,
                groupId,
                requiresEnrollment: true,
                downloadable: false,
                published: true,
                ...overrides,
            } as any,
            ownerCtx,
        );
    };

    it("stores a description alongside the media on a video lesson", async () => {
        const description = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [{ type: "text", text: "Watch this first" }],
                },
            ],
        };

        const lesson = await createVideoLesson({
            description: JSON.stringify(description),
        });

        expect(lesson.description).toEqual(description);
        expect(lesson.type).toBe(Constants.LessonType.VIDEO);
    });

    it("seals media embedded in a description on create", async () => {
        const tempMediaId = id("temp-description-media");
        const sealedUrl = mediaUrl(id("sealed-description-media"));
        (sealMedia as jest.Mock).mockResolvedValueOnce({
            mediaId: tempMediaId,
            file: sealedUrl,
        });

        const lesson = await createVideoLesson({
            description: JSON.stringify(docWithImage(tempMediaId)),
        });

        expect(sealMedia).toHaveBeenCalledWith(tempMediaId);
        expect((lesson.description as any).content[0].attrs.src).toBe(
            sealedUrl,
        );
    });

    it("seals every attachment on create", async () => {
        const firstId = id("attachment-1");
        const secondId = id("attachment-2");
        (sealMedia as jest.Mock).mockImplementation(
            async (mediaId: string) => ({
                ...attachment(mediaId, `${mediaId}.pdf`),
                file: "https://media.example.com/private.pdf",
            }),
        );

        const lesson = await createVideoLesson({
            attachments: [
                attachment(firstId, "worksheet.pdf"),
                attachment(secondId, "slides.pdf"),
            ],
        });

        expect(sealMedia).toHaveBeenCalledWith(firstId);
        expect(sealMedia).toHaveBeenCalledWith(secondId);
        expect(lesson.attachments).toHaveLength(2);
        expect(lesson.attachments!.map((item: any) => item.mediaId)).toEqual([
            firstId,
            secondId,
        ]);
        // Sealed media must not leak a direct file URL
        expect(lesson.attachments![0].file).toBeUndefined();
    });

    it("keeps the existing description when an update omits it", async () => {
        const description = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [{ type: "text", text: "Original notes" }],
                },
            ],
        };
        const lesson = await createVideoLesson({
            description: JSON.stringify(description),
        });

        const updated = await updateLesson(
            { id: lesson.lessonId, title: "Renamed" } as any,
            ownerCtx,
        );

        expect(updated.title).toBe("Renamed");
        expect(updated.description).toEqual(description);
    });

    it("deletes media dropped from a description on update", async () => {
        const keptMediaId = id("kept-media");
        const droppedMediaId = id("dropped-media");
        const lesson = await createVideoLesson({
            description: JSON.stringify({
                type: "doc",
                content: [
                    { type: "image", attrs: { src: mediaUrl(keptMediaId) } },
                    { type: "image", attrs: { src: mediaUrl(droppedMediaId) } },
                ],
            }),
        });

        await updateLesson(
            {
                id: lesson.lessonId,
                description: JSON.stringify(docWithImage(keptMediaId)),
            } as any,
            ownerCtx,
        );

        expect(deleteMedia).toHaveBeenCalledWith(droppedMediaId);
        expect(deleteMedia).not.toHaveBeenCalledWith(keptMediaId);
    });

    it("replaces the attachment list on update", async () => {
        const originalId = id("original-attachment");
        const replacementId = id("replacement-attachment");
        const lesson = await createVideoLesson({
            attachments: [attachment(originalId, "original.pdf")],
        });

        const updated = await updateLesson(
            {
                id: lesson.lessonId,
                attachments: [attachment(replacementId, "replacement.pdf")],
            } as any,
            ownerCtx,
        );

        expect(updated.attachments).toHaveLength(1);
        expect(updated.attachments![0].mediaId).toBe(replacementId);
    });

    it("cleans up description media and attachments when the lesson is deleted", async () => {
        const descriptionMediaId = id("delete-description-media");
        const attachmentMediaId = id("delete-attachment-media");
        const lesson = await createVideoLesson({
            description: JSON.stringify(docWithImage(descriptionMediaId)),
            attachments: [attachment(attachmentMediaId, "handout.pdf")],
        });

        (deleteMedia as jest.Mock).mockReset();

        await deleteLesson(lesson.lessonId, ownerCtx);

        expect(deleteMedia).toHaveBeenCalledWith(descriptionMediaId);
        expect(deleteMedia).toHaveBeenCalledWith(attachmentMediaId);
        expect(await LessonModel.findOne({ lessonId: lesson.lessonId })).toBe(
            null,
        );
    });
});
