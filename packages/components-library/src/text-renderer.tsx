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
        headings = json && extractHeadings(json);
    } catch (err) {
        console.error("Error extracting headings", err); // eslint-disable-line no-console
    }

    return (
        <div className="text-editor flex flex-col-reverse sm:flex-row gap-4">
            <div className="flex-grow">
                <Renderer json={json as any} fontFamily={"inherit"} />
            </div>
            {showTableOfContent && headings.length > 0 && (
                <nav className="lg:w-1/4">
                    {contentTableHeader && (
                        <h2 className="font-semibold mb-4">
                            {contentTableHeader}
                        </h2>
                    )}
                    <ul className="flex flex-col gap-2 underline">
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
        </div>
    );
}
