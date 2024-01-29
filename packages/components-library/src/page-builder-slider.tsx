import { Help } from "@courselit/icons";
import { Slider } from "./components/ui/slider";
import Tooltip from "./tooltip";

export default function PageBuilderSlider({
    title,
    min,
    max,
    value,
    onChange,
    tooltip,
    className,
}: {
    title: string;
    min: number;
    max: number;
    value: number;
    onChange: (value: number) => void;
    tooltip?: string;
    className?: string;
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
                <p className="text-xs bg-gray-100 p-1 rounded border">
                    {value}
                </p>
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
