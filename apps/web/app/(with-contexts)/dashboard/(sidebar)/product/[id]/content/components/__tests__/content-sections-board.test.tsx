import React from "react";
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import ContentSectionsBoard from "../content-sections-board";

const toastMock = jest.fn();
const reorderExecMock = jest.fn();
const moveLessonExecMock = jest.fn();

let resolveMoveLesson: (() => void) | null = null;
let rejectMoveLesson: ((error: unknown) => void) | null = null;

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({ toast: toastMock }),
}));

jest.mock("../multi-container-drag-and-drop", () => ({
    MultiContainerDragAndDrop: ({
        children,
        onMove,
        onDragStateChange,
    }: any) => (
        <div>
            <button
                data-testid="start-lesson-drag"
                onClick={() =>
                    onDragStateChange?.({
                        itemId: "lesson-1",
                        sourceContainerId: "group-1",
                    })
                }
            >
                start lesson drag
            </button>
            <button
                data-testid="end-lesson-drag"
                onClick={() =>
                    onMove?.({
                        itemId: "lesson-1",
                        sourceContainerId: "group-1",
                        sourceIndex: 0,
                        destinationContainerId: "group-2",
                        destinationIndex: 0,
                    })
                }
            >
                end lesson drag
            </button>
            {children}
        </div>
    ),
}));

jest.mock("@courselit/utils", () => ({
    FetchBuilder: class {
        payload: any;
        setUrl() {
            return this;
        }
        setPayload(payload: any) {
            this.payload = payload;
            return this;
        }
        setIsGraphQLEndpoint() {
            return this;
        }
        build() {
            const query = this.payload?.query ?? "";
            if (query.includes("moveLesson")) {
                return {
                    exec: moveLessonExecMock,
                };
            }

            return {
                exec: reorderExecMock,
            };
        }
    },
}));

jest.mock("../content-section-card", () => {
    return function MockContentSectionCard(props: any) {
        return (
            <div>
                <div data-testid={`lessons-${props.section.id}`}>
                    {(props.lessons ?? [])
                        .map((lesson: any) => lesson.title)
                        .join(",")}
                </div>
                <button
                    data-testid={`move-up-${props.section.id}`}
                    disabled={!props.canMoveUp || props.sectionMoveDisabled}
                    onClick={props.onMoveUp}
                >
                    up
                </button>
                <button
                    data-testid={`move-down-${props.section.id}`}
                    disabled={!props.canMoveDown || props.sectionMoveDisabled}
                    onClick={props.onMoveDown}
                >
                    down
                </button>
            </div>
        );
    };
});

describe("ContentSectionsBoard", () => {
    beforeEach(() => {
        toastMock.mockReset();
        reorderExecMock.mockReset().mockResolvedValue({});
        moveLessonExecMock.mockReset().mockImplementation(
            () =>
                new Promise((resolve, reject) => {
                    resolveMoveLesson = () => resolve({});
                    rejectMoveLesson = reject;
                }),
        );
    });

    const sections = [
        {
            id: "group-1",
            name: "Group 1",
            rank: 1000,
            collapsed: false,
            lessonsOrder: ["lesson-1"],
        },
        {
            id: "group-2",
            name: "Group 2",
            rank: 2000,
            collapsed: false,
            lessonsOrder: [],
        },
    ] as any;

    const lessons = [
        {
            lessonId: "lesson-1",
            title: "Lesson 1",
            type: "text",
            groupId: "group-1",
            published: true,
        },
    ] as any;

    it("disables section move controls while moveLesson is in-flight", async () => {
        const setOrderedSections = jest.fn();

        render(
            <ContentSectionsBoard
                orderedSections={sections}
                setOrderedSections={setOrderedSections}
                lessons={lessons}
                courseId="course-1"
                productId="product-1"
                address="http://localhost:3000"
                onRequestDelete={jest.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId("start-lesson-drag"));
        fireEvent.click(screen.getByTestId("end-lesson-drag"));

        await waitFor(() =>
            expect(screen.getByTestId("move-down-group-1")).toBeDisabled(),
        );

        fireEvent.click(screen.getByTestId("move-down-group-1"));
        expect(reorderExecMock).not.toHaveBeenCalled();

        await act(async () => {
            resolveMoveLesson?.();
        });

        await waitFor(() =>
            expect(screen.getByTestId("move-down-group-1")).not.toBeDisabled(),
        );
    });

    it("moves section down using reorderGroups mutation", async () => {
        const setOrderedSections = jest.fn();

        render(
            <ContentSectionsBoard
                orderedSections={sections}
                setOrderedSections={setOrderedSections}
                lessons={lessons}
                courseId="course-1"
                productId="product-1"
                address="http://localhost:3000"
                onRequestDelete={jest.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId("move-down-group-1"));

        expect(setOrderedSections).toHaveBeenCalledTimes(1);
        expect(reorderExecMock).toHaveBeenCalledTimes(1);
    });

    it("rolls back optimistic lesson move when moveLesson fails", async () => {
        render(
            <ContentSectionsBoard
                orderedSections={sections}
                setOrderedSections={jest.fn()}
                lessons={lessons}
                courseId="course-1"
                productId="product-1"
                address="http://localhost:3000"
                onRequestDelete={jest.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId("start-lesson-drag"));
        fireEvent.click(screen.getByTestId("end-lesson-drag"));

        await act(async () => {
            rejectMoveLesson?.(new Error("Move failed"));
        });

        await waitFor(() =>
            expect(toastMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    variant: "destructive",
                }),
            ),
        );
    });

    it("keeps moved lessons in destination section after section reorder", async () => {
        moveLessonExecMock.mockResolvedValueOnce({});

        const Harness = () => {
            const [localSections, setLocalSections] = React.useState(sections);
            return (
                <ContentSectionsBoard
                    orderedSections={localSections}
                    setOrderedSections={setLocalSections}
                    lessons={lessons}
                    courseId="course-1"
                    productId="product-1"
                    address="http://localhost:3000"
                    onRequestDelete={jest.fn()}
                />
            );
        };

        render(<Harness />);

        fireEvent.click(screen.getByTestId("start-lesson-drag"));
        fireEvent.click(screen.getByTestId("end-lesson-drag"));

        await waitFor(() =>
            expect(screen.getByTestId("lessons-group-2")).toHaveTextContent(
                "Lesson 1",
            ),
        );

        fireEvent.click(screen.getByTestId("move-up-group-2"));

        await waitFor(() =>
            expect(screen.getByTestId("lessons-group-2")).toHaveTextContent(
                "Lesson 1",
            ),
        );
    });
});
