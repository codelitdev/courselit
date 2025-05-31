import { ThemeStyle } from "@courselit/page-models";
import PageBuilderSlider from "./page-builder-slider";

// Map of numeric values to Tailwind padding classes
const PADDING_MAP = {
    0: "py-0",
    1: "py-4",
    2: "py-6",
    3: "py-8",
    4: "py-10",
    5: "py-12",
    6: "py-16",
    7: "py-20",
    8: "py-24",
    9: "py-32",
    10: "py-40",
    11: "py-48",
    12: "py-56",
    13: "py-64",
};

export function getVerticalPaddingTWClass(
    value: number,
): ThemeStyle["structure"]["section"]["padding"]["y"] {
    const roundedValue = Math.max(0, Math.min(17, Math.round(value)));
    return PADDING_MAP[roundedValue] || PADDING_MAP[5]; // Default to py-5
}

interface VerticalPaddingSelectorProps {
    value: ThemeStyle["structure"]["section"]["padding"]["y"];
    onChange: (
        padding: ThemeStyle["structure"]["section"]["padding"]["y"],
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
            max={13}
            min={0}
            onChange={handleChange}
            value={parseInt(numericValue)}
            tooltip="Vertical padding of the section"
            className={className}
        />
    );
}
