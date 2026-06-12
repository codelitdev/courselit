let mockPathname = "/course/test-course/course-1";
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
    usePathname: () => mockPathname,
    useRouter: () => ({ push: jest.fn() }),
    useSearchParams: () => mockSearchParams,
}));

jest.mock("next/link", () => {
    function MockLink({
        children,
        href,
        ...props
    }: {
        children: React.ReactNode;
        href: string;
    }) {
        return (
            <a href={href} {...props}>
                {children}
            </a>
        );
    }

    return MockLink;
});

jest.mock("@components/contexts", () => {
    const React = require("react");

    return {
        ProfileContext: React.createContext({
            profile: {
                userId: "user-1",
                purchases: [],
            },
        }),
        SiteInfoContext: React.createContext({
            title: "Test Site",
            logo: undefined,
            hideCourseLitBranding: true,
        }),
        ThemeContext: React.createContext({
            theme: {},
        }),
        AddressContext: React.createContext({
            backend: "http://localhost:3000",
            frontend: "http://localhost:3000",
        }),
    };
});

jest.mock("@components/ui/sidebar", () => ({
    Sidebar: ({ children }: any) => children,
    SidebarContent: ({ children }: any) => children,
    SidebarGroup: ({ children }: any) => children,
    SidebarGroupContent: ({ children }: any) => children,
    SidebarGroupLabel: ({ children }: any) => children,
    SidebarHeader: ({ children }: any) => children,
    SidebarInset: ({ children }: any) => children,
    SidebarMenu: ({ children }: any) => children,
    SidebarMenuButton: ({ children }: any) => children,
    SidebarMenuItem: ({ children }: any) => children,
    SidebarProvider: ({ children }: any) => children,
    SidebarTrigger: () => null,
    useSidebar: () => ({
        open: false,
        openMobile: false,
        isMobile: false,
        setOpenMobile: jest.fn(),
    }),
}));

jest.mock("@components/ui/tooltip", () => ({
    Tooltip: ({ children }: any) => children,
    TooltipContent: ({ children }: any) => children,
    TooltipProvider: ({ children }: any) => children,
    TooltipTrigger: ({ children }: any) => children,
}));

jest.mock("@components/ui/collapsible", () => ({
    Collapsible: ({ children }: any) => children,
    CollapsibleContent: ({ children }: any) => children,
    CollapsibleTrigger: ({ children }: any) => children,
}));

jest.mock("@components/ui/button", () => ({
    Button: ({ children }: any) => children,
}));

jest.mock("@components/admin/next-theme-switcher", () => () => null);

jest.mock("@/components/public/product-discussions/panel", () => () => null);

jest.mock("@courselit/components-library", () => ({
    Image: () => null,
}));

jest.mock("@courselit/page-blocks", () => ({
    TextRenderer: () => null,
}));

jest.mock("@courselit/text-editor", () => ({
    Editor: () => null,
    emptyDoc: {},
}));

jest.mock("@courselit/icons", () => ({
    CheckCircled: () => null,
    Circle: () => null,
    Lock: () => null,
}));

jest.mock("lucide-react", () => ({
    BookOpen: () => null,
    ChevronRight: () => null,
    Clock: () => null,
    Folder: () => null,
    LogOutIcon: () => null,
    MessageSquare: () => null,
}));

jest.mock("@courselit/page-primitives", () => ({
    Caption: ({ children }: any) => children,
}));

jest.mock("@ui-lib/utils", () => ({
    formattedLocaleDate: () => "Mar 22, 2026",
    isEnrolled: () => true,
    isLessonCompleted: () => false,
}));

import { Constants, Profile } from "@courselit/common-models";
import ProductPage, { generateSideBarItems } from "../layout-with-sidebar";
import { CourseFrontend } from "../helpers";
import constants from "@/config/constants";
import { render, screen } from "@testing-library/react";

describe("generateSideBarItems", () => {
    const originalDateNow = Date.now;
    const originalRelativeDripUnitInMillis = constants.relativeDripUnitInMillis;

    beforeEach(() => {
        mockPathname = "/course/test-course/course-1";
        mockSearchParams = new URLSearchParams();
        Date.now = jest.fn(() =>
            new Date("2026-03-22T00:00:00.000Z").getTime(),
        );
        Object.assign(constants, {
            relativeDripUnitInMillis: 1,
        });
    });

    afterEach(() => {
        Date.now = originalDateNow;
        Object.assign(constants, {
            relativeDripUnitInMillis: originalRelativeDripUnitInMillis,
        });
    });

    it("hides the drip badge once the group has been released to the learner", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "First section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: "2026-03-22T00:00:00.000Z",
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-1"],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge).toBeUndefined();
    });

    it("hides the drip badge when a released group is keyed by _id", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    _id: "group-legacy-1",
                    name: "First section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: "2026-03-22T00:00:00.000Z",
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-legacy-1"],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge).toBeUndefined();
    });

    it("shows cumulative relative drip time for later sections", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-0",
                    name: "Exact Date Section 1",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: new Date(
                            "2099-03-24T00:00:00.000Z",
                        ).getTime(),
                    },
                },
                {
                    id: "group-1",
                    name: "Tenth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
                {
                    id: "group-3",
                    name: "Exact Date Section 2",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: new Date(
                            "2026-03-25T00:00:00.000Z",
                        ).getTime(),
                    },
                },
                {
                    id: "group-4",
                    name: "Twelfth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 1,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[2].badge?.text).toBe("2 days");
        expect(items[4].badge?.text).toBe("3 days");
    });

    it("shows cumulative relative drip time across consecutive locked sections", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Eighth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
                {
                    id: "group-2",
                    name: "Ninth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 1,
                    },
                },
                {
                    id: "group-3",
                    name: "Tenth Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 5,
                    },
                },
                {
                    id: "group-4",
                    name: "Eleventh Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[3].badge?.text).toBe("8 days");
        expect(items[4].badge?.text).toBe("10 days");
    });

    it("shows exact-date drip labels based on dateInUTC", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Exact Date Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: new Date(
                            "2099-03-24T00:00:00.000Z",
                        ).getTime(),
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge?.text).toBe("Mar 22, 2026");
        expect(items[1].badge?.description).toBe("Available on Mar 22, 2026");
    });

    it("does not let prior relative drips affect exact-date labels", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Relative Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 50,
                    },
                },
                {
                    id: "group-2",
                    name: "Exact Date Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[1].split("-")[0].toUpperCase(),
                        dateInUTC: new Date(
                            "2026-03-24T00:00:00.000Z",
                        ).getTime(),
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[2].badge?.text).toBe("Mar 22, 2026");
        expect(items[2].badge?.description).toBe("");
    });

    it("uses purchase createdAt as the relative drip anchor when lastDripAt is absent", () => {
        Object.assign(constants, {
            relativeDripUnitInMillis: 86_400_000,
        });

        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Relative Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2 * constants.relativeDripUnitInMillis,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date(
                        "2026-03-20T00:00:00.000Z",
                    ).toISOString(),
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge?.text).toBe("0 days");
    });

    it("uses purchase lastDripAt as the relative drip anchor when present", () => {
        Object.assign(constants, {
            relativeDripUnitInMillis: 86_400_000,
        });

        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Relative Section",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2 * constants.relativeDripUnitInMillis,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                    createdAt: new Date(
                        "2026-03-10T00:00:00.000Z",
                    ).toISOString(),
                    lastDripAt: new Date(
                        "2026-03-21T00:00:00.000Z",
                    ).toISOString(),
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge?.text).toBe("1 days");
    });

    it("does not accumulate already accessible relative sections after lastDripAt", () => {
        Object.assign(constants, {
            relativeDripUnitInMillis: 1,
        });

        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [
                {
                    id: "group-1",
                    name: "Relative Section 1",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
                {
                    id: "group-2",
                    name: "Relative Section 2",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 5,
                    },
                },
                {
                    id: "group-3",
                    name: "Relative Section 3",
                    lessons: [],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 3,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-1", "group-2"],
                    createdAt: new Date(
                        "2026-03-10T00:00:00.000Z",
                    ).toISOString(),
                    lastDripAt: new Date(
                        "2026-03-22T00:00:00.000Z",
                    ).toISOString(),
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[3].badge?.text).toBe("3 days");
    });

    it("renders reordered lessons under the destination section in sidebar order", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-2",
            groups: [
                {
                    id: "group-1",
                    name: "First Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Text 1",
                            requiresEnrollment: false,
                        },
                    ],
                },
                {
                    id: "group-2",
                    name: "Second Section",
                    lessons: [
                        {
                            lessonId: "lesson-2",
                            title: "Chapter 5 - Text 2",
                            requiresEnrollment: false,
                        },
                        {
                            lessonId: "lesson-3",
                            title: "Text 3",
                            requiresEnrollment: false,
                        },
                    ],
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: ["group-1", "group-2"],
                },
            ],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        const firstSectionItems = items.find(
            (item) => item.title === "First Section",
        )?.items;
        const secondSectionItems = items.find(
            (item) => item.title === "Second Section",
        )?.items;

        expect(firstSectionItems?.map((item) => item.title)).toEqual([
            "Text 1",
        ]);
        expect(secondSectionItems?.map((item) => item.title)).toEqual([
            "Chapter 5 - Text 2",
            "Text 3",
        ]);
    });

    it("shows dripped enrollment-gated lessons as unlocked in preview mode", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: true,
            groups: [
                {
                    id: "group-1",
                    name: "Admin Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Gated Lesson",
                            requiresEnrollment: true,
                        },
                    ],
                    drip: {
                        status: true,
                        type: Constants.dripType[0].split("-")[0].toUpperCase(),
                        delayInMillis: 2,
                    },
                },
            ],
        } as unknown as CourseFrontend;

        const profile = {
            userId: "admin-1",
            purchases: [],
        } as unknown as Profile;

        const items = generateSideBarItems(
            course,
            profile,
            "/course/test-course/course-1",
        );

        expect(items[1].badge).toBeUndefined();
        expect(items[1].items?.[0].icon).toBeUndefined();
    });
});

describe("Course viewer layout", () => {
    beforeEach(() => {
        mockPathname = "/course/test-course/course-1";
        mockSearchParams = new URLSearchParams();
    });

    it("renders the preview badge in the viewer header when preview mode is active", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: true,
            groups: [],
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Course body</div>
            </ProductPage>,
        );

        expect(screen.getByText("Preview")).toBeInTheDocument();
    });

    it("shows the discussions sidebar item only when discussions are enabled", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            groups: [],
            discussions: false,
        } as unknown as CourseFrontend;

        const profile = {
            userId: "user-1",
            purchases: [
                {
                    courseId: "course-1",
                    accessibleGroups: [],
                },
            ],
        } as unknown as Profile;

        expect(
            generateSideBarItems(
                course,
                profile,
                "/course/test-course/course-1",
            ).some((item) => item.title === "Discussions"),
        ).toBe(false);

        expect(
            generateSideBarItems(
                { ...course, discussions: true } as CourseFrontend,
                profile,
                "/course/test-course/course-1/discussions",
            ).find((item) => item.title === "Discussions"),
        ).toMatchObject({
            href: "/course/test-course/course-1/discussions",
            isActive: true,
        });
    });

    it("does not show a discussions header action on the course overview page", () => {
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Course body</div>
            </ProductPage>,
        );

        expect(screen.queryByLabelText("Discussions")).not.toBeInTheDocument();
    });

    it("does not show a discussions header action on the discussions hub page", () => {
        mockPathname = "/course/test-course/course-1/discussions";
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Discussions body</div>
            </ProductPage>,
        );

        expect(screen.queryByLabelText("Discussions")).not.toBeInTheDocument();
    });

    it("opens the discussion panel from lesson pages", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Lesson body</div>
            </ProductPage>,
        );

        expect(screen.getByLabelText("Discussions")).toHaveAttribute(
            "href",
            "/course/test-course/course-1/lesson-1?discussion=open",
        );
    });

    it("preserves preview session params when opening the discussion panel", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        mockSearchParams = new URLSearchParams(
            "preview=true&returnTo=%2Fdashboard%2Fproduct%2Fcourse-1",
        );
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: true,
            groups: [],
            discussions: true,
        } as unknown as CourseFrontend;

        render(
            <ProductPage product={course}>
                <div>Lesson body</div>
            </ProductPage>,
        );

        expect(screen.getByLabelText("Discussions")).toHaveAttribute(
            "href",
            "/course/test-course/course-1/lesson-1?preview=true&returnTo=%2Fdashboard%2Fproduct%2Fcourse-1&discussion=open",
        );
    });

    it("preserves the open discussion panel while navigating lesson links", () => {
        mockPathname = "/course/test-course/course-1/lesson-1";
        mockSearchParams = new URLSearchParams("discussion=open");
        const course = {
            title: "Course",
            description: "",
            featuredImage: undefined,
            updatedAt: new Date().toISOString(),
            creatorId: "creator-1",
            slug: "test-course",
            cost: 0,
            courseId: "course-1",
            tags: [],
            paymentPlans: [],
            defaultPaymentPlan: "",
            firstLesson: "lesson-1",
            isPreview: false,
            groups: [
                {
                    id: "group-1",
                    name: "Section",
                    lessons: [
                        {
                            lessonId: "lesson-1",
                            title: "Lesson 1",
                            requiresEnrollment: false,
                        },
                        {
                            lessonId: "lesson-2",
                            title: "Lesson 2",
                            requiresEnrollment: false,
                        },
                    ],
                },
            ],
            discussions: true,
        } as unknown as CourseFrontend;

        const { container } = render(
            <ProductPage product={course}>
                <div>Lesson body</div>
            </ProductPage>,
        );

        expect(
            container.querySelector(
                'a[href="/course/test-course/course-1/lesson-2?discussion=open"]',
            ),
        ).toBeInTheDocument();
    });
});
