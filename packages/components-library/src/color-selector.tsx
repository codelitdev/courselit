import * as React from "react";
import { Cross, Help } from "@courselit/icons";
import IconButton from "./icon-button";
import Tooltip from "./tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const colorSelectorVariants = cva("flex justify-between items-center gap-2", {
    variants: {
        variant: {
            default: "",
            destructive: "",
        },
        size: {
            default: "h-10",
            sm: "h-8",
            lg: "h-12",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
});

interface ColorSelectorProps
    extends VariantProps<typeof colorSelectorVariants> {
    title: string;
    value: string;
    onChange: (value?: string) => void;
    tooltip?: string;
    className?: string;
    allowReset?: boolean;
}

export default function ColorSelector({
    title,
    value,
    onChange,
    tooltip,
    variant,
    size,
    className,
    allowReset = true,
}: ColorSelectorProps) {
    return (
        <div
            className={cn(colorSelectorVariants({ variant, size, className }))}
        >
            <div className="flex grow items-center gap-1">
                <p className="text-sm font-medium leading-none">{title}</p>
                {tooltip && (
                    <Tooltip title={tooltip}>
                        <Help className="h-4 w-4 text-muted-foreground" />
                    </Tooltip>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div className="relative flex items-center gap-1">
                    <div className="relative">
                        <input
                            type="color"
                            value={value}
                            onChange={(e) => {
                                e.preventDefault();
                                onChange(e.target.value);
                            }}
                            className="w-8 h-8 rounded-md cursor-pointer opacity-0 absolute inset-0"
                        />
                        <div
                            className="w-8 h-8 rounded-md border border-input bg-background flex items-center justify-center overflow-hidden ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            style={{ backgroundColor: value }}
                        />
                    </div>
                    {allowReset && (
                        <Tooltip title="Reset">
                            <IconButton
                                onClick={(e) => {
                                    e.preventDefault();
                                    onChange();
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 hover:bg-muted/50"
                            >
                                <Cross className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </IconButton>
                        </Tooltip>
                    )}
                </div>
            </div>
        </div>
    );
}
