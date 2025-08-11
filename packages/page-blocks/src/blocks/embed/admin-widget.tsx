import React, { ChangeEvent, useEffect, useState } from "react";
import Settings from "./settings";
import {
    aspectRatio as defaultAspectRatio,
    height as defaultHeight,
} from "./defaults";
import {
    CssIdField,
    AdminWidgetPanel,
    AdminWidgetPanelContainer,
    Form,
    FormField,
    Select,
    Textarea,
    AlertTitle,
    AlertDescription,
    Alert,
    VerticalPaddingSelector,
    MaxWidthSelector,
} from "@courselit/components-library";
import { AlertCircle, Lightbulb } from "lucide-react";
import { Theme, ThemeStyle } from "@courselit/page-models";

// Helper functions for content detection
const hasYouTubeContent = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    return (
        lowerContent.startsWith("https://www.youtube.com") ||
        lowerContent.startsWith("https://www.youtube-nocookie.com") ||
        lowerContent.startsWith("https://youtube.com") ||
        lowerContent.startsWith("https://youtube-nocookie.com") ||
        lowerContent.startsWith("https://youtu.be") ||
        lowerContent.startsWith("https://youtube.com/embed/") ||
        lowerContent.startsWith("https://www.youtube.com/embed/") ||
        lowerContent.startsWith("https://www.youtube-nocookie.com/embed/") ||
        lowerContent.startsWith("https://youtube.com/watch?v=") ||
        lowerContent.startsWith("https://www.youtube.com/watch?v=") ||
        lowerContent.startsWith("https://www.youtube-nocookie.com/watch?v=")
    );
};

const hasVimeoContent = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    return (
        lowerContent.startsWith("https://vimeo.com") ||
        lowerContent.startsWith("https://player.vimeo.com")
    );
};

export default function AdminWidget({
    settings,
    onChange,
    theme,
}: {
    settings: Settings;
    onChange: (...args: any[]) => void;
    theme: Theme;
}) {
    const [contentType, setContentType] = useState(
        settings.contentType || "script",
    );
    const [content, setContent] = useState(settings.content);
    const [aspectRatio, setAspectRatio] = useState(
        settings.aspectRatio || defaultAspectRatio,
    );
    const [height, setHeight] = useState(settings.height || defaultHeight);
    const [maxWidth, setMaxWidth] = useState<
        ThemeStyle["structure"]["page"]["width"]
    >(settings.maxWidth);
    const [verticalPadding, setVerticalPadding] = useState<
        ThemeStyle["structure"]["section"]["padding"]["y"]
    >(settings.verticalPadding);
    const [cssId, setCssId] = useState(settings.cssId);

    useEffect(() => {
        onChange({
            contentType,
            content,
            aspectRatio,
            height,
            maxWidth,
            verticalPadding,
            cssId,
        });
    }, [
        contentType,
        content,
        aspectRatio,
        height,
        maxWidth,
        verticalPadding,
        cssId,
    ]);

    return (
        <AdminWidgetPanelContainer
            type="multiple"
            defaultValue={["content", "design"]}
        >
            <Alert variant="destructive" className="mb-4">
                <AlertTitle>
                    <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Beware
                    </span>
                </AlertTitle>
                <AlertDescription className="text-sm">
                    Embedding external content may have security implications.
                    Only embed content from trusted sources.
                </AlertDescription>
            </Alert>
            <AdminWidgetPanel title="Content" value="content">
                <Form className="flex flex-col gap-4">
                    <Select
                        title="Type"
                        value={contentType}
                        onChange={(value?: string) =>
                            setContentType(value as "url" | "script")
                        }
                        options={[
                            { label: "URL", value: "url" },
                            { label: "Script", value: "script" },
                        ]}
                    />

                    {contentType === "url" && (
                        <FormField
                            label="URL"
                            value={content}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setContent(e.target.value)
                            }
                        />
                    )}

                    {contentType === "script" && (
                        <div className="flex flex-col gap-2">
                            <label className="mb-1 font-semibold">Script</label>
                            <Textarea
                                value={content}
                                rows={10}
                                onChange={(
                                    e: ChangeEvent<HTMLTextAreaElement>,
                                ) => setContent(e.target.value)}
                            />
                            {content
                                ?.trim()
                                .toLowerCase()
                                .startsWith("<iframe") && (
                                <Alert className="text-xs">
                                    <Lightbulb className="w-4 h-4" />
                                    <AlertDescription>
                                        For iframes, please set the height and
                                        width in the code to 100% for the best
                                        experience.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {content?.trim() &&
                                (() => {
                                    const hasYouTube =
                                        hasYouTubeContent(content);
                                    const hasVimeo = hasVimeoContent(content);

                                    if (hasYouTube || hasVimeo) {
                                        return (
                                            <Alert className="text-xs">
                                                <AlertCircle className="w-4 h-4" />
                                                <AlertDescription>
                                                    {hasYouTube && hasVimeo
                                                        ? "For YouTube and Vimeo content, consider using the Media block instead for better integration."
                                                        : hasYouTube
                                                          ? "For YouTube content, consider using the Media block instead for better integration."
                                                          : "For Vimeo content, consider using the Media block instead for better integration."}
                                                </AlertDescription>
                                            </Alert>
                                        );
                                    }
                                    return null;
                                })()}
                        </div>
                    )}
                </Form>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design" value="design">
                <Form
                    className="flex flex-col gap-4"
                    onSubmit={(e) => e.preventDefault()}
                >
                    <Select
                        title="Aspect ratio"
                        value={aspectRatio}
                        onChange={(value?: string) =>
                            setAspectRatio(value as "16:9" | "4:3" | "1:1")
                        }
                        options={[
                            { label: "Default", value: "default" },
                            { label: "16:9", value: "16:9" },
                            { label: "4:3", value: "4:3" },
                            { label: "1:1", value: "1:1" },
                        ]}
                    />
                    {aspectRatio === "default" && (
                        <FormField
                            label="Height"
                            type="number"
                            value={height}
                            min={0}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setHeight(Number(e.target.value))
                            }
                        />
                    )}
                </Form>
                <MaxWidthSelector
                    value={maxWidth || theme.theme.structure.page.width}
                    onChange={setMaxWidth}
                />
                <VerticalPaddingSelector
                    value={
                        verticalPadding ||
                        theme.theme.structure.section.padding.y
                    }
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced" value="advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </AdminWidgetPanelContainer>
    );
}
