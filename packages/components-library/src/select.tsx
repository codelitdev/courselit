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
import { cn } from "@/lib/utils";

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
    className?: string;
    [x: string]: any;
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
    className,
    ...props
}: SelectProps) {
    return (
        <div className={cn("space-y-2", className)}>
            {variant !== "without-label" && (
                <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {title}
                </div>
            )}
            <Select value={value as string} onValueChange={onChange} {...props}>
                <SelectTrigger
                    className={cn(
                        "w-full",
                        disabled && "cursor-not-allowed opacity-50",
                    )}
                    disabled={disabled}
                >
                    <SelectValue placeholder={placeholderMessage}>
                        {options.find((x) => x.value === value)?.label}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {(subtitle || variant === "without-label") && (
                            <SelectLabel className="px-2 py-1.5 text-sm font-semibold">
                                {variant === "without-label" && title}
                                {subtitle && (
                                    <div className="text-sm text-muted-foreground">
                                        {subtitle}
                                    </div>
                                )}
                            </SelectLabel>
                        )}

                        {options.map((option: Option) => (
                            <SelectItem
                                value={option.value as string}
                                key={option.value}
                                disabled={option.disabled}
                                className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            >
                                <div className="w-full flex gap-2 items-center justify-between">
                                    <div>{option.label}</div>
                                    {option.sublabel && (
                                        <div className="text-sm text-muted-foreground">
                                            <Tooltip
                                                title={option.sublabel}
                                                side="right"
                                            >
                                                <Info className="h-4 w-4" />
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
