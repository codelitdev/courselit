import { ChevronRight } from "lucide-react";
import { Select } from "@courselit/components-library";

const FONT_FAMILIES = {
    Roboto: "Roboto",
    "Open Sans": "Open Sans",
    Montserrat: "Montserrat",
    Lato: "Lato",
    Poppins: "Poppins",
    "Source Sans Pro": "Source Sans Pro",
    Raleway: "Raleway",
    "Noto Sans": "Noto Sans",
    Inter: "Inter",
    Merriweather: "Merriweather",
    Alegreya: "Alegreya",
    Aleo: "Aleo",
    Muli: "Muli",
    Arapey: "Arapey",
    Nunito: "Nunito",
    Carme: "Carme",
    Rubik: "Rubik",
    Enriqueta: "Enriqueta",
} as const;

const FONT_SIZES = {
    "Extra Small": "text-xs",
    Small: "text-sm",
    Base: "text-base",
    Large: "text-lg",
    "Extra Large": "text-xl",
    "2XL": "text-2xl",
    "3XL": "text-3xl",
    "4XL": "text-4xl",
    "5XL": "text-5xl",
    "6XL": "text-6xl",
    "7XL": "text-7xl",
    "8XL": "text-8xl",
    "9XL": "text-9xl",
} as const;

const FONT_WEIGHTS = {
    Thin: "font-thin",
    "Extra Light": "font-extralight",
    Light: "font-light",
    Normal: "font-normal",
    Medium: "font-medium",
    "Semi Bold": "font-semibold",
    Bold: "font-bold",
    "Extra Bold": "font-extrabold",
    Black: "font-black",
} as const;

const LINE_HEIGHTS = {
    None: "leading-none",
    Tight: "leading-tight",
    Snug: "leading-snug",
    Normal: "leading-normal",
    Relaxed: "leading-relaxed",
    Loose: "leading-loose",
} as const;

const LETTER_SPACING = {
    Tighter: "tracking-tighter",
    Tight: "tracking-tight",
    Normal: "tracking-normal",
    Wide: "tracking-wide",
    Wider: "tracking-wider",
    Widest: "tracking-widest",
} as const;

const TEXT_TRANSFORM = {
    Uppercase: "uppercase",
    Lowercase: "lowercase",
    Capitalize: "capitalize",
    Normal: "normal-case",
} as const;

const TEXT_DECORATION = {
    Underline: "underline",
    "Line Through": "line-through",
    None: "no-underline",
} as const;

const TEXT_OVERFLOW = {
    Truncate: "truncate",
    Ellipsis: "text-ellipsis",
    Clip: "text-clip",
} as const;

type TypographyValue = {
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textTransform?: string;
    textDecoration?: string;
    textOverflow?: string;
};

export default function TypographySelector({
    title,
    value,
    onChange,
}: {
    title: string;
    value: TypographyValue | string;
    onChange: (value: TypographyValue) => void;
}) {
    const currentValue = typeof value === "string" ? {} : value;

    return (
        <div className="flex flex-col space-y-2 px-2 w-full">
            <div className="grid grid-cols-1 gap-4">
                {/* Font Family */}
                <div className="flex flex-col space-y-1">
                    <label className="text-xs text-muted-foreground">
                        Font Family
                    </label>
                    <Select
                        title="Font Family"
                        value={currentValue.fontFamily || "default"}
                        onChange={(value) =>
                            onChange({
                                ...currentValue,
                                fontFamily: value === "default" ? "" : value,
                            })
                        }
                        options={Object.entries(FONT_FAMILIES).map(
                            ([label, value]) => ({
                                label,
                                value,
                            }),
                        )}
                        placeholderMessage="Select font"
                        variant="without-label"
                    />
                </div>

                {/* Font Size */}
                <div className="flex flex-col space-y-1">
                    <label className="text-xs text-muted-foreground">
                        Font Size
                    </label>
                    <Select
                        title="Font Size"
                        value={currentValue.fontSize || "default"}
                        onChange={(value) =>
                            onChange({
                                ...currentValue,
                                fontSize: value === "default" ? "" : value,
                            })
                        }
                        options={Object.entries(FONT_SIZES).map(
                            ([label, value]) => ({
                                label,
                                value,
                            }),
                        )}
                        placeholderMessage="Select size"
                        variant="without-label"
                    />
                </div>

                {/* Font Weight */}
                <div className="flex flex-col space-y-1">
                    <label className="text-xs text-muted-foreground">
                        Font Weight
                    </label>
                    <Select
                        title="Font Weight"
                        value={currentValue.fontWeight || "default"}
                        onChange={(value) =>
                            onChange({
                                ...currentValue,
                                fontWeight: value === "default" ? "" : value,
                            })
                        }
                        options={Object.entries(FONT_WEIGHTS).map(
                            ([label, value]) => ({
                                label,
                                value,
                            }),
                        )}
                        placeholderMessage="Select weight"
                        variant="without-label"
                    />
                </div>

                {/* Advanced Options */}
                <div className="">
                    <button
                        className="flex items-center justify-between w-full text-sm"
                        onClick={(e) => {
                            e.currentTarget.nextElementSibling?.classList.toggle(
                                "hidden",
                            );
                            e.currentTarget
                                .querySelector("svg")
                                ?.classList.toggle("rotate-90");
                        }}
                    >
                        Advanced
                        <ChevronRight className="h-4 w-4 transition-transform" />
                    </button>

                    <div className="hidden mt-2 space-y-2">
                        {/* Line Height */}
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs text-muted-foreground">
                                Line Height
                            </label>
                            <Select
                                title="Line Height"
                                value={currentValue.lineHeight || "default"}
                                onChange={(value) =>
                                    onChange({
                                        ...currentValue,
                                        lineHeight:
                                            value === "default" ? "" : value,
                                    })
                                }
                                options={Object.entries(LINE_HEIGHTS).map(
                                    ([label, value]) => ({
                                        label,
                                        value,
                                    }),
                                )}
                                placeholderMessage="Select line height"
                                variant="without-label"
                            />
                        </div>

                        {/* Letter Spacing */}
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs text-muted-foreground">
                                Letter Spacing
                            </label>
                            <Select
                                title="Letter Spacing"
                                value={currentValue.letterSpacing || "default"}
                                onChange={(value) =>
                                    onChange({
                                        ...currentValue,
                                        letterSpacing:
                                            value === "default" ? "" : value,
                                    })
                                }
                                options={Object.entries(LETTER_SPACING).map(
                                    ([label, value]) => ({
                                        label,
                                        value,
                                    }),
                                )}
                                placeholderMessage="Select letter spacing"
                                variant="without-label"
                            />
                        </div>

                        {/* Text Transform */}
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs text-muted-foreground">
                                Text Transform
                            </label>
                            <Select
                                title="Text Transform"
                                value={currentValue.textTransform || "default"}
                                onChange={(value) =>
                                    onChange({
                                        ...currentValue,
                                        textTransform:
                                            value === "default" ? "" : value,
                                    })
                                }
                                options={Object.entries(TEXT_TRANSFORM).map(
                                    ([label, value]) => ({
                                        label,
                                        value,
                                    }),
                                )}
                                placeholderMessage="Select text transform"
                                variant="without-label"
                            />
                        </div>

                        {/* Text Decoration */}
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs text-muted-foreground">
                                Text Decoration
                            </label>
                            <Select
                                title="Text Decoration"
                                value={currentValue.textDecoration || "default"}
                                onChange={(value) =>
                                    onChange({
                                        ...currentValue,
                                        textDecoration:
                                            value === "default" ? "" : value,
                                    })
                                }
                                options={Object.entries(TEXT_DECORATION).map(
                                    ([label, value]) => ({
                                        label,
                                        value,
                                    }),
                                )}
                                placeholderMessage="Select text decoration"
                                variant="without-label"
                            />
                        </div>

                        {/* Text Overflow */}
                        <div className="flex flex-col space-y-1">
                            <label className="text-xs text-muted-foreground">
                                Text Overflow
                            </label>
                            <Select
                                title="Text Overflow"
                                value={currentValue.textOverflow || "default"}
                                onChange={(value) =>
                                    onChange({
                                        ...currentValue,
                                        textOverflow:
                                            value === "default" ? "" : value,
                                    })
                                }
                                options={Object.entries(TEXT_OVERFLOW).map(
                                    ([label, value]) => ({
                                        label,
                                        value,
                                    }),
                                )}
                                placeholderMessage="Select text overflow"
                                variant="without-label"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
