import type React from "react";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingsTextareaProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    defaultValue?: string;
    tooltip?: string;
    className?: string;
    rows?: number;
    style?: React.CSSProperties;
}

export function SettingsTextarea({
    label,
    value,
    onChange,
    placeholder = "",
    defaultValue = "",
    tooltip,
    className = "",
    rows = 3,
    style,
}: SettingsTextareaProps) {
    const [localValue, setLocalValue] = useState<string>(value);

    // Update local value when prop value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
    };

    const handleReset = () => {
        setLocalValue(defaultValue);
        onChange(defaultValue);
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <Label
                        htmlFor={`textarea-${label.replace(/\s+/g, "-").toLowerCase()}`}
                        className="text-sm font-medium"
                    >
                        {label}
                    </Label>
                    {tooltip && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="rounded-full bg-gray-200 w-4 h-4 flex items-center justify-center text-xs text-gray-600 cursor-help">
                                        ?
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="text-xs">{tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <button
                    type="button"
                    onClick={handleReset}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Reset to default"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
            <Textarea
                id={`textarea-${label.replace(/\s+/g, "-").toLowerCase()}`}
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                className="w-full"
                rows={rows}
                style={style}
            />
        </div>
    );
}
