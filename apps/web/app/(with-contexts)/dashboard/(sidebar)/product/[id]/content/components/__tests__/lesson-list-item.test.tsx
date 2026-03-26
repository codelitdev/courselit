import React from "react";
import { render, screen } from "@testing-library/react";
import LessonListItem from "../lesson-list-item";
import type { useMultiContainerSortableItem } from "../multi-container-drag-and-drop";

jest.mock("next/navigation", () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}));

describe("LessonListItem", () => {
    it("disables lesson drag handle when disabled is true", () => {
        render(
            <LessonListItem
                lesson={
                    {
                        lessonId: "lesson-1",
                        title: "Lesson 1",
                        type: "text",
                        groupId: "group-1",
                        published: true,
                    } as any
                }
                sectionId="group-1"
                productId="product-1"
                disabled
                isDragging={false}
                attributes={
                    {} as ReturnType<
                        typeof useMultiContainerSortableItem
                    >["attributes"]
                }
                listeners={
                    {} as ReturnType<
                        typeof useMultiContainerSortableItem
                    >["listeners"]
                }
                setNodeRef={
                    jest.fn() as ReturnType<
                        typeof useMultiContainerSortableItem
                    >["setNodeRef"]
                }
                style={{}}
            />,
        );

        expect(screen.getByTestId("lesson-drag-handle")).toBeDisabled();
    });

    it("keeps lesson drag handle enabled when disabled is false", () => {
        render(
            <LessonListItem
                lesson={
                    {
                        lessonId: "lesson-1",
                        title: "Lesson 1",
                        type: "text",
                        groupId: "group-1",
                        published: true,
                    } as any
                }
                sectionId="group-1"
                productId="product-1"
                disabled={false}
                isDragging={false}
                attributes={
                    {} as ReturnType<
                        typeof useMultiContainerSortableItem
                    >["attributes"]
                }
                listeners={
                    {} as ReturnType<
                        typeof useMultiContainerSortableItem
                    >["listeners"]
                }
                setNodeRef={
                    jest.fn() as ReturnType<
                        typeof useMultiContainerSortableItem
                    >["setNodeRef"]
                }
                style={{}}
            />,
        );

        expect(screen.getByTestId("lesson-drag-handle")).not.toBeDisabled();
    });
});
