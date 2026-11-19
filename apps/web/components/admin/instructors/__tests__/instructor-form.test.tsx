import React from "react";
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import InstructorForm from "../instructor-form";

const mockToast = jest.fn();
const mockExec = jest.fn();
const mockSetPayload = jest.fn();

jest.mock("@courselit/components-library", () => ({
    useToast: () => ({ toast: mockToast }),
    MediaSelector: ({ onSelection, onRemove, mediaId }: any) => (
        <div>
            <span data-testid="avatar-media">{mediaId}</span>
            <button
                type="button"
                onClick={() =>
                    onSelection({
                        mediaId: "new-photo",
                        originalFileName: "me.webp",
                        mimeType: "image/webp",
                        size: 10,
                        access: "public",
                        thumbnail: "t",
                        file: "f",
                    })
                }
            >
                pick-photo
            </button>
            <button type="button" onClick={onRemove}>
                remove-photo
            </button>
        </div>
    ),
}));

jest.mock("@/hooks/use-graphql-fetch", () => ({
    useGraphQLFetch: () => ({
        setPayload: mockSetPayload.mockReturnThis(),
        build: jest.fn().mockReturnThis(),
        exec: mockExec,
    }),
}));

const lastVariables = () => mockSetPayload.mock.calls.at(-1)?.[0].variables;

const submit = async () => {
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
};

describe("InstructorForm", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExec.mockResolvedValue({
            instructor: { instructorId: "new-1", name: "Ada" },
        });
    });

    it("creates an instructor with a trimmed name, bio and links", async () => {
        const onSaved = jest.fn();
        render(<InstructorForm onSaved={onSaved} />);

        fireEvent.change(screen.getByLabelText("Name"), {
            target: { value: "  Ada Lovelace " },
        });
        fireEvent.change(screen.getByLabelText("Bio"), {
            target: { value: "First programmer" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Add link" }));
        fireEvent.change(screen.getByLabelText("Link 1 label"), {
            target: { value: "Website" },
        });
        fireEvent.change(screen.getByLabelText("Link 1 url"), {
            target: { value: "https://ada.example.com" },
        });
        await submit();

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(mockSetPayload.mock.calls.at(-1)?.[0].query).toContain(
            "createInstructor",
        );
        expect(lastVariables()).toEqual({
            data: {
                name: "Ada Lovelace",
                bio: "First programmer",
                links: [{ label: "Website", url: "https://ada.example.com" }],
            },
        });
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Success" }),
        );
    });

    it("requires a name", async () => {
        render(<InstructorForm onSaved={jest.fn()} />);

        await submit();

        expect(await screen.findByText("Name is required")).toBeInTheDocument();
        expect(mockExec).not.toHaveBeenCalled();
    });

    it("rejects links that are not http(s) urls", async () => {
        render(<InstructorForm onSaved={jest.fn()} />);

        fireEvent.change(screen.getByLabelText("Name"), {
            target: { value: "Ada" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Add link" }));
        fireEvent.change(screen.getByLabelText("Link 1 label"), {
            target: { value: "Bad" },
        });
        fireEvent.change(screen.getByLabelText("Link 1 url"), {
            target: { value: "javascript:alert(1)" },
        });
        await submit();

        expect(
            await screen.findByText(
                "Enter a full link starting with http:// or https://",
            ),
        ).toBeInTheDocument();
        expect(mockExec).not.toHaveBeenCalled();
    });

    it("removes a link row", async () => {
        render(<InstructorForm onSaved={jest.fn()} />);

        fireEvent.click(screen.getByRole("button", { name: "Add link" }));
        expect(screen.getByLabelText("Link 1 label")).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Remove link 1" }));

        expect(screen.queryByLabelText("Link 1 label")).toBeNull();
    });

    it("sends the chosen photo", async () => {
        render(<InstructorForm onSaved={jest.fn()} />);

        fireEvent.change(screen.getByLabelText("Name"), {
            target: { value: "Ada" },
        });
        fireEvent.click(screen.getByRole("button", { name: "pick-photo" }));
        await submit();

        await waitFor(() => expect(mockExec).toHaveBeenCalled());
        expect(lastVariables().data.avatar).toEqual(
            expect.objectContaining({ mediaId: "new-photo" }),
        );
    });

    describe("editing", () => {
        const instructor = {
            instructorId: "ins-1",
            name: "Grace",
            bio: "Compilers",
            links: [{ label: "Site", url: "https://grace.example.com" }],
            avatar: {
                mediaId: "old-photo",
                originalFileName: "g.webp",
                mimeType: "image/webp",
                size: 1,
                access: "public",
                thumbnail: "t",
                file: "f",
            },
        };

        it("starts from the saved values and leaves the photo alone when unchanged", async () => {
            render(
                <InstructorForm
                    instructor={instructor as any}
                    onSaved={jest.fn()}
                />,
            );

            expect(screen.getByLabelText("Name")).toHaveValue("Grace");
            expect(screen.getByLabelText("Bio")).toHaveValue("Compilers");
            expect(screen.getByLabelText("Link 1 url")).toHaveValue(
                "https://grace.example.com",
            );
            fireEvent.change(screen.getByLabelText("Name"), {
                target: { value: "Grace Hopper" },
            });
            await submit();

            await waitFor(() => expect(mockExec).toHaveBeenCalled());
            expect(mockSetPayload.mock.calls.at(-1)?.[0].query).toContain(
                "updateInstructor",
            );
            const variables = lastVariables();
            expect(variables.instructorId).toBe("ins-1");
            expect(variables.data).toEqual({
                name: "Grace Hopper",
                bio: "Compilers",
                links: [{ label: "Site", url: "https://grace.example.com" }],
            });
        });

        it("sends null for the photo when it was removed", async () => {
            render(
                <InstructorForm
                    instructor={instructor as any}
                    onSaved={jest.fn()}
                />,
            );

            fireEvent.click(
                screen.getByRole("button", { name: "remove-photo" }),
            );
            await submit();

            await waitFor(() => expect(mockExec).toHaveBeenCalled());
            expect(lastVariables().data.avatar).toBeNull();
        });
    });

    it("shows the server error and does not call onSaved", async () => {
        mockExec.mockRejectedValue(new Error("Invalid input"));
        const onSaved = jest.fn();
        render(<InstructorForm onSaved={onSaved} />);

        fireEvent.change(screen.getByLabelText("Name"), {
            target: { value: "Ada" },
        });
        await submit();

        await waitFor(() =>
            expect(mockToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    variant: "destructive",
                    description: "Invalid input",
                }),
            ),
        );
        expect(onSaved).not.toHaveBeenCalled();
    });
});
