import * as React from "react";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Info } from "@courselit/icons";
import Tooltip from "./tooltip";

interface Option {
    label: string;
    value: string | number;
    sublabel?: string;
    disabled?: boolean;
}

interface SelectProps {
    options: Option[];
    onChange: (...args: any[]) => void;
    value: string | number;
    title: string;
    subtitle?: string;
    disabled?: boolean;
    defaultMessage?: string;
    variant?: "with-label" | "without-label";
    placeholderMessage?: string;
}

export default function CustomSelect({
    options,
    onChange,
    value,
    title,
    subtitle,
    disabled,
    variant = "with-label",
    placeholderMessage = "Select a value",
}: SelectProps) {
    return (
        <div>
            {variant !== "without-label" && (
                <div className="mb-1 font-medium">{title}</div>
            )}
            <Select value={value as string} onValueChange={onChange}>
                <SelectTrigger className="w-full" disabled={disabled}>
                    <SelectValue placeholder={placeholderMessage}>
                        {" "}
                        {options.filter((x) => x.value === value)[0]?.label}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="min-w-[180px]">
                    <SelectGroup className="min-w-[180px]">
                        <SelectLabel>
                            {(subtitle || variant === "without-label") && (
                                <div>
                                    {variant === "without-label" && (
                                        <div>{title}</div>
                                    )}
                                    {subtitle && (
                                        <div className="text-sm text-slate-500">
                                            {subtitle}
                                        </div>
                                    )}
                                </div>
                            )}
                        </SelectLabel>

                        {options.map((option: Option) => (
                            <SelectItem
                                value={option.value as string}
                                key={option.value}
                                disabled={option.disabled || false}
                            >
                                <div className="w-full flex gap-2 items-center justify-between">
                                    <div>{option.label}</div>
                                    {option.sublabel && (
                                        <div className="text-sm text-slate-500">
                                            <Tooltip
                                                title={option.sublabel}
                                                side="right"
                                            >
                                                <Info />
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
