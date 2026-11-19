import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import InstructorPicker from "../instructor-picker";

jest.mock("@/components/ui/select", () => ({
    Select: ({ children, onValueChange }: any) => (
        <select
            aria-label="add-instructor"
            value=""
            onChange={(e) => onValueChange(e.target.value)}
        >
            <option value="">choose</option>
            {children}
        </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => (
        <option value={value}>{children}</option>
    ),
}));

const ann = { instructorId: "ann", name: "Ann Ada" };
const bob = { instructorId: "bob", name: "Bob Hopper" };
const cy = { instructorId: "cy", name: "Cy Turing" };

describe("InstructorPicker", () => {
    it("lists the selected instructors in order", () => {
        render(
            <InstructorPicker
                instructors={[ann, bob, cy]}
                value={["cy", "ann"]}
                onChange={jest.fn()}
            />,
        );

        const names = screen
            .getAllByTestId("selected-instructor")
            .map((node) => node.textContent);
        expect(names[0]).toContain("Cy Turing");
        expect(names[1]).toContain("Ann Ada");
        expect(names).toHaveLength(2);
    });

    it("adds an instructor at the end, offering only the unselected ones", () => {
        const onChange = jest.fn();
        render(
            <InstructorPicker
                instructors={[ann, bob, cy]}
                value={["ann"]}
                onChange={onChange}
            />,
        );

        const options = Array.from(
            screen.getByLabelText("add-instructor").querySelectorAll("option"),
        ).map((option) => option.textContent);
        expect(options).toEqual(["choose", "Bob Hopper", "Cy Turing"]);

        fireEvent.change(screen.getByLabelText("add-instructor"), {
            target: { value: "cy" },
        });
        expect(onChange).toHaveBeenCalledWith(["ann", "cy"]);
    });

    it("removes an instructor", () => {
        const onChange = jest.fn();
        render(
            <InstructorPicker
                instructors={[ann, bob]}
                value={["ann", "bob"]}
                onChange={onChange}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Remove Ann Ada" }));
        expect(onChange).toHaveBeenCalledWith(["bob"]);
    });

    it("reorders with the move buttons and disables them at the edges", () => {
        const onChange = jest.fn();
        render(
            <InstructorPicker
                instructors={[ann, bob]}
                value={["ann", "bob"]}
                onChange={onChange}
            />,
        );

        expect(
            screen.getByRole("button", { name: "Move Ann Ada up" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Move Bob Hopper down" }),
        ).toBeDisabled();

        fireEvent.click(
            screen.getByRole("button", { name: "Move Bob Hopper up" }),
        );
        expect(onChange).toHaveBeenLastCalledWith(["bob", "ann"]);
        fireEvent.click(
            screen.getByRole("button", { name: "Move Ann Ada down" }),
        );
        expect(onChange).toHaveBeenLastCalledWith(["bob", "ann"]);
    });

    it("hides the add control once everyone is assigned", () => {
        render(
            <InstructorPicker
                instructors={[ann]}
                value={["ann"]}
                onChange={jest.fn()}
            />,
        );

        expect(screen.queryByLabelText("add-instructor")).toBeNull();
    });

    it("points to the instructors page when none exist", () => {
        render(
            <InstructorPicker
                instructors={[]}
                value={[]}
                onChange={jest.fn()}
            />,
        );

        expect(
            screen.getByText("You have not created any instructors yet."),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Create instructors" }),
        ).toHaveAttribute("href", "/dashboard/instructors");
    });

    it("ignores ids whose instructor is gone", () => {
        render(
            <InstructorPicker
                instructors={[ann]}
                value={["ghost", "ann"]}
                onChange={jest.fn()}
            />,
        );

        expect(screen.getAllByTestId("selected-instructor")).toHaveLength(1);
    });

    it("disables everything while busy", () => {
        render(
            <InstructorPicker
                instructors={[ann, bob]}
                value={["ann"]}
                onChange={jest.fn()}
                disabled
            />,
        );

        expect(
            screen.getByRole("button", { name: "Remove Ann Ada" }),
        ).toBeDisabled();
    });
});
