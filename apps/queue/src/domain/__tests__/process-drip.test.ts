/**
 * @jest-environment node
 */

import {
    getNewAccessibleGroupIdsForPurchase,
    processDrip,
} from "../process-drip";
import { Constants } from "@courselit/common-models";
import CourseModel from "../model/course";
import UserModel from "../model/user";
import * as queries from "../queries";
import mailQueue from "../queue";
import * as posthog from "../../observability/posthog";

const DAY_IN_MS = 86_400_000;
const STOP_LOOP_ERROR_MESSAGE = "stop-loop-after-first-iteration";

jest.mock("../queue", () => ({
    __esModule: true,
    default: {
        add: jest.fn(),
    },
}));

function makeCourse(groups: any[]) {
    return {
        groups,
    } as any;
}

function makeDripGroup({
    id,
    rank,
    drip,
}: {
    id: string;
    rank: number;
    drip: any;
}) {
    return {
        _id: id,
        rank,
        drip,
    } as any;
}

function makePurchase(overrides: Partial<any> = {}) {
    return {
        accessibleGroups: [],
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        ...overrides,
    } as any;
}

describe("getNewAccessibleGroupIdsForPurchase", () => {
    it("returns empty list when no drip groups are unlockable", () => {
        const nowUTC = new Date("2026-01-02T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "future-exact",
                rank: 1000,
                drip: {
                    status: true,
                    type: "exact-date",
                    dateInUTC: nowUTC + DAY_IN_MS,
                },
            }),
            makeDripGroup({
                id: "disabled",
                rank: 2000,
                drip: {
                    status: false,
                    type: "relative-date",
                    delayInMillis: 0,
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: makePurchase(),
            nowUTC,
        });

        expect(newGroupIds).toEqual([]);
    });

    it("uses _id for exact-date group unlocks", () => {
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "exact-group-id",
                rank: 1000,
                drip: {
                    status: true,
                    type: "exact-date",
                    dateInUTC: nowUTC - DAY_IN_MS,
                },
            }),
        ]);
        const purchase = makePurchase();

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: purchase,
            nowUTC,
        });

        expect(newGroupIds).toEqual(["exact-group-id"]);
    });

    it("does not unlock exact-date drip groups when dateInUTC is invalid", () => {
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "invalid-exact",
                rank: 1000,
                drip: {
                    status: true,
                    type: "exact-date",
                    dateInUTC: "invalid-date",
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: makePurchase(),
            nowUTC,
        });

        expect(newGroupIds).toEqual([]);
    });

    it("filters out groups already present in accessibleGroups", () => {
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "already-there",
                rank: 1000,
                drip: {
                    status: true,
                    type: "exact-date",
                    dateInUTC: nowUTC - DAY_IN_MS,
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: makePurchase({
                accessibleGroups: ["already-there"],
            }),
            nowUTC,
        });

        expect(newGroupIds).toEqual([]);
    });

    it("uses lastDripAt as the relative drip anchor when available", () => {
        const nowUTC = new Date("2026-01-08T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "relative-1",
                rank: 1000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 2 * DAY_IN_MS,
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: makePurchase({
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                lastDripAt: new Date("2026-01-06T00:00:00.000Z"),
            }),
            nowUTC,
        });

        expect(newGroupIds).toEqual(["relative-1"]);
    });

    it("returns only exact-date groups when purchase anchor dates are missing", () => {
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "exact-1",
                rank: 1000,
                drip: {
                    status: true,
                    type: "exact-date",
                    dateInUTC: nowUTC - DAY_IN_MS,
                },
            }),
            makeDripGroup({
                id: "relative-1",
                rank: 2000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 0,
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: {
                accessibleGroups: [],
            } as any,
            nowUTC,
        });

        expect(newGroupIds).toEqual(["exact-1"]);
    });

    it("releases relative groups sequentially instead of unlocking all groups at once", () => {
        const nowUTC = new Date("2026-01-04T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "group-1",
                rank: 1000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 2 * DAY_IN_MS,
                },
            }),
            makeDripGroup({
                id: "group-2",
                rank: 2000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 2 * DAY_IN_MS,
                },
            }),
        ]);
        const purchase = makePurchase();

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: purchase,
            nowUTC,
        });

        expect(newGroupIds).toEqual(["group-1"]);
    });

    it("evaluates relative drip groups by rank even when input order is unsorted", () => {
        const nowUTC = new Date("2026-01-03T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "group-rank-2000",
                rank: 2000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 1 * DAY_IN_MS,
                },
            }),
            makeDripGroup({
                id: "group-rank-1000",
                rank: 1000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 1 * DAY_IN_MS,
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: makePurchase(),
            nowUTC,
        });

        expect(newGroupIds).toEqual(["group-rank-1000", "group-rank-2000"]);
    });

    it("does not unlock later relative groups before an earlier group in the sequence", () => {
        const nowUTC = new Date("2026-01-03T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "group-early",
                rank: 1000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 10 * DAY_IN_MS,
                },
            }),
            makeDripGroup({
                id: "group-late",
                rank: 2000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 1 * DAY_IN_MS,
                },
            }),
        ]);
        const purchase = makePurchase();

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: purchase,
            nowUTC,
        });

        expect(newGroupIds).toEqual([]);
    });

    it("supports relative drips with 0-day delay", () => {
        const nowUTC = new Date("2026-01-01T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "instant-relative",
                rank: 1000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 0,
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: makePurchase(),
            nowUTC,
        });

        expect(newGroupIds).toEqual(["instant-relative"]);
    });

    it("stops evaluating relative groups after encountering a negative delay", () => {
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "bad-group",
                rank: 1000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: -1,
                },
            }),
            makeDripGroup({
                id: "next-group",
                rank: 2000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: 0,
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: makePurchase(),
            nowUTC,
        });

        expect(newGroupIds).toEqual([]);
    });

    it("combines exact-date and relative unlocks without duplicates", () => {
        const nowUTC = new Date("2026-01-03T00:00:00.000Z").getTime();
        const course = makeCourse([
            makeDripGroup({
                id: "shared-group",
                rank: 1000,
                drip: {
                    status: true,
                    type: "exact-date",
                    dateInUTC: nowUTC - DAY_IN_MS,
                },
            }),
            makeDripGroup({
                id: "relative-group",
                rank: 2000,
                drip: {
                    status: true,
                    type: "relative-date",
                    delayInMillis: DAY_IN_MS,
                },
            }),
        ]);

        const newGroupIds = getNewAccessibleGroupIdsForPurchase({
            course,
            userProgressInCourse: makePurchase({
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
            }),
            nowUTC,
        });

        expect(newGroupIds).toEqual(["shared-group", "relative-group"]);
    });
});

describe("processDrip", () => {
    function mockStopLoopAfterFirstIteration() {
        const stopError = new Error(STOP_LOOP_ERROR_MESSAGE);
        const setTimeoutSpy = jest
            .spyOn(global, "setTimeout")
            .mockImplementation(() => {
                throw stopError;
            });
        return { stopError, setTimeoutSpy };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("updates accessible groups and queues drip email when a new group unlocks", async () => {
        const { stopError } = mockStopLoopAfterFirstIteration();
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        jest.spyOn(Date.prototype, "getTime").mockReturnValue(nowUTC);

        const course = {
            courseId: "course-1",
            creatorId: "creator-1",
            domain: "domain-1",
            slug: "course-1",
            title: "Course One",
            groups: [
                makeDripGroup({
                    id: "group-1",
                    rank: 1000,
                    drip: {
                        status: true,
                        type: "exact-date",
                        dateInUTC: nowUTC - DAY_IN_MS,
                        email: {
                            subject: "Section unlocked",
                            content: {
                                content: [
                                    {
                                        blockType: "text",
                                        settings: {
                                            content: "Hi {{ subscriber.name }}",
                                        },
                                    },
                                ],
                            },
                        },
                    },
                }),
            ],
        } as any;

        const creator = {
            userId: "creator-1",
            name: "Creator Name",
            email: "creator@example.com",
        } as any;

        const user = {
            userId: "user-1",
            email: "user@example.com",
            name: "Student",
            tags: [],
            unsubscribeToken: "token-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                },
            ],
        } as any;

        jest.spyOn(CourseModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([course]),
        } as any);
        jest.spyOn(UserModel, "findOne").mockReturnValue({
            lean: jest.fn().mockResolvedValue(creator),
        } as any);
        jest.spyOn(UserModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([user]),
        } as any);
        const updateOneSpy = jest
            .spyOn(UserModel, "updateOne")
            .mockResolvedValue({} as any);

        jest.spyOn(queries, "getMemberships").mockResolvedValue([
            {
                userId: "user-1",
            } as any,
        ]);
        jest.spyOn(queries, "getDomain").mockResolvedValue({
            settings: { mailingAddress: "Main street" },
            name: "school",
        } as any);

        await expect(processDrip()).rejects.toThrow(stopError);

        expect(queries.getMemberships).toHaveBeenCalledWith(
            "course-1",
            Constants.MembershipEntityType.COURSE,
            "domain-1",
        );
        expect(updateOneSpy).toHaveBeenCalledTimes(1);
        expect(updateOneSpy).toHaveBeenCalledWith(
            {
                userId: "user-1",
                "purchases.courseId": "course-1",
            },
            {
                $addToSet: {
                    "purchases.$.accessibleGroups": {
                        $each: ["group-1"],
                    },
                },
            },
        );
        expect((mailQueue as any).add).toHaveBeenCalledTimes(1);
        expect((mailQueue as any).add).toHaveBeenCalledWith(
            "mail",
            expect.objectContaining({
                to: "user@example.com",
                subject: "Section unlocked",
                domainId: "domain-1",
            }),
        );
    });

    it("queues email for later unlocked group when first unlocked group has no drip email", async () => {
        const { stopError } = mockStopLoopAfterFirstIteration();
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        jest.spyOn(Date.prototype, "getTime").mockReturnValue(nowUTC);

        const course = {
            courseId: "course-1",
            creatorId: "creator-1",
            domain: "domain-1",
            slug: "course-1",
            title: "Course One",
            groups: [
                makeDripGroup({
                    id: "group-1",
                    rank: 1000,
                    drip: {
                        status: true,
                        type: "exact-date",
                        dateInUTC: nowUTC - DAY_IN_MS,
                    },
                }),
                makeDripGroup({
                    id: "group-2",
                    rank: 2000,
                    drip: {
                        status: true,
                        type: "exact-date",
                        dateInUTC: nowUTC - DAY_IN_MS,
                        email: {
                            subject: "Second section unlocked",
                            content: {
                                content: [
                                    {
                                        blockType: "text",
                                        settings: {
                                            content: "Section two is now live",
                                        },
                                    },
                                ],
                            },
                        },
                    },
                }),
            ],
        } as any;

        const creator = {
            userId: "creator-1",
            name: "Creator Name",
            email: "creator@example.com",
        } as any;

        const user = {
            userId: "user-1",
            email: "user@example.com",
            name: "Student",
            tags: [],
            unsubscribeToken: "token-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                },
            ],
        } as any;

        jest.spyOn(CourseModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([course]),
        } as any);
        jest.spyOn(UserModel, "findOne").mockReturnValue({
            lean: jest.fn().mockResolvedValue(creator),
        } as any);
        jest.spyOn(UserModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([user]),
        } as any);
        const updateOneSpy = jest
            .spyOn(UserModel, "updateOne")
            .mockResolvedValue({} as any);
        jest.spyOn(queries, "getMemberships").mockResolvedValue([
            {
                userId: "user-1",
            } as any,
        ]);
        jest.spyOn(queries, "getDomain").mockResolvedValue({
            settings: { mailingAddress: "Main street" },
            name: "school",
        } as any);

        await expect(processDrip()).rejects.toThrow(stopError);

        expect(updateOneSpy).toHaveBeenCalledWith(
            {
                userId: "user-1",
                "purchases.courseId": "course-1",
            },
            {
                $addToSet: {
                    "purchases.$.accessibleGroups": {
                        $each: ["group-1", "group-2"],
                    },
                },
            },
        );
        expect((mailQueue as any).add).toHaveBeenCalledTimes(1);
        expect((mailQueue as any).add).toHaveBeenCalledWith(
            "mail",
            expect.objectContaining({
                subject: "Second section unlocked",
                to: "user@example.com",
                domainId: "domain-1",
            }),
        );
    });

    it("queues one email per unlocked group with drip email configured", async () => {
        const { stopError } = mockStopLoopAfterFirstIteration();
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        jest.spyOn(Date.prototype, "getTime").mockReturnValue(nowUTC);

        const course = {
            courseId: "course-1",
            creatorId: "creator-1",
            domain: "domain-1",
            slug: "course-1",
            title: "Course One",
            groups: [
                makeDripGroup({
                    id: "group-1",
                    rank: 1000,
                    drip: {
                        status: true,
                        type: "exact-date",
                        dateInUTC: nowUTC - DAY_IN_MS,
                        email: {
                            subject: "First section unlocked",
                            content: {
                                content: [
                                    {
                                        blockType: "text",
                                        settings: {
                                            content: "Section one is now live",
                                        },
                                    },
                                ],
                            },
                        },
                    },
                }),
                makeDripGroup({
                    id: "group-2",
                    rank: 2000,
                    drip: {
                        status: true,
                        type: "exact-date",
                        dateInUTC: nowUTC - DAY_IN_MS,
                        email: {
                            subject: "Second section unlocked",
                            content: {
                                content: [
                                    {
                                        blockType: "text",
                                        settings: {
                                            content: "Section two is now live",
                                        },
                                    },
                                ],
                            },
                        },
                    },
                }),
            ],
        } as any;

        const creator = {
            userId: "creator-1",
            name: "Creator Name",
            email: "creator@example.com",
        } as any;

        const user = {
            userId: "user-1",
            email: "user@example.com",
            name: "Student",
            tags: [],
            unsubscribeToken: "token-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                },
            ],
        } as any;

        jest.spyOn(CourseModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([course]),
        } as any);
        jest.spyOn(UserModel, "findOne").mockReturnValue({
            lean: jest.fn().mockResolvedValue(creator),
        } as any);
        jest.spyOn(UserModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([user]),
        } as any);
        jest.spyOn(UserModel, "updateOne").mockResolvedValue({} as any);
        jest.spyOn(queries, "getMemberships").mockResolvedValue([
            {
                userId: "user-1",
            } as any,
        ]);
        jest.spyOn(queries, "getDomain").mockResolvedValue({
            settings: { mailingAddress: "Main street" },
            name: "school",
        } as any);

        await expect(processDrip()).rejects.toThrow(stopError);

        expect((mailQueue as any).add).toHaveBeenCalledTimes(2);
        expect((mailQueue as any).add).toHaveBeenNthCalledWith(
            1,
            "mail",
            expect.objectContaining({
                subject: "First section unlocked",
            }),
        );
        expect((mailQueue as any).add).toHaveBeenNthCalledWith(
            2,
            "mail",
            expect.objectContaining({
                subject: "Second section unlocked",
            }),
        );
    });

    it("does not queue email when drip email content is missing", async () => {
        const { stopError } = mockStopLoopAfterFirstIteration();
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        jest.spyOn(Date.prototype, "getTime").mockReturnValue(nowUTC);

        const course = {
            courseId: "course-1",
            creatorId: "creator-1",
            domain: "domain-1",
            slug: "course-1",
            title: "Course One",
            groups: [
                makeDripGroup({
                    id: "group-1",
                    rank: 1000,
                    drip: {
                        status: true,
                        type: "exact-date",
                        dateInUTC: nowUTC - DAY_IN_MS,
                    },
                }),
            ],
        } as any;

        const user = {
            userId: "user-1",
            email: "user@example.com",
            name: "Student",
            tags: [],
            unsubscribeToken: "token-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                },
            ],
        } as any;

        jest.spyOn(CourseModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([course]),
        } as any);
        jest.spyOn(UserModel, "findOne").mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
        } as any);
        jest.spyOn(UserModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([user]),
        } as any);
        jest.spyOn(UserModel, "updateOne").mockResolvedValue({} as any);

        jest.spyOn(queries, "getMemberships").mockResolvedValue([
            {
                userId: "user-1",
            } as any,
        ]);

        await expect(processDrip()).rejects.toThrow(stopError);

        expect((mailQueue as any).add).not.toHaveBeenCalled();
    });

    it("does not update lastDripAt when only exact-date groups unlock", async () => {
        const { stopError } = mockStopLoopAfterFirstIteration();
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        jest.spyOn(Date.prototype, "getTime").mockReturnValue(nowUTC);

        const course = {
            courseId: "course-1",
            creatorId: "creator-1",
            domain: "domain-1",
            slug: "course-1",
            title: "Course One",
            groups: [
                makeDripGroup({
                    id: "exact-group",
                    rank: 1000,
                    drip: {
                        status: true,
                        type: "exact-date",
                        dateInUTC: nowUTC - DAY_IN_MS,
                    },
                }),
            ],
        } as any;

        const user = {
            userId: "user-1",
            email: "user@example.com",
            name: "Student",
            tags: [],
            unsubscribeToken: "token-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                    lastDripAt: new Date("2026-01-05T00:00:00.000Z"),
                },
            ],
        } as any;

        jest.spyOn(CourseModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([course]),
        } as any);
        jest.spyOn(UserModel, "findOne").mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
        } as any);
        jest.spyOn(UserModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([user]),
        } as any);
        const updateOneSpy = jest
            .spyOn(UserModel, "updateOne")
            .mockResolvedValue({} as any);
        jest.spyOn(queries, "getMemberships").mockResolvedValue([
            {
                userId: "user-1",
            } as any,
        ]);

        await expect(processDrip()).rejects.toThrow(stopError);

        expect(updateOneSpy).toHaveBeenCalledWith(
            {
                userId: "user-1",
                "purchases.courseId": "course-1",
            },
            {
                $addToSet: {
                    "purchases.$.accessibleGroups": {
                        $each: ["exact-group"],
                    },
                },
            },
        );
    });

    it("updates lastDripAt when a relative-date group unlocks", async () => {
        const { stopError } = mockStopLoopAfterFirstIteration();
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        jest.spyOn(Date.prototype, "getTime").mockReturnValue(nowUTC);

        const course = {
            courseId: "course-1",
            creatorId: "creator-1",
            domain: "domain-1",
            slug: "course-1",
            title: "Course One",
            groups: [
                makeDripGroup({
                    id: "relative-group",
                    rank: 1000,
                    drip: {
                        status: true,
                        type: "relative-date",
                        delayInMillis: 0,
                    },
                }),
            ],
        } as any;

        const user = {
            userId: "user-1",
            email: "user@example.com",
            name: "Student",
            tags: [],
            unsubscribeToken: "token-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                },
            ],
        } as any;

        jest.spyOn(CourseModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([course]),
        } as any);
        jest.spyOn(UserModel, "findOne").mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
        } as any);
        jest.spyOn(UserModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([user]),
        } as any);
        const updateOneSpy = jest
            .spyOn(UserModel, "updateOne")
            .mockResolvedValue({} as any);
        jest.spyOn(queries, "getMemberships").mockResolvedValue([
            {
                userId: "user-1",
            } as any,
        ]);

        await expect(processDrip()).rejects.toThrow(stopError);

        expect(updateOneSpy).toHaveBeenCalledWith(
            {
                userId: "user-1",
                "purchases.courseId": "course-1",
            },
            {
                $addToSet: {
                    "purchases.$.accessibleGroups": {
                        $each: ["relative-group"],
                    },
                },
                $set: {
                    "purchases.$.lastDripAt": expect.any(Date),
                },
            },
        );
    });

    it("does not update users when no new groups are unlockable", async () => {
        const { stopError } = mockStopLoopAfterFirstIteration();
        const nowUTC = new Date("2026-01-02T00:00:00.000Z").getTime();
        jest.spyOn(Date.prototype, "getTime").mockReturnValue(nowUTC);

        const course = {
            courseId: "course-1",
            creatorId: "creator-1",
            domain: "domain-1",
            slug: "course-1",
            title: "Course One",
            groups: [
                makeDripGroup({
                    id: "group-1",
                    rank: 1000,
                    drip: {
                        status: true,
                        type: "exact-date",
                        dateInUTC: nowUTC + DAY_IN_MS,
                    },
                }),
            ],
        } as any;

        const user = {
            userId: "user-1",
            email: "user@example.com",
            name: "Student",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date("2026-01-01T00:00:00.000Z"),
                },
            ],
        } as any;

        jest.spyOn(CourseModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([course]),
        } as any);
        jest.spyOn(UserModel, "findOne").mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
        } as any);
        jest.spyOn(UserModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([user]),
        } as any);
        const updateOneSpy = jest
            .spyOn(UserModel, "updateOne")
            .mockResolvedValue({} as any);
        jest.spyOn(queries, "getMemberships").mockResolvedValue([
            {
                userId: "user-1",
            } as any,
        ]);

        await expect(processDrip()).rejects.toThrow(stopError);

        expect(updateOneSpy).not.toHaveBeenCalled();
        expect((mailQueue as any).add).not.toHaveBeenCalled();
    });

    it("captures per-course errors and continues the loop", async () => {
        const { stopError } = mockStopLoopAfterFirstIteration();
        const nowUTC = new Date("2026-01-10T00:00:00.000Z").getTime();
        jest.spyOn(Date.prototype, "getTime").mockReturnValue(nowUTC);

        jest.spyOn(CourseModel, "find").mockReturnValue({
            lean: jest.fn().mockResolvedValue([
                {
                    courseId: "course-1",
                    creatorId: "creator-1",
                    domain: "domain-1",
                    slug: "course-1",
                    title: "Course One",
                    groups: [],
                },
            ]),
        } as any);
        jest.spyOn(UserModel, "findOne").mockReturnValue({
            lean: jest
                .fn()
                .mockRejectedValue(new Error("creator-query-failed")),
        } as any);
        const captureErrorSpy = jest
            .spyOn(posthog, "captureError")
            .mockImplementation(() => {});

        await expect(processDrip()).rejects.toThrow(stopError);

        expect(captureErrorSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                source: "processDrip.course",
                domainId: "domain-1",
                context: {
                    course_id: "course-1",
                },
            }),
        );
    });
});
