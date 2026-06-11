import { render, screen } from "@testing-library/react";

import { TextRenderer } from "../../../../../packages/page-blocks/src/components/text-renderer";

jest.mock("@courselit/text-editor", () => ({
    createExtensions: jest.fn(() => []),
    createId: jest.fn((text: string) =>
        text.toLowerCase().replace(/\s+/g, "-"),
    ),
    emptyDoc: { type: "doc", content: [] },
    extractTextFromNode: jest.fn((node) =>
        node?.content?.map((child) => child.text ?? "").join(""),
    ),
}));

jest.mock("@tiptap/static-renderer", () => ({
    renderToReactElement: jest.fn(({ content }) => {
        const hasEmptyTextNode = (node: any): boolean => {
            if (node?.type === "text" && node.text === "") {
                return true;
            }

            return Array.isArray(node?.content)
                ? node.content.some(hasEmptyTextNode)
                : false;
        };

        if (hasEmptyTextNode(content)) {
            throw new RangeError("Empty text nodes are not allowed");
        }

        return <p>{content.content[0].content[0].text}</p>;
    }),
}));

describe("TextRenderer", () => {
    it("renders content with empty text nodes", () => {
        expect(() =>
            render(
                <TextRenderer
                    json={
                        {
                            type: "doc",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {
                                            type: "text",
                                            text: "Post body",
                                        },
                                    ],
                                },
                                {
                                    type: "paragraph",
                                    content: [
                                        {
                                            type: "text",
                                            text: "",
                                        },
                                    ],
                                },
                            ],
                        } as any
                    }
                />,
            ),
        ).not.toThrow();

        expect(screen.getByText("Post body")).toBeInTheDocument();
    });
});
