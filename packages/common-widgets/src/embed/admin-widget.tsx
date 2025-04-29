import React, { ChangeEvent, useEffect, useState } from "react";
import Settings from "./settings";
import {
    horizontalPadding as defaultHorizontalPadding,
    verticalPadding as defaultVerticalPadding,
    height as defaultHeight,
} from "./defaults";
import {
    CssIdField,
    AdminWidgetPanel,
    ColorSelector,
    ContentPaddingSelector,
    Form,
    FormField,
    Select,
    Textarea,
    AlertTitle,
    AlertDescription,
    Alert,
} from "@courselit/components-library";
import { AlertCircle, Lightbulb } from "lucide-react";

export default function AdminWidget({
    settings,
    onChange,
}: {
    settings: Settings;
    onChange: (...args: any[]) => void;
}) {
    const [backgroundColor, setBackgroundColor] = useState(
        settings.backgroundColor,
    );
    const [url, setUrl] = useState(settings.url);
    const [script, setScript] = useState(settings.script);
    const [aspectRatio, setAspectRatio] = useState(settings.aspectRatio);
    const [height, setHeight] = useState(settings.height || defaultHeight);
    const [horizontalPadding, setHorizontalPadding] = useState<number>(
        settings.horizontalPadding || defaultHorizontalPadding,
    );
    const [verticalPadding, setVerticalPadding] = useState<number>(
        settings.verticalPadding || defaultVerticalPadding,
    );
    const [cssId, setCssId] = useState(settings.cssId);

    useEffect(() => {
        onChange({
            backgroundColor,
            url,
            script,
            aspectRatio,
            height,
            horizontalPadding,
            verticalPadding,
            cssId,
        });
    }, [
        backgroundColor,
        url,
        script,
        aspectRatio,
        height,
        horizontalPadding,
        verticalPadding,
        cssId,
    ]);

    return (
        <div className="flex flex-col gap-4">
            <Alert variant="destructive">
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
            <AdminWidgetPanel title="Content">
                <Form className="flex flex-col gap-4">
                    <FormField
                        label="URL"
                        value={url}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setUrl(e.target.value)
                        }
                    />
                    <div className="flex items-center gap-4 my-1">
                        <hr className="flex-grow border-t border-gray-300" />
                        <span className="text-gray-500 text-sm font-medium">
                            OR
                        </span>
                        <hr className="flex-grow border-t border-gray-300" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="mb-1 font-semibold">Script</label>
                        <Textarea
                            value={script}
                            rows={10}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                                setScript(e.target.value)
                            }
                        />
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Lightbulb className="w-4 h-4" />
                        <p>
                            If you use the script option, the URL option will be
                            ignored.
                        </p>
                    </div>
                </Form>
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Design" className="flex flex-col gap-4">
                <Form className="flex flex-col gap-4">
                    <FormField
                        label="Height"
                        type="number"
                        value={height}
                        min={0}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setHeight(Number(e.target.value))
                        }
                    />
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
                </Form>
                <ColorSelector
                    title="Background color"
                    value={backgroundColor || "inherit"}
                    onChange={(value?: string) => setBackgroundColor(value)}
                />
                <ContentPaddingSelector
                    value={horizontalPadding}
                    min={50}
                    onChange={setHorizontalPadding}
                />
                <ContentPaddingSelector
                    variant="vertical"
                    value={verticalPadding}
                    onChange={setVerticalPadding}
                />
            </AdminWidgetPanel>
            <AdminWidgetPanel title="Advanced">
                <CssIdField value={cssId} onChange={setCssId} />
            </AdminWidgetPanel>
        </div>
    );
}
