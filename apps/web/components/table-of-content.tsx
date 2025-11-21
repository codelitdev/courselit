import React from "react";
import { extractHeadings } from "@courselit/text-editor";
import { Header2, Link } from "@courselit/page-primitives";
import type { ThemeStyle } from "@courselit/page-models";

interface TableOfContentProps {
    json: Record<string, unknown>;
    contentTableHeader?: string;
    theme?: ThemeStyle;
}

export function TableOfContent({
    json,
    contentTableHeader = "Table of Contents",
    theme,
}: TableOfContentProps) {
    let headings: { text: string; id: string }[] = [];

    try {
        headings = json ? extractHeadings(json as any) : [];
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error extracting headings", err);
    }

    if (headings.length === 0) {
        return null;
    }

    return (
        <nav className="border p-4 rounded mb-4">
            {contentTableHeader && (
                <Header2 theme={theme} className="mb-4">
                    {contentTableHeader}
                </Header2>
            )}
            <ul className="flex flex-col gap-2">
                {headings.map(({ text, id }) => (
                    <Link theme={theme} key={id}>
                        <a href={`#${id}`}>{text}</a>
                    </Link>
                ))}
            </ul>
        </nav>
    );
}
