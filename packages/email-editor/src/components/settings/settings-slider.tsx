import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingsSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
    tooltip?: string;
    className?: string;
}

export function SettingsSlider({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    defaultValue,
    tooltip,
    className = "",
}: SettingsSliderProps) {
    const [localValue, setLocalValue] = useState<number>(value);

    // Update local value when prop value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleSliderChange = (newValue: number[]) => {
        const value = newValue[0];
        setLocalValue(value);
        onChange(value);
    };

    const handleReset = () => {
        const resetValue = defaultValue !== undefined ? defaultValue : min;
        setLocalValue(resetValue);
        onChange(resetValue);
    };

    return (
        <div className={cn("space-y-2", className)}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <Label
                        htmlFor={`slider-${label.replace(/\s+/g, "-").toLowerCase()}`}
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
                <div className="flex items-center">
                    <span className="text-sm mr-1">{localValue}</span>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label="Reset to default"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            </div>
            <Slider
                id={`slider-${label.replace(/\s+/g, "-").toLowerCase()}`}
                value={[localValue]}
                min={min}
                max={max}
                step={step}
                onValueChange={handleSliderChange}
                className="h-2"
            />
        </div>
    );
}
