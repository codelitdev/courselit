import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingsSelectOption {
    value: string;
    label: string;
}

interface SettingsSelectProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: SettingsSelectOption[];
    defaultValue?: string;
    tooltip?: string;
    className?: string;
}

export function SettingsSelect({
    label,
    value,
    onChange,
    options,
    defaultValue,
    tooltip,
    className = "",
}: SettingsSelectProps) {
    const [localValue, setLocalValue] = useState<string>(value);

    // Update local value when prop value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (newValue: string) => {
        setLocalValue(newValue);
        onChange(newValue);
    };

    const handleReset = () => {
        if (defaultValue) {
            setLocalValue(defaultValue);
            onChange(defaultValue);
        }
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <Label
                        htmlFor={`select-${label.replace(/\s+/g, "-").toLowerCase()}`}
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
                {defaultValue && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Reset to default"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
            <Select value={localValue} onValueChange={handleChange}>
                <SelectTrigger
                    id={`select-${label.replace(/\s+/g, "-").toLowerCase()}`}
                    className="w-full"
                >
                    <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
