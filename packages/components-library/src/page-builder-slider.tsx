import { Help } from "@courselit/icons";
import { Slider } from "./components/ui/slider";
import Tooltip from "./tooltip";
import { X } from "lucide-react";
import IconButton from "./icon-button";

export default function PageBuilderSlider({
    title,
    min,
    max,
    value,
    onChange,
    tooltip,
    className,
    allowsReset = false,
}: {
    title: string;
    min: number;
    max: number;
    value: number;
    onChange: (value?: number) => void;
    tooltip?: string;
    className?: string;
    allowsReset?: boolean;
}) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                    <h2 className="mb-1 font-medium">{title}</h2>
                    {tooltip && (
                        <Tooltip title={tooltip}>
                            <Help />
                        </Tooltip>
                    )}
                </div>
                <div className="flex gap-2">
                    <p className="text-xs bg-gray-100 p-1 rounded border">
                        {value}
                    </p>
                    {allowsReset && (
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
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </IconButton>
                        </Tooltip>
                    )}
                </div>
            </div>
            <Slider
                value={[value]}
                max={max}
                min={min}
                onValueChange={(value: number[]) => {
                    onChange(value[0]);
                }}
            />
        </div>
    );
}
