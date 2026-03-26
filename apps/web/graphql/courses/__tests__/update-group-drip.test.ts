import DomainModel from "@models/Domain";
import UserModel from "@models/User";
import CourseModel from "@models/Course";
import constants from "@/config/constants";
import { responses } from "@/config/strings";
import { Constants } from "@courselit/common-models";
import { updateGroup } from "../logic";

const SUITE_PREFIX = `update-group-drip-${Date.now()}`;
const id = (suffix: string) => `${SUITE_PREFIX}-${suffix}`;
const email = (suffix: string) => `${suffix}-${SUITE_PREFIX}@example.com`;

describe("updateGroup drip status updates", () => {
    let testDomain: any;
    let adminUser: any;

    beforeAll(async () => {
        testDomain = await DomainModel.create({
            name: id("domain"),
            email: email("domain"),
        });

        adminUser = await UserModel.create({
            domain: testDomain._id,
            userId: id("admin-user"),
            email: email("admin"),
            name: "Admin User",
            permissions: [constants.permissions.manageAnyCourse],
            active: true,
            unsubscribeToken: id("unsubscribe-admin"),
            purchases: [],
        });
    });

    beforeEach(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
    });

    afterAll(async () => {
        await CourseModel.deleteMany({ domain: testDomain._id });
        await UserModel.deleteMany({ domain: testDomain._id });
        await DomainModel.deleteOne({ _id: testDomain._id });
    });

    it("persists drip.status=false when disabling scheduled release", async () => {
        const groupId = id("group");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course"),
            title: id("course-title"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0],
                        delayInMillis: 2 * 86_400_000,
                    },
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug"),
        });

        await updateGroup({
            id: groupId,
            courseId: course.courseId,
            drip: {
                status: false,
                type: Constants.dripType[0],
                delayInMillis: 2,
            },
            ctx: {
                subdomain: testDomain,
                user: adminUser,
                address: "",
            },
        });

        const updatedCourse = await CourseModel.findOne({
            domain: testDomain._id,
            courseId: course.courseId,
        }).lean();
        expect(updatedCourse?.groups?.[0]?.drip?.status).toBe(false);
        expect(updatedCourse?.groups?.[0]?.drip?.delayInMillis).toBe(
            2 * constants.relativeDripUnitInMillis,
        );
    });

    it("rejects status-only drip updates when the group has no drip type yet", async () => {
        const groupId = id("group-without-drip");
        const course = await CourseModel.create({
            domain: testDomain._id,
            courseId: id("course-without-drip"),
            title: id("course-title-without-drip"),
            creatorId: adminUser.userId,
            groups: [
                {
                    _id: groupId,
                    name: "Group 1",
                    rank: 1000,
                    collapsed: true,
                    lessonsOrder: [],
                },
            ],
            lessons: [],
            type: "course",
            privacy: "unlisted",
            costType: "free",
            cost: 0,
            slug: id("course-slug-without-drip"),
        });

        await expect(
            updateGroup({
                id: groupId,
                courseId: course.courseId,
                drip: {
                    status: false,
                },
                ctx: {
                    subdomain: testDomain,
                    user: adminUser,
                    address: "",
                },
            }),
        ).rejects.toThrow(responses.invalid_input);

        const updatedCourse = await CourseModel.findOne({
            domain: testDomain._id,
            courseId: course.courseId,
        }).lean();

        expect(updatedCourse?.groups?.[0]?.drip).toBeUndefined();
    });
});
