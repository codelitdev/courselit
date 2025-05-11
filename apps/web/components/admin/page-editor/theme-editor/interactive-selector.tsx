import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/shadcn-utils";
import { Info } from "lucide-react";
import {
    paddingOptions,
    borderWidthOptions,
    borderStyleOptions,
    borderRadiusOptions,
    shadowOptions,
    opacityOptions,
    cursorOptions,
} from "./tailwind-to-human-readable";

interface InteractiveSelectorProps {
    title: string;
    type: "button" | "link" | "card" | "input";
    value: any;
    onChange: (value: any) => void;
}

const interactiveDisplayNames: Record<string, string> = {
    button: "Button",
    link: "Link",
    card: "Card",
    input: "Input",
} as const;

function InteractiveSelector({ title, type, value, onChange }: InteractiveSelectorProps) {
    const renderDemo = () => {
        switch (type) {
            case "button":
                return (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">Preview</Label>
                        <button
                            className={cn(
                                value?.padding?.x || "",
                                value?.padding?.y || "",
                                value?.border?.width || "",
                                value?.border?.radius || "",
                                value?.border?.style || "",
                                value?.shadow || "",
                                value?.hover || ""
                            )}
                        >
                            Demo Button
                        </button>
                    </div>
                );
            case "link":
                return (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">Preview</Label>
                        <a
                            href="#"
                            className={cn(value?.hover || "")}
                        >
                            Demo Link
                        </a>
                    </div>
                );
            case "card":
                return (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">Preview</Label>
                        <Card
                            className={cn(
                                value?.padding?.x || "",
                                value?.padding?.y || "",
                                value?.border?.radius || "",
                                value?.border?.style || "",
                                value?.shadow || "",
                                value?.hover || ""
                            )}
                        >
                            <CardContent className="p-4">
                                <h4 className="font-medium">Card Title</h4>
                                <p className="text-sm text-muted-foreground">Card content goes here</p>
                            </CardContent>
                        </Card>
                    </div>
                );
            case "input":
                return (
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-xs text-muted-foreground">Preview</Label>
                        <Input
                            type="text"
                            placeholder="Demo Input"
                            className={cn(
                                value?.padding?.x || "",
                                value?.padding?.y || "",
                                value?.borderRadius || "",
                                value?.border?.style || "",
                                value?.shadow || "",
                                value?.hover || ""
                            )}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    const renderConfig = () => {
        const renderPaddingConfig = () => (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Padding X</Label>
                    <Select
                        value={value?.padding?.x || ""}
                        onValueChange={(newValue) => {
                            onChange({
                                ...value,
                                padding: {
                                    ...value?.padding,
                                    x: newValue,
                                },
                            });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select padding" />
                        </SelectTrigger>
                        <SelectContent>
                            {paddingOptions.x.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Padding Y</Label>
                    <Select
                        value={value?.padding?.y || ""}
                        onValueChange={(newValue) => {
                            onChange({
                                ...value,
                                padding: {
                                    ...value?.padding,
                                    y: newValue,
                                },
                            });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select padding" />
                        </SelectTrigger>
                        <SelectContent>
                            {paddingOptions.y.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );

        const renderBorderConfig = () => (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Border Width</Label>
                    <Select
                        value={value?.border?.width || ""}
                        onValueChange={(newValue) => {
                            onChange({
                                ...value,
                                border: {
                                    ...value?.border,
                                    width: newValue,
                                },
                            });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select width" />
                        </SelectTrigger>
                        <SelectContent>
                            {borderWidthOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Border Style</Label>
                    <Select
                        value={value?.border?.style || ""}
                        onValueChange={(newValue) => {
                            onChange({
                                ...value,
                                border: {
                                    ...value?.border,
                                    style: newValue,
                                },
                            });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                            {borderStyleOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        );

        const renderDisabledConfig = () => (
            <div className="space-y-4">
                <Label className="text-sm font-medium">Disabled State</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Opacity</Label>
                        <Select
                            value={value?.disabled?.opacity || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...value,
                                    disabled: {
                                        ...value?.disabled,
                                        opacity: newValue,
                                    },
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select opacity" />
                            </SelectTrigger>
                            <SelectContent>
                                {opacityOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Cursor</Label>
                        <Select
                            value={value?.disabled?.cursor || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...value,
                                    disabled: {
                                        ...value?.disabled,
                                        cursor: newValue,
                                    },
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select cursor" />
                            </SelectTrigger>
                            <SelectContent>
                                {cursorOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        );

        switch (type) {
            case "button":
                return (
                    <div className="space-y-6">
                        {renderPaddingConfig()}
                        {renderBorderConfig()}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Border Radius</Label>
                                <Select
                                    value={value?.border?.radius || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...value,
                                            border: {
                                                ...value?.border,
                                                radius: newValue,
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select radius" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {borderRadiusOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Shadow</Label>
                                <Select
                                    value={value?.shadow || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...value,
                                            shadow: newValue,
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select shadow" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {shadowOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Hover Effect</Label>
                            <Input
                                value={value?.hover || ""}
                                onChange={(e) => {
                                    onChange({
                                        ...value,
                                        hover: e.target.value,
                                    });
                                }}
                                placeholder="Enter Tailwind classes"
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Info className="h-4 w-4" />
                                <span>Use any Tailwind class here</span>
                            </div>
                        </div>
                        {renderDisabledConfig()}
                    </div>
                );
            case "link":
                return (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>Hover Effect</Label>
                            <Input
                                value={value?.hover || ""}
                                onChange={(e) => {
                                    onChange({
                                        ...value,
                                        hover: e.target.value,
                                    });
                                }}
                                placeholder="Enter Tailwind classes"
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Info className="h-4 w-4" />
                                <span>Use any Tailwind class here</span>
                            </div>
                        </div>
                        {renderDisabledConfig()}
                    </div>
                );
            case "card":
                return (
                    <div className="space-y-6">
                        {renderPaddingConfig()}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Border Radius</Label>
                                <Select
                                    value={value?.border?.radius || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...value,
                                            border: {
                                                ...value?.border,
                                                radius: newValue,
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select radius" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {borderRadiusOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Border Style</Label>
                                <Select
                                    value={value?.border?.style || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...value,
                                            border: {
                                                ...value?.border,
                                                style: newValue,
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {borderStyleOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Shadow</Label>
                                <Select
                                    value={value?.shadow || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...value,
                                            shadow: newValue,
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select shadow" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {shadowOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Hover Effect</Label>
                                <Input
                                    value={value?.hover || ""}
                                    onChange={(e) => {
                                        onChange({
                                            ...value,
                                            hover: e.target.value,
                                        });
                                    }}
                                    placeholder="Enter Tailwind classes"
                                />
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Info className="h-4 w-4" />
                                    <span>Use any Tailwind class here</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case "input":
                return (
                    <div className="space-y-6">
                        {renderPaddingConfig()}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Border Radius</Label>
                                <Select
                                    value={value?.borderRadius || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...value,
                                            borderRadius: newValue,
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select radius" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {borderRadiusOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Border Style</Label>
                                <Select
                                    value={value?.border?.style || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...value,
                                            border: {
                                                ...value?.border,
                                                style: newValue,
                                            },
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {borderStyleOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Shadow</Label>
                                <Select
                                    value={value?.shadow || ""}
                                    onValueChange={(newValue) => {
                                        onChange({
                                            ...value,
                                            shadow: newValue,
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select shadow" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {shadowOptions.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Hover Effect</Label>
                                <Input
                                    value={value?.hover || ""}
                                    onChange={(e) => {
                                        onChange({
                                            ...value,
                                            hover: e.target.value,
                                        });
                                    }}
                                    placeholder="Enter Tailwind classes"
                                />
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Info className="h-4 w-4" />
                                    <span>Use any Tailwind class here</span>
                                </div>
                            </div>
                        </div>
                        {renderDisabledConfig()}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 p-2">
            <div className="border rounded-lg p-2 h-[100px] overflow-auto">
                {renderDemo()}
            </div>
            <div className="space-y-6">
                {renderConfig()}
            </div>
        </div>
    );
}

export { InteractiveSelector, interactiveDisplayNames }; 