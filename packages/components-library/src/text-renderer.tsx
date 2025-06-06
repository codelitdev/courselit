import React from "react";
import { Renderer, extractHeadings } from "@courselit/text-editor";

interface RendererProps {
    json: Record<string, unknown>;
    showTableOfContent?: boolean;
    contentTableHeader?: string;
}

export default function TextRenderer({
    json,
    showTableOfContent = false,
    contentTableHeader = "Table of Contents",
}: RendererProps) {
    let headings;

    try {
        headings = json && extractHeadings(json as any);
    } catch (err) {
        console.error("Error extracting headings", err); // eslint-disable-line no-console
    }

    return (
        <span className="text-editor flex flex-col gap-4">
            {showTableOfContent && headings.length > 0 && (
                <nav className="border p-4 rounded mb-4">
                    {contentTableHeader && (
                        <h2 className="font-medium mb-4">
                            {contentTableHeader}
                        </h2>
                    )}
                    <ul className="flex flex-col text-sm gap-2 underline">
                        {headings.map(
                            ({ text, id }: { text: string; id: string }) => (
                                <li key={id}>
                                    <a href={`#${id}`}>{text}</a>
                                </li>
                            ),
                        )}
                    </ul>
                </nav>
            )}
            <span className="flex-grow">
                <Renderer json={json as any} fontFamily={"inherit"} />
            </span>
        </span>
    );
}
