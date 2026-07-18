import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommunityReaction } from "@courselit/common-models";
import { ReactionsBar } from "../reactions-bar";

jest.mock("../../ui/button", () => ({
    Button: ({ children, ...props }: any) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("../emoji-picker", () => ({
    EmojiPicker: ({
        onEmojiSelect,
        children,
    }: {
        onEmojiSelect: (emoji: string) => void;
        children?: React.ReactNode;
    }) => (
        <div data-testid="emoji-picker">
            {children}
            <button
                type="button"
                onClick={() => onEmojiSelect("🎉")}
                aria-label="pick-party"
            >
                pick-party
            </button>
        </div>
    ),
}));

const sampleReactions: CommunityReaction[] = [
    {
        emoji: "👍",
        count: 2,
        hasReacted: false,
        reactors: [
            { userId: "u1", name: "Ada", avatar: {} as any },
            { userId: "u2", name: "Bob", avatar: {} as any },
        ],
    },
    {
        emoji: "❤️",
        count: 1,
        hasReacted: true,
        reactors: [{ userId: "me", name: "Me", avatar: {} as any }],
    },
];

describe("ReactionsBar", () => {
    it("renders reaction pills with counts and add-reaction control", () => {
        render(
            <ReactionsBar reactions={sampleReactions} onReact={jest.fn()} />,
        );

        expect(screen.getByText("👍")).toBeTruthy();
        expect(screen.getByText("2")).toBeTruthy();
        expect(screen.getByText("❤️")).toBeTruthy();
        expect(screen.getByLabelText("Add reaction")).toBeTruthy();
    });

    it("calls onReact when an existing pill is clicked", () => {
        const onReact = jest.fn();
        render(<ReactionsBar reactions={sampleReactions} onReact={onReact} />);

        fireEvent.click(screen.getByText("👍").closest("button")!);
        expect(onReact).toHaveBeenCalledWith("👍");
    });

    it("calls onReact when a new emoji is picked", () => {
        const onReact = jest.fn();
        render(<ReactionsBar reactions={sampleReactions} onReact={onReact} />);

        fireEvent.click(screen.getByLabelText("pick-party"));
        expect(onReact).toHaveBeenCalledWith("🎉");
    });

    it("shows reactor names on hover", () => {
        render(
            <ReactionsBar reactions={sampleReactions} onReact={jest.fn()} />,
        );

        fireEvent.mouseEnter(screen.getByText("👍").closest("button")!);
        expect(screen.getByText(/Ada, Bob/)).toBeTruthy();
    });

    it("keeps stable emoji order (picker order, not hasReacted-first)", () => {
        // Heart is hasReacted but should still appear after thumbs in fixed order
        const { container } = render(
            <ReactionsBar reactions={sampleReactions} onReact={jest.fn()} />,
        );
        const pills = Array.from(container.querySelectorAll("button")).filter(
            (btn) =>
                btn.textContent?.includes("👍") ||
                btn.textContent?.includes("❤️"),
        );

        // First reaction pill should be 👍 (index 0 in COMMUNITY_REACTION_EMOJIS)
        // but list only has active ones - order among active is still 👍 then ❤️
        const texts = pills.map((p) => p.textContent || "");
        const thumbsIdx = texts.findIndex((t) => t.includes("👍"));
        const heartIdx = texts.findIndex((t) => t.includes("❤️"));
        expect(thumbsIdx).toBeGreaterThanOrEqual(0);
        expect(heartIdx).toBeGreaterThan(thumbsIdx);
    });

    it("renders reply control when enabled", () => {
        const onReply = jest.fn();
        render(
            <ReactionsBar
                reactions={[]}
                onReact={jest.fn()}
                showReplyButton
                onReply={onReply}
                repliesCount={3}
            />,
        );

        expect(screen.getByText("3")).toBeTruthy();
        fireEvent.click(screen.getByText("3").closest("button")!);
        expect(onReply).toHaveBeenCalled();
    });
});
