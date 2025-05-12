import { Theme } from "@courselit/common-models";
import PageBuilderSlider from "./page-builder-slider";

// Map of numeric values to Tailwind padding classes
const PADDING_MAP = {
    0: "py-0",
    1: "py-1",
    2: "py-2",
    3: "py-3",
    4: "py-4",
    5: "py-5",
    6: "py-6",
    7: "py-8",
    8: "py-10",
    9: "py-12",
    10: "py-16",
    11: "py-20",
    12: "py-24",
    13: "py-32",
    14: "py-40",
    15: "py-48",
    16: "py-56",
    17: "py-64",
};

export function getVerticalPaddingTWClass(
    value: number,
): Theme["structure"]["section"]["verticalPadding"] {
    const roundedValue = Math.max(0, Math.min(17, Math.round(value)));
    return PADDING_MAP[roundedValue] || PADDING_MAP[5]; // Default to py-5
}

interface VerticalPaddingSelectorProps {
    value: Theme["structure"]["section"]["verticalPadding"];
    onChange: (
        padding: Theme["structure"]["section"]["verticalPadding"],
    ) => void;
    className?: string;
}

export function VerticalPaddingSelector({
    value,
    onChange,
    className = "",
}: VerticalPaddingSelectorProps) {
    // Find the numeric value from the current Tailwind class
    const numericValue =
        Object.entries(PADDING_MAP).find(([_, v]) => v === value)?.[0] || "0"; // Default to py-0

    const handleChange = (newValue: number) => {
        onChange(getVerticalPaddingTWClass(newValue));
    };

    return (
        <PageBuilderSlider
            title="Vertical padding"
            max={17}
            min={0}
            onChange={handleChange}
            value={parseInt(numericValue)}
            tooltip="Vertical padding of the section"
            className={className}
        />
    );
}
