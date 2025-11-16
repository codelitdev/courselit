import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { paddingOptions } from "./tailwind-to-human-readable";
import { ThemeStyle } from "@courselit/page-models";

interface StructureSelectorProps {
    title: string;
    type: "page" | "section";
    theme: ThemeStyle;
    onChange: (theme: ThemeStyle) => void;
}

const pageWidthOptions = [
    { value: "max-w-2xl", label: "Small (2xl)" },
    { value: "max-w-3xl", label: "Medium (3xl)" },
    { value: "max-w-4xl", label: "Large (4xl)" },
    { value: "max-w-5xl", label: "Extra Large (5xl)" },
    { value: "max-w-6xl", label: "2x Extra Large (6xl)" },
] as const;

function StructureSelector({
    title,
    type,
    theme,
    onChange,
}: StructureSelectorProps) {
    const value = theme.structure[type];

    const renderConfig = () => {
        if (type === "page") {
            const pageValue = value as ThemeStyle["structure"]["page"];
            return (
                <div className="space-y-2">
                    <Label>Page Width</Label>
                    <Select
                        value={pageValue?.width || ""}
                        onValueChange={(
                            newValue: (typeof pageWidthOptions)[number]["value"],
                        ) => {
                            onChange({
                                ...theme,
                                structure: {
                                    ...theme.structure,
                                    page: {
                                        width: newValue,
                                    },
                                },
                            });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select width" />
                        </SelectTrigger>
                        <SelectContent>
                            {pageWidthOptions.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }

        if (type === "section") {
            const sectionValue = value as ThemeStyle["structure"]["section"];
            return (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Horizontal Padding</Label>
                        <Select
                            value={sectionValue?.padding?.x || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...theme,
                                    structure: {
                                        ...theme.structure,
                                        section: {
                                            ...sectionValue,
                                            padding: {
                                                ...sectionValue?.padding,
                                                x: newValue as ThemeStyle["structure"]["section"]["padding"]["x"],
                                            },
                                        },
                                    },
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select padding" />
                            </SelectTrigger>
                            <SelectContent>
                                {paddingOptions.x.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Vertical Padding</Label>
                        <Select
                            value={sectionValue?.padding?.y || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...theme,
                                    structure: {
                                        ...theme.structure,
                                        section: {
                                            ...sectionValue,
                                            padding: {
                                                ...sectionValue?.padding,
                                                y: newValue as ThemeStyle["structure"]["section"]["padding"]["y"],
                                            },
                                        },
                                    },
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select padding" />
                            </SelectTrigger>
                            <SelectContent>
                                {paddingOptions.y.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-6 p-2">
            <div className="space-y-6">{renderConfig()}</div>
        </div>
    );
}

export default StructureSelector;
