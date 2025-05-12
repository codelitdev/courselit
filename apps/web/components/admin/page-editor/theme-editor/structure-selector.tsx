import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Theme } from "@courselit/common-models";
import { paddingOptions } from "./tailwind-to-human-readable";
import { Separator } from "@components/ui/separator";

interface StructureSelectorProps {
    title: string;
    type: "page" | "section";
    theme: Theme;
    onChange: (theme: Theme) => void;
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
            const pageValue = value as Theme["structure"]["page"];
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
            const sectionValue = value as Theme["structure"]["section"];
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
                                                x: newValue as Theme["structure"]["section"]["padding"]["x"],
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
                                                y: newValue as Theme["structure"]["section"]["padding"]["y"],
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

                    <div className="space-y-2">
                        <Label>Outer Vertical Padding</Label>
                        <Select
                            value={sectionValue?.verticalPadding || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...theme,
                                    structure: {
                                        ...theme.structure,
                                        section: {
                                            ...sectionValue,
                                            verticalPadding:
                                                newValue as Theme["structure"]["section"]["verticalPadding"],
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

                    <Separator className="my-6" />

                    <div className="space-y-2">
                        <h2 className="text-xs font-semibold text-muted-foreground">
                            How the layout works
                        </h2>
                        <div className="flex flex-col justify-between text-xs">
                            <div className="bg-[#e3f0fc] text-[#3b4a5a] rounded-t-md px-2 py-1">
                                Outer vertical padding
                            </div>
                            <div className="w-full px-3 pb-3 bg-[#b6daf7]">
                                <div className="text-[#3b4a5a] py-1">
                                    Padding
                                </div>
                                <div className="w-full h-10 bg-white border border-[#b6daf7] rounded flex items-center justify-center text-[#3b4a5a] shadow-sm">
                                    Content
                                </div>
                            </div>
                            <div className="bg-[#e3f0fc] text-[#3b4a5a] rounded-b-md px-2 py-1">
                                Outer vertical padding
                            </div>
                        </div>
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
