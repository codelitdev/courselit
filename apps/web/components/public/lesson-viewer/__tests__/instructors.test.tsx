import React from "react";
import { render, screen } from "@testing-library/react";
import { LessonViewer } from "../index";
import { LESSON_INSTRUCTOR_PREFIX } from "@ui-config/strings";

const mockExec = jest.fn();

jest.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(),
}));
jest.mock("next/link", () => ({
    __esModule: true,
    default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));
jest.mock("@courselit/utils", () => ({
    FetchBuilder: jest.fn().mockImplementation(() => ({
        setUrl: jest.fn().mockReturnThis(),
        setPayload: jest.fn().mockReturnThis(),
        setIsGraphQLEndpoint: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: mockExec,
    })),
}));
jest.mock("@courselit/components-library", () => ({
    Link: ({ children, href }: any) => <a href={href}>{children}</a>,
    Skeleton: () => <div data-testid="skeleton" />,
    useToast: () => ({ toast: jest.fn() }),
}));
jest.mock("@courselit/page-blocks", () => ({ TextRenderer: () => null }));
jest.mock("@courselit/page-primitives", () => ({
    Button: ({ children }: any) => <button>{children}</button>,
    Header1: ({ children }: any) => <h1>{children}</h1>,
    Text1: ({ children }: any) => <p>{children}</p>,
}));
jest.mock("@courselit/icons", () => ({
    ArrowLeft: () => null,
    ArrowRight: () => null,
    ArrowDownward: () => null,
}));
jest.mock("lucide-react", () => ({ BookOpen: () => null, Check: () => null }));
jest.mock("@/app/(with-contexts)/helpers", () => ({
    getUserProfile: jest.fn(),
}));
jest.mock("../embed-viewer", () => () => null);
jest.mock("../quiz-viewer", () => () => null);
jest.mock("../scorm-viewer", () => () => null);
jest.mock("../../base-layout/template/widget-error-boundary", () => ({
    __esModule: true,
    default: ({ children }: any) => <>{children}</>,
}));
jest.mock("@components/contexts", () => {
    const React = require("react");
    return { ThemeContext: React.createContext({ theme: {} }) };
});

const ann = { instructorId: "ann", name: "Ann Ada", links: [] };
const bob = { instructorId: "bob", name: "Bob Hopper", links: [] };

const lesson = {
    lessonId: "lesson-1",
    title: "My lesson",
    type: "TEXT",
    content: null,
    requiresEnrollment: false,
    courseId: "course-1",
};

const renderViewer = () =>
    render(
        <LessonViewer
            slug="course"
            lessonId="lesson-1"
            productId="course-1"
            profile={null}
            setProfile={jest.fn()}
            address={{ backend: "http://localhost", frontend: "" } as any}
        />,
    );

const respondWith = (course: Record<string, unknown>) =>
    mockExec.mockResolvedValue({
        course: { title: "The course", isPreview: false, ...course },
        lesson,
    });

describe("LessonViewer instructors", () => {
    beforeEach(() => jest.clearAllMocks());

    it("credits the section's instructors under the title", async () => {
        respondWith({
            instructors: [ann],
            groups: [{ id: "g1", instructors: [bob] }],
            lessons: [{ lessonId: "lesson-1", groupId: "g1" }],
        });
        renderViewer();

        expect(
            await screen.findByText(`${LESSON_INSTRUCTOR_PREFIX} Bob Hopper`),
        ).toBeInTheDocument();
        expect(screen.queryByText(/Ann Ada/)).toBeNull();
    });

    it("falls back to the course's instructors", async () => {
        respondWith({
            instructors: [ann],
            groups: [{ id: "g1", instructors: [] }],
            lessons: [{ lessonId: "lesson-1", groupId: "g1" }],
        });
        renderViewer();

        expect(
            await screen.findByText(`${LESSON_INSTRUCTOR_PREFIX} Ann Ada`),
        ).toBeInTheDocument();
    });

    it("shows nothing when no instructor is assigned", async () => {
        respondWith({
            instructors: [],
            groups: [{ id: "g1", instructors: [] }],
            lessons: [{ lessonId: "lesson-1", groupId: "g1" }],
        });
        renderViewer();

        await screen.findByRole("heading", { name: "My lesson" });
        expect(
            screen.queryByText(new RegExp(`^${LESSON_INSTRUCTOR_PREFIX} `)),
        ).toBeNull();
    });
});
