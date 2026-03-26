import React from "react";
import { render, screen } from "@testing-library/react";
import DragAndDrop from "../../../../packages/components-library/src/drag-and-drop";

describe("DragAndDrop", () => {
    it("disables drag handles when disabled is true", () => {
        render(
            <DragAndDrop
                items={[
                    { id: "item-1", label: "Item 1" },
                    { id: "item-2", label: "Item 2" },
                ]}
                disabled
                onChange={jest.fn()}
                Renderer={({ label }) => <div>{label}</div>}
            />,
        );

        const handles = screen.getAllByTestId("drag-handle");
        expect(handles.length).toBeGreaterThan(0);
        expect(handles.every((handle) => handle.hasAttribute("disabled"))).toBe(
            true,
        );
    });

    it("keeps drag handles enabled by default", () => {
        render(
            <DragAndDrop
                items={[
                    { id: "item-1", label: "Item 1" },
                    { id: "item-2", label: "Item 2" },
                ]}
                onChange={jest.fn()}
                Renderer={({ label }) => <div>{label}</div>}
            />,
        );

        const handles = screen.getAllByTestId("drag-handle");
        expect(handles.length).toBeGreaterThan(0);
        expect(
            handles.every((handle) => !handle.hasAttribute("disabled")),
        ).toBe(true);
    });
});
