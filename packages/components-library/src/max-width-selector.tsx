import { Theme } from "@courselit/common-models";
import PageBuilderSlider from "./page-builder-slider";

// Map of numeric values to Tailwind padding classes
const MAX_WIDTH_MAP = {
    1: "max-w-2xl",
    2: "max-w-3xl",
    3: "max-w-4xl",
    4: "max-w-5xl",
    5: "max-w-6xl",
};

export function getMaxWidthTWClass(
    value: number,
): Theme["structure"]["page"]["width"] {
    const roundedValue = Math.max(1, Math.min(5, Math.round(value)));
    return MAX_WIDTH_MAP[roundedValue] || MAX_WIDTH_MAP[5]; // Default to max-w-6xl
}

interface MaxWidthSelectorProps {
    value: Theme["structure"]["page"]["width"];
    onChange: (width: Theme["structure"]["page"]["width"]) => void;
    className?: string;
}

export function MaxWidthSelector({
    value,
    onChange,
    className = "",
}: MaxWidthSelectorProps) {
    // Find the numeric value from the current Tailwind class
    const numericValue =
        Object.entries(MAX_WIDTH_MAP).find(([_, v]) => v === value)?.[0] || "1"; // Default to max-w-2xl

    const handleChange = (newValue: number) => {
        onChange(getMaxWidthTWClass(newValue));
    };

    return (
        <PageBuilderSlider
            title="Maximum width"
            max={5}
            min={1}
            onChange={handleChange}
            value={parseInt(numericValue)}
            tooltip="Maximum width of the content"
            className={className}
        />
    );
}
