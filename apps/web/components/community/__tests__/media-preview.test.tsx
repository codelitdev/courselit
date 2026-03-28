import React from "react";
import { render, screen } from "@testing-library/react";
import { MediaPreview } from "../media-preview";

jest.mock("../../ui/button", () => ({
    Button: ({ children, ...props }: any) => (
        <button {...props}>{children}</button>
    ),
}));

jest.mock("../../ui/scroll-area", () => ({
    ScrollArea: ({ children }: any) => <div>{children}</div>,
    ScrollBar: () => null,
}));

describe("MediaPreview", () => {
    it("renders image using media thumbnail when url is missing", () => {
        render(
            <MediaPreview
                items={[
                    {
                        type: "image",
                        title: "CourseLit Notification System.png",
                        media: {
                            mediaId: "m1",
                            thumbnail: "https://cdn.example.com/thumb.png",
                            file: "https://cdn.example.com/file.png",
                        },
                    } as any,
                ]}
                onRemove={jest.fn()}
            />,
        );

        const image = screen.getByAltText(
            "CourseLit Notification System.png",
        ) as HTMLImageElement;
        expect(image).toBeInTheDocument();
        expect(image.src).toContain("https://cdn.example.com/thumb.png");
    });

    it("renders image using url when available", () => {
        render(
            <MediaPreview
                items={[
                    {
                        type: "image",
                        title: "Local",
                        url: "blob:http://localhost/abc",
                    } as any,
                ]}
                onRemove={jest.fn()}
            />,
        );

        const image = screen.getByAltText("Local") as HTMLImageElement;
        expect(image).toBeInTheDocument();
        expect(image.getAttribute("src")).toBe("blob:http://localhost/abc");
    });
});
