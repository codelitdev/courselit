import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/shadcn-utils";
import {
    fontSizeOptions,
    fontWeightOptions,
    lineHeightOptions,
    letterSpacingOptions,
    textAlignOptions,
    textTransformOptions,
    fontFamilyOptions,
} from "./tailwind-to-human-readable";

interface TypographySelectorProps {
    title: string;
    value: any;
    onChange: (value: any) => void;
}

function TypographySelector({ title, value, onChange }: TypographySelectorProps) {
    const renderDemo = () => {
        return (
            <div className="space-y-2 flex flex-col">
                <Label className="text-xs text-muted-foreground">Preview</Label>
                <p
                    className={cn(
                        value?.fontFamily || "",
                        value?.fontSize || "",
                        value?.fontWeight || "",
                        value?.lineHeight || "",
                        value?.letterSpacing || "",
                        value?.textAlign || "",
                        value?.textTransform || "normal-case"
                    )}
                >
                    The quick brown fox jumps over the lazy dog
                </p>
            </div>
        );
    };

    const renderConfig = () => {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                        value={value?.fontFamily || ""}
                        onValueChange={(newValue) => {
                            onChange({
                                ...value,
                                fontFamily: newValue,
                            });
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select font family" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(fontFamilyOptions).map(([category, fonts], index) => (
                                <React.Fragment key={category}>
                                    {index > 0 && <div className="h-5" />}
                                    <SelectItem
                                        value={`category-${category.toLowerCase()}`}
                                        disabled
                                        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2"
                                    >
                                        {category}
                                    </SelectItem>
                                    {fonts.map((font) => (
                                        <SelectItem
                                            key={font.value}
                                            value={font.value}
                                            className={cn(
                                                "pl-8 text-sm min-h-[2rem] flex items-center",
                                                font.value
                                            )}
                                            style={{
                                                paddingLeft: '2rem',
                                            }}
                                        >
                                            {font.label}
                                        </SelectItem>
                                    ))}
                                </React.Fragment>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Font Size</Label>
                        <Select
                            value={value?.fontSize || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...value,
                                    fontSize: newValue,
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                                {fontSizeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Font Weight</Label>
                        <Select
                            value={value?.fontWeight || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...value,
                                    fontWeight: newValue,
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select weight" />
                            </SelectTrigger>
                            <SelectContent>
                                {fontWeightOptions.map((option) => (
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
                        <Label>Line Height</Label>
                        <Select
                            value={value?.lineHeight || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...value,
                                    lineHeight: newValue,
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select line height" />
                            </SelectTrigger>
                            <SelectContent>
                                {lineHeightOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Letter Spacing</Label>
                        <Select
                            value={value?.letterSpacing || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...value,
                                    letterSpacing: newValue,
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select spacing" />
                            </SelectTrigger>
                            <SelectContent>
                                {letterSpacingOptions.map((option) => (
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
                        <Label>Text Align</Label>
                        <Select
                            value={value?.textAlign || ""}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...value,
                                    textAlign: newValue,
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select alignment" />
                            </SelectTrigger>
                            <SelectContent>
                                {textAlignOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Text Transform</Label>
                        <Select
                            value={value?.textTransform || "normal-case"}
                            onValueChange={(newValue) => {
                                onChange({
                                    ...value,
                                    textTransform: newValue,
                                });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select transform" />
                            </SelectTrigger>
                            <SelectContent>
                                {textTransformOptions.map((option) => (
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

export default TypographySelector;
