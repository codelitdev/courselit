"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SettingsSwitchProps {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    defaultChecked?: boolean;
    tooltip?: string;
    className?: string;
}

export function SettingsSwitch({
    label,
    checked,
    onCheckedChange,
    defaultChecked = false,
    tooltip,
    className = "",
}: SettingsSwitchProps) {
    const [localChecked, setLocalChecked] = useState<boolean>(checked);

    // Update local value when prop value changes
    useEffect(() => {
        setLocalChecked(checked);
    }, [checked]);

    const handleChange = (newChecked: boolean) => {
        setLocalChecked(newChecked);
        onCheckedChange(newChecked);
    };

    return (
        <div className={cn("flex items-center justify-between", className)}>
            <div className="flex items-center gap-1">
                <Label
                    htmlFor={`switch-${label.replace(/\s+/g, "-").toLowerCase()}`}
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
            <Switch
                id={`switch-${label.replace(/\s+/g, "-").toLowerCase()}`}
                checked={localChecked}
                onCheckedChange={handleChange}
            />
        </div>
    );
}
