import React from "react";
import { renderToReactElement } from "@tiptap/static-renderer";
import {
    extractTextFromNode,
    emptyDoc,
    createExtensions,
    createId,
} from "@courselit/text-editor";
import type { ThemeStyle } from "@courselit/page-models";
import {
    Header1,
    Header2,
    Header3,
    Link,
    Text1,
} from "@courselit/page-primitives";

interface TextRendererProps {
    json: Record<string, unknown>;
    className?: string;
    theme?: ThemeStyle;
}

export function TextRenderer({ json, className, theme }: TextRendererProps) {
    const extensions = createExtensions();
    const content = (json as any) ?? (emptyDoc as any);

    const rendered = renderToReactElement({
        extensions,
        content,
        options: {
            nodeMapping: {
                paragraph: ({ children }) => {
                    if (theme) {
                        return (
                            <Text1 theme={theme} component="p">
                                {children}
                            </Text1>
                        );
                    }
                    return <p>{children}</p>;
                },
                heading: ({ node, children }) => {
                    const level = node?.attrs?.level ?? 1;
                    // Extract text from the node structure (same as extractHeadings does)
                    const textContent = extractTextFromNode(node);
                    const id = createId(textContent);

                    if (!theme) {
                        const Tag =
                            `h${level}` as unknown as keyof JSX.IntrinsicElements;
                        return <Tag id={id}>{children}</Tag>;
                    }

                    if (level === 1) {
                        return (
                            <Header1 theme={theme} id={id}>
                                {children}
                            </Header1>
                        );
                    }
                    if (level === 2) {
                        return (
                            <Header2 theme={theme} id={id}>
                                {children}
                            </Header2>
                        );
                    }
                    return (
                        <Header3 theme={theme} id={id}>
                            {children}
                        </Header3>
                    );
                },
                codeMirror: ({ children }) => (
                    <pre>
                        <code>{children}</code>
                    </pre>
                ),
            },
            markMapping: {
                link: ({ mark, children, node }) => {
                    const href = mark?.attrs?.href;
                    return (
                        <Link theme={theme}>
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {children}
                            </a>
                        </Link>
                    );
                },
                highlight: ({ children }) => (
                    <mark className="bg-accent text-accent-foreground">
                        {children}
                    </mark>
                ),
            },
        },
    });

    const combinedClassName = ["tiptap-renderer", className]
        .filter(Boolean)
        .join(" ");

    return (
        <div className="text-editor flex flex-col gap-4">
            <div className={combinedClassName}>{rendered}</div>
        </div>
    );
}

export default TextRenderer;
