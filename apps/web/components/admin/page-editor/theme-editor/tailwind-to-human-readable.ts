export interface TailwindOption {
    label: string;
    value: string;
}

export const paddingOptions = {
    x: [
        { label: "None", value: "px-0" },
        { label: "Extra Small", value: "px-4" },
        { label: "Small", value: "px-6" },
        { label: "Medium", value: "px-8" },
        { label: "Large", value: "px-10" },
        { label: "Extra Large", value: "px-12" },
        { label: "2X Large", value: "px-16" },
        { label: "3X Large", value: "px-20" },
        { label: "4X Large", value: "px-24" },
        { label: "5X Large", value: "px-32" },
        { label: "6X Large", value: "px-40" },
        { label: "7X Large", value: "px-48" },
        { label: "8X Large", value: "px-56" },
        { label: "9X Large", value: "px-64" },
    ],
    y: [
        { label: "None", value: "py-0" },
        { label: "Extra Small", value: "py-4" },
        { label: "Small", value: "py-6" },
        { label: "Medium", value: "py-8" },
        { label: "Large", value: "py-10" },
        { label: "Extra Large", value: "py-12" },
        { label: "2X Large", value: "py-16" },
        { label: "3X Large", value: "py-20" },
        { label: "4X Large", value: "py-24" },
        { label: "5X Large", value: "py-32" },
        { label: "6X Large", value: "py-40" },
        { label: "7X Large", value: "py-48" },
        { label: "8X Large", value: "py-56" },
        { label: "9X Large", value: "py-64" },
    ],
} as const;

export const borderWidthOptions: TailwindOption[] = [
    { label: "None", value: "border-0" },
    { label: "Light", value: "border" },
    { label: "Medium", value: "border-2" },
    { label: "Heavy", value: "border-4" },
    { label: "Extra Heavy", value: "border-8" },
];

export const borderStyleOptions: TailwindOption[] = [
    { label: "None", value: "border-none" },
    { label: "Solid", value: "border-solid" },
    { label: "Dashed", value: "border-dashed" },
    { label: "Dotted", value: "border-dotted" },
    { label: "Double", value: "border-double" },
    { label: "Hidden", value: "border-hidden" },
];

export const borderRadiusOptions: TailwindOption[] = [
    { label: "None", value: "rounded-none" },
    { label: "Small", value: "rounded-sm" },
    { label: "Default", value: "rounded" },
    { label: "Medium", value: "rounded-md" },
    { label: "Large", value: "rounded-lg" },
    { label: "Extra Large", value: "rounded-xl" },
    { label: "2X Large", value: "rounded-2xl" },
    { label: "3X Large", value: "rounded-3xl" },
    { label: "Full", value: "rounded-full" },
];

export const shadowOptions: TailwindOption[] = [
    { label: "None", value: "shadow-none" },
    { label: "Extra Small", value: "shadow-2xs" },
    { label: "Small", value: "shadow-xs" },
    { label: "Default", value: "shadow-sm" },
    { label: "Medium", value: "shadow-md" },
    { label: "Large", value: "shadow-lg" },
    { label: "Extra Large", value: "shadow-xl" },
    { label: "2X Large", value: "shadow-2xl" },
];

export const textShadowOptions: TailwindOption[] = [
    { label: "None", value: "text-shadow-none" },
    { label: "Extra Small", value: "text-shadow-2xs" },
    { label: "Small", value: "text-shadow-xs" },
    { label: "Default", value: "text-shadow-sm" },
    { label: "Medium", value: "text-shadow-md" },
    { label: "Large", value: "text-shadow-lg" },
    { label: "Custom", value: "text-shadow-custom" },
];

export const opacityOptions: TailwindOption[] = [
    { label: "50%", value: "opacity-50" },
    { label: "75%", value: "opacity-75" },
    { label: "100%", value: "opacity-100" },
];

export const cursorOptions: TailwindOption[] = [
    { label: "Not Allowed", value: "cursor-not-allowed" },
    { label: "Default", value: "cursor-default" },
    { label: "Pointer", value: "cursor-pointer" },
];

export const fontSizeOptions: TailwindOption[] = [
    { label: "Extra Small", value: "text-xs" },
    { label: "Small", value: "text-sm" },
    { label: "Base", value: "text-base" },
    { label: "Large", value: "text-lg" },
    { label: "Extra Large", value: "text-xl" },
    { label: "2X Large", value: "text-2xl" },
    { label: "3X Large", value: "text-3xl" },
    { label: "4X Large", value: "text-4xl" },
    { label: "5X Large", value: "text-5xl" },
    { label: "6X Large", value: "text-6xl" },
    { label: "7X Large", value: "text-7xl" },
    { label: "8X Large", value: "text-8xl" },
    { label: "9X Large", value: "text-9xl" },
];

export const fontWeightOptions: TailwindOption[] = [
    { label: "Thin", value: "font-thin" },
    { label: "Extra Light", value: "font-extralight" },
    { label: "Light", value: "font-light" },
    { label: "Normal", value: "font-normal" },
    { label: "Medium", value: "font-medium" },
    { label: "Semi Bold", value: "font-semibold" },
    { label: "Bold", value: "font-bold" },
    { label: "Extra Bold", value: "font-extrabold" },
    { label: "Black", value: "font-black" },
];

export const lineHeightOptions: TailwindOption[] = [
    { label: "None", value: "leading-none" },
    { label: "Tight", value: "leading-tight" },
    { label: "Snug", value: "leading-snug" },
    { label: "Normal", value: "leading-normal" },
    { label: "Relaxed", value: "leading-relaxed" },
    { label: "Loose", value: "leading-loose" },
];

export const letterSpacingOptions: TailwindOption[] = [
    { label: "Tighter", value: "tracking-tighter" },
    { label: "Tight", value: "tracking-tight" },
    { label: "Normal", value: "tracking-normal" },
    { label: "Wide", value: "tracking-wide" },
    { label: "Wider", value: "tracking-wider" },
    { label: "Widest", value: "tracking-widest" },
];

export const textAlignOptions: TailwindOption[] = [
    { label: "Left", value: "text-left" },
    { label: "Center", value: "text-center" },
    { label: "Right", value: "text-right" },
    { label: "Justify", value: "text-justify" },
];

export const textTransformOptions: TailwindOption[] = [
    { label: "None", value: "normal-case" },
    { label: "Uppercase", value: "uppercase" },
    { label: "Lowercase", value: "lowercase" },
    { label: "Capitalize", value: "capitalize" },
];

export const fontFamilyOptions = {
    Sans: [
        { label: "Inter", value: "font-inter" },
        { label: "Open Sans", value: "font-open-sans" },
        { label: "Source Sans 3", value: "font-source-sans-3" },
        { label: "Noto Sans", value: "font-noto-sans" },
        { label: "Roboto", value: "font-roboto" },
        { label: "Mulish", value: "font-mulish" },
        { label: "Nunito", value: "font-nunito" },
        { label: "Work Sans", value: "font-work-sans" },
    ],
    Serif: [
        { label: "Merriweather", value: "font-merriweather" },
        { label: "Alegreya", value: "font-alegreya" },
        { label: "Playfair Display", value: "font-playfair-display" },
        { label: "Roboto Slab", value: "font-roboto-slab" },
        { label: "Source Serif 4", value: "font-source-serif-4" },
    ],
    Display: [
        { label: "Montserrat", value: "font-montserrat" },
        { label: "Poppins", value: "font-poppins" },
        { label: "Raleway", value: "font-raleway" },
        { label: "Rubik", value: "font-rubik" },
        { label: "Oswald", value: "font-oswald" },
        { label: "Bebas Neue", value: "font-bebas-neue" },
    ],
    Modern: [
        { label: "Lato", value: "font-lato" },
        { label: "PT Sans", value: "font-pt-sans" },
        { label: "Quicksand", value: "font-quicksand" },
    ],
} as const;
