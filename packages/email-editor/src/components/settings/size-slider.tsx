import type React from "react";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SizeSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    className?: string;
}

export function SizeSlider({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    unit = "px",
    className = "",
}: SizeSliderProps) {
    const [localValue, setLocalValue] = useState<string>(value.toString());

    const handleSliderChange = (newValue: number[]) => {
        const value = newValue[0];
        setLocalValue(value.toString());
        onChange(value);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setLocalValue(inputValue);

        const numericValue = Number.parseInt(inputValue, 10);
        if (
            !isNaN(numericValue) &&
            numericValue >= min &&
            numericValue <= max
        ) {
            onChange(numericValue);
        }
    };

    const handleInputBlur = () => {
        const numericValue = Number.parseInt(localValue, 10);
        if (isNaN(numericValue) || numericValue < min) {
            setLocalValue(min.toString());
            onChange(min);
        } else if (numericValue > max) {
            setLocalValue(max.toString());
            onChange(max);
        }
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex justify-between items-center">
                <Label
                    htmlFor={`slider-${label.replace(/\s+/g, "-").toLowerCase()}`}
                    className="text-sm font-medium"
                >
                    {label}
                </Label>
                <div className="flex items-center">
                    <Input
                        id={`input-${label.replace(/\s+/g, "-").toLowerCase()}`}
                        type="number"
                        value={localValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        className="w-16 h-8 text-xs"
                        min={min}
                        max={max}
                        step={step}
                    />
                    <span className="ml-1 text-xs text-gray-500">{unit}</span>
                </div>
            </div>
            <Slider
                id={`slider-${label.replace(/\s+/g, "-").toLowerCase()}`}
                value={[Number.parseInt(localValue) || 0]}
                min={min}
                max={max}
                step={step}
                onValueChange={handleSliderChange}
            />
        </div>
    );
}
