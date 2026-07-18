import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { COMMUNITY_REACTION_EMOJIS } from "@courselit/common-models";
import { EmojiPicker } from "../emoji-picker";

jest.mock("../../ui/button", () => ({
    Button: ({ children, ...props }: any) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("../../ui/popover", () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => (
        <div data-testid="emoji-popover">{children}</div>
    ),
}));

describe("EmojiPicker", () => {
    it("renders all allowed community reaction emojis", () => {
        render(<EmojiPicker onEmojiSelect={jest.fn()} />);

        for (const emoji of COMMUNITY_REACTION_EMOJIS) {
            expect(screen.getByRole("button", { name: emoji })).toBeTruthy();
        }
    });

    it("calls onEmojiSelect with the chosen emoji", () => {
        const onEmojiSelect = jest.fn();
        render(<EmojiPicker onEmojiSelect={onEmojiSelect} />);

        fireEvent.click(screen.getByRole("button", { name: "🎉" }));
        expect(onEmojiSelect).toHaveBeenCalledWith("🎉");
        expect(onEmojiSelect).toHaveBeenCalledTimes(1);
    });

    it("renders custom trigger children", () => {
        render(
            <EmojiPicker onEmojiSelect={jest.fn()}>
                <button type="button">Pick</button>
            </EmojiPicker>,
        );
        expect(screen.getByRole("button", { name: "Pick" })).toBeTruthy();
    });
});
