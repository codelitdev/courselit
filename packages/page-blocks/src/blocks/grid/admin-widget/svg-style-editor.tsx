import React, { useState } from "react";
import {
    Form,
    Button,
    Tooltip,
    FormField,
    ColorSelector,
    Select,
    PageBuilderSlider,
} from "@courselit/components-library";
import { SvgStyle } from "../settings";
import { processedSvg } from "../helpers";

export default function SvgStyleEditor({
    svgStyle,
    onChange,
}: {
    svgStyle: SvgStyle;
    onChange: (svgStyle: SvgStyle) => void;
}) {
    const [internalSvgStyle, setInternalSvgStyle] =
        useState<SvgStyle>(svgStyle);

    return (
        <div className="flex flex-col">
            <Form
                className="flex flex-col gap-4"
                onSubmit={(e) => e.preventDefault()}
            >
                <div className="flex justify-center items-center py-4">
                    <div
                        className="flex justify-center items-center"
                        style={{
                            width: `${internalSvgStyle.width}px`,
                            height: `${internalSvgStyle.height}px`,
                            backgroundColor: internalSvgStyle.backgroundColor,
                            borderRadius: `${internalSvgStyle.borderRadius}px`,
                            borderWidth: `${internalSvgStyle.borderWidth}px`,
                            borderStyle: internalSvgStyle.borderStyle,
                            borderColor: internalSvgStyle.borderColor,
                            padding: "8px",
                        }}
                        dangerouslySetInnerHTML={{
                            __html: processedSvg(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star-icon lucide-star"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>',
                                internalSvgStyle,
                            ),
                        }}
                    />
                </div>
                <div className="flex gap-2">
                    <FormField
                        label="Height"
                        type="number"
                        max={100}
                        min={0}
                        value={internalSvgStyle.height}
                        onChange={(e) =>
                            setInternalSvgStyle({
                                ...internalSvgStyle,
                                height: Math.min(Number(e.target.value), 100),
                            })
                        }
                        className="w-1/2"
                    />
                    <FormField
                        label="Width"
                        type="number"
                        max={100}
                        min={0}
                        value={internalSvgStyle.width}
                        onChange={(e) =>
                            setInternalSvgStyle({
                                ...internalSvgStyle,
                                width: Math.min(Number(e.target.value), 100),
                            })
                        }
                        className="w-1/2"
                    />
                </div>
                <PageBuilderSlider
                    title="Border width"
                    min={0}
                    max={10}
                    value={internalSvgStyle.borderWidth}
                    onChange={(value) =>
                        setInternalSvgStyle({
                            ...internalSvgStyle,
                            borderWidth: value,
                        })
                    }
                />
                <PageBuilderSlider
                    title="Border radius"
                    min={0}
                    max={50}
                    value={internalSvgStyle.borderRadius}
                    onChange={(value) =>
                        setInternalSvgStyle({
                            ...internalSvgStyle,
                            borderRadius: value,
                        })
                    }
                />
                <Select
                    title="Border style"
                    value={internalSvgStyle.borderStyle}
                    options={[
                        { label: "Solid", value: "solid" },
                        { label: "Dashed", value: "dashed" },
                        { label: "Dotted", value: "dotted" },
                        { label: "Double", value: "double" },
                        { label: "None", value: "none" },
                    ]}
                    onChange={(
                        value:
                            | "solid"
                            | "dashed"
                            | "dotted"
                            | "double"
                            | "none",
                    ) =>
                        setInternalSvgStyle({
                            ...internalSvgStyle,
                            borderStyle: value,
                        })
                    }
                />
            </Form>
            <ColorSelector
                title="Icon color"
                value={internalSvgStyle.svgColor}
                onChange={(value?: string) =>
                    setInternalSvgStyle({
                        ...internalSvgStyle,
                        svgColor: value as `#${string}`,
                    })
                }
            />
            <ColorSelector
                title="Background color"
                value={internalSvgStyle.backgroundColor}
                onChange={(value?: string) =>
                    setInternalSvgStyle({
                        ...internalSvgStyle,
                        backgroundColor: value as `#${string}`,
                    })
                }
            />
            <ColorSelector
                title="Border color"
                value={internalSvgStyle.borderColor}
                onChange={(value?: string) =>
                    setInternalSvgStyle({
                        ...internalSvgStyle,
                        borderColor: value as `#${string}`,
                    })
                }
            />
            <div className="flex justify-end">
                <Tooltip title="Go back">
                    <Button
                        component="button"
                        onClick={() => onChange(internalSvgStyle)}
                    >
                        Done
                    </Button>
                </Tooltip>
            </div>
        </div>
    );
}
