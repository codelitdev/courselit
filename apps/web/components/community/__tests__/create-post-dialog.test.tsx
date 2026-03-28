import React from "react";
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from "@testing-library/react";
import CreatePostDialog from "../create-post-dialog";
import { ProfileContext } from "@components/contexts";

jest.mock("../../ui/button", () => ({
    Button: ({ children, ...props }: any) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("../../ui/input", () => ({
    Input: (props: any) => <input {...props} />,
}));

jest.mock("../../ui/textarea", () => ({
    Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock("../../ui/progress", () => ({
    Progress: ({ value }: { value: number }) => (
        <div data-testid="progress">{value}</div>
    ),
}));

jest.mock("../../ui/avatar", () => ({
    Avatar: ({ children }: any) => <div>{children}</div>,
    AvatarFallback: ({ children }: any) => <div>{children}</div>,
    AvatarImage: (props: any) => <img {...props} alt={props.alt || "avatar"} />,
}));

jest.mock("../../ui/dialog", () => ({
    Dialog: ({ children }: any) => <div>{children}</div>,
    DialogContent: ({ children }: any) => <div>{children}</div>,
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <div>{children}</div>,
    DialogTrigger: ({ children }: any) => <>{children}</>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    DialogClose: ({ children }: any) => <>{children}</>,
}));

jest.mock("../../ui/popover", () => ({
    Popover: ({ children }: any) => <div>{children}</div>,
    PopoverTrigger: ({ children }: any) => <>{children}</>,
    PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../../ui/select", () => ({
    Select: ({ value, onValueChange, children }: any) => (
        <select
            aria-label="category"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            <option value="">Select a category</option>
            {children}
        </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ value, children }: any) => (
        <option value={value}>{children}</option>
    ),
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: () => null,
}));

jest.mock("../emoji-picker", () => ({
    EmojiPicker: () => <div>EmojiPicker</div>,
}));

jest.mock("../gif-selector", () => ({
    GifSelector: () => <div>GifSelector</div>,
}));

jest.mock("../media-preview", () => ({
    MediaPreview: () => <div>MediaPreview</div>,
}));

const renderDialog = (
    createPost: any,
    overrides: Partial<React.ComponentProps<typeof CreatePostDialog>> = {},
) =>
    render(
        <ProfileContext.Provider
            value={{
                profile: {
                    name: "Test User",
                    email: "test@example.com",
                    avatar: undefined,
                },
                setProfile: jest.fn(),
            }}
        >
            <CreatePostDialog
                isOpen={true}
                onOpenChange={jest.fn()}
                createPost={createPost}
                categories={["General", "Announcements"]}
                isFileUploading={false}
                fileUploadProgress={0}
                fileBeingUploadedNumber={0}
                {...overrides}
            />
        </ProfileContext.Provider>,
    );

const flushMicrotasks = async () => {
    await act(async () => {
        await Promise.resolve();
    });
};

describe("CreatePostDialog", () => {
    it("keeps submit disabled until title, content and category are present", async () => {
        const createPost = jest.fn().mockResolvedValue(undefined);

        renderDialog(createPost);
        await flushMicrotasks();

        const postButton = screen.getByRole("button", { name: "Post" });
        expect(postButton).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText("Title"), {
            target: { value: "My title" },
        });
        fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
            target: { value: "My content" },
        });
        expect(postButton).toBeDisabled();

        fireEvent.change(screen.getByLabelText("category"), {
            target: { value: "General" },
        });

        await waitFor(() => {
            expect(postButton).toBeEnabled();
        });
    });

    it("shows posting state while submit is pending and restores after completion", async () => {
        let resolveSubmit: (() => void) | undefined;
        const createPost = jest.fn().mockImplementation(
            () =>
                new Promise<void>((resolve) => {
                    resolveSubmit = resolve;
                }),
        );

        renderDialog(createPost, { category: "General" });
        await flushMicrotasks();

        fireEvent.change(screen.getByPlaceholderText("Title"), {
            target: { value: "My title" },
        });
        fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
            target: { value: "My content" },
        });
        fireEvent.change(screen.getByLabelText("category"), {
            target: { value: "General" },
        });

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Post" })).toBeEnabled();
        });

        fireEvent.click(screen.getByRole("button", { name: "Post" }));

        await waitFor(() => {
            expect(createPost).toHaveBeenCalledTimes(1);
        });
        expect(
            screen.getByRole("button", { name: "Posting..." }),
        ).toBeDisabled();

        await act(async () => {
            resolveSubmit?.();
        });

        await waitFor(() => {
            expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
        });
    });
});
