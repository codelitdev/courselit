import { useEffect, useRef, useState, startTransition } from "react";
import {
    defaultEmail,
    Email,
    renderEmailToHtml,
} from "@courselit/email-editor";
import { cn } from "@/lib/shadcn-utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplateEmailPreview({
    content,
    className,
    minHeight = "420px",
}: {
    content: Email | null;
    className?: string;
    minHeight?: string;
}) {
    const [renderedHTML, setRenderedHTML] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(!!content);
    const [error, setError] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [wrapperWidth, setWrapperWidth] = useState(0);

    useEffect(() => {
        if (content) {
            const normalizedEmail = normalizeEmailForPreview(content);

            startTransition(() => {
                setRenderedHTML(null);
                setIsLoading(true);
                setError(null);
            });

            renderEmailToHtml({
                email: normalizedEmail,
            })
                .then((html) => {
                    startTransition(() => {
                        setRenderedHTML(html);
                        setIsLoading(false);
                    });
                })
                .catch((err) => {
                    startTransition(() => {
                        setError(err.message || "Failed to render email");
                        setIsLoading(false);
                    });
                });
        } else {
            startTransition(() => {
                setRenderedHTML(null);
                setIsLoading(false);
                setError(null);
            });
        }
    }, [content]);

    useEffect(() => {
        if (!wrapperRef.current) {
            return;
        }

        setWrapperWidth(wrapperRef.current.clientWidth);

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setWrapperWidth(entry.contentRect.width);
            }
        });

        observer.observe(wrapperRef.current);

        return () => observer.disconnect();
    }, [renderedHTML]);

    if (!content) {
        return null;
    }

    if (isLoading) {
        return (
            <Skeleton
                className={cn("w-full rounded-lg", className)}
                style={{ minHeight }}
            />
        );
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    if (!renderedHTML) {
        return (
            <Skeleton
                className={cn("w-full rounded-lg", className)}
                style={{ minHeight }}
            />
        );
    }

    const normalizedEmail = normalizeEmailForPreview(content);
    const previewHeight = toPixels(minHeight);
    const previewWidth = getPreviewWidth(normalizedEmail);
    const scale =
        wrapperWidth > 0 ? Math.min(wrapperWidth / previewWidth, 1) : 1;
    const previewViewportHeight =
        scale > 0 ? previewHeight / scale : previewHeight;

    return (
        <div className={cn("relative", className)}>
            <div
                ref={wrapperRef}
                className="relative w-full overflow-hidden rounded-lg border bg-background"
                style={{ height: `${previewHeight}px` }}
            >
                <iframe
                    srcDoc={renderedHTML}
                    className="pointer-events-none absolute left-1/2 top-0 border-0"
                    style={{
                        width: `${previewWidth}px`,
                        height: `${previewViewportHeight}px`,
                        transform: `translateX(-50%) scale(${scale})`,
                        transformOrigin: "top center",
                    }}
                    scrolling="no"
                    title="Email Preview"
                />
            </div>
        </div>
    );
}

function getPreviewWidth(email: Email): number {
    const width =
        email.style?.structure?.page?.width ||
        defaultEmail.style.structure.page.width;
    const parsedWidth = Number.parseInt(width || "600px", 10);

    return Number.isFinite(parsedWidth) ? parsedWidth : 600;
}

function toPixels(value: string): number {
    const parsed = Number.parseInt(value, 10);

    return Number.isFinite(parsed) ? parsed : 420;
}

function normalizeEmailForPreview(
    content: Email,
    { responsivePageWidth = false }: { responsivePageWidth?: boolean } = {},
): Email {
    const legacyStyle = (content as any)?.style || {};
    const defaultStyle = defaultEmail.style;

    return {
        ...defaultEmail,
        ...content,
        meta: {
            ...defaultEmail.meta,
            ...(content.meta || {}),
        },
        style: {
            ...defaultStyle,
            ...(content.style || {}),
            colors: {
                ...defaultStyle.colors,
                ...(content.style?.colors || {}),
                background:
                    content.style?.colors?.background ||
                    legacyStyle.backgroundColor ||
                    defaultStyle.colors.background,
            },
            typography: {
                ...defaultStyle.typography,
                ...(content.style?.typography || {}),
                header: {
                    ...defaultStyle.typography.header,
                    ...(content.style?.typography?.header || {}),
                },
                text: {
                    ...defaultStyle.typography.text,
                    ...(content.style?.typography?.text || {}),
                },
                link: {
                    ...defaultStyle.typography.link,
                    ...(content.style?.typography?.link || {}),
                },
            },
            interactives: {
                ...defaultStyle.interactives,
                ...(content.style?.interactives || {}),
                button: {
                    ...defaultStyle.interactives.button,
                    ...(content.style?.interactives?.button || {}),
                    padding: {
                        ...defaultStyle.interactives.button.padding,
                        ...(content.style?.interactives?.button?.padding || {}),
                    },
                    border: {
                        ...defaultStyle.interactives.button.border,
                        ...(content.style?.interactives?.button?.border || {}),
                    },
                },
                link: {
                    ...defaultStyle.interactives.link,
                    ...(content.style?.interactives?.link || {}),
                    padding: {
                        ...defaultStyle.interactives.link.padding,
                        ...(content.style?.interactives?.link?.padding || {}),
                    },
                },
            },
            structure: {
                ...defaultStyle.structure,
                ...(content.style?.structure || {}),
                page: {
                    ...defaultStyle.structure.page,
                    ...(content.style?.structure?.page || {}),
                    background:
                        content.style?.structure?.page?.background ||
                        legacyStyle.backgroundColor ||
                        defaultStyle.structure.page.background,
                    width: responsivePageWidth
                        ? "100%"
                        : content.style?.structure?.page?.width ||
                          (typeof legacyStyle.width === "number"
                              ? `${legacyStyle.width}px`
                              : legacyStyle.width) ||
                          defaultStyle.structure.page.width,
                    marginY: responsivePageWidth
                        ? "0px"
                        : content.style?.structure?.page?.marginY ||
                          defaultStyle.structure.page.marginY,
                },
                section: {
                    ...defaultStyle.structure.section,
                    ...(content.style?.structure?.section || {}),
                    padding: {
                        ...defaultStyle.structure.section.padding,
                        ...(content.style?.structure?.section?.padding || {}),
                    },
                },
            },
        },
        content: content.content || defaultEmail.content,
    };
}
