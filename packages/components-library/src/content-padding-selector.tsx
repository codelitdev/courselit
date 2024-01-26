import PageBuilderSlider from "./page-builder-slider";

interface ContentPaddingProps {
    value: number;
    onChange: (padding: number) => void;
    className?: string;
    min?: number;
    max?: number;
    variant?: "vertical" | "horizontal";
}

export default function ContentPaddingSelector({
    value,
    onChange,
    className = "",
    variant = "horizontal",
    min,
    max,
}: ContentPaddingProps) {
    const tooltip =
        variant === "horizontal"
            ? "Width of the actual content. It affects only desktop class displays"
            : "Space on the top and bottom of the content. It affects only desktop class displays";

    const defaultMax = variant === "horizontal" ? 100 : 200;
    const defaultMin = variant === "horizontal" ? 10 : 16;

    return (
        <PageBuilderSlider
            title={
                variant === "horizontal" ? "Content width" : "Vertical padding"
            }
            max={max || defaultMax}
            min={min || defaultMin}
            onChange={onChange}
            value={value}
            tooltip={tooltip}
            className={className}
        />
    );

    // return (
    //     <div className={`flex flex-col gap-2 ${className}`}>
    //         <div className="flex grow items-center gap-1">
    //             <h2 className="mb-1 font-medium">{variant === "horizontal" ? "Content width" : "Vertical padding"}</h2>
    //             <Tooltip title={tooltip}>
    //                 <Help />
    //             </Tooltip>
    //         </div>
    //         <Slider
    //             value={[value]}
    //             max={max || defaultMax}
    //             min={min || defaultMin}
    //             step={1}
    //             onValueChange={(value: number[]) => {
    //                 onChange(value[0])
    //             }}
    //             />
    //     </div>
    // )
}
