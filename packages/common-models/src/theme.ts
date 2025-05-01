type FontWeight =
    | "font-thin"
    | "font-extralight"
    | "font-light"
    | "font-normal"
    | "font-medium"
    | "font-semibold"
    | "font-bold"
    | "font-extrabold"
    | "font-black";
type FontSize =
    | "text-xs"
    | "text-sm"
    | "text-base"
    | "text-lg"
    | "text-xl"
    | "text-2xl"
    | "text-3xl"
    | "text-4xl"
    | "text-5xl"
    | "text-6xl"
    | "text-7xl"
    | "text-8xl"
    | "text-9xl";
type LineHeight =
    | "leading-none"
    | "leading-tight"
    | "leading-snug"
    | "leading-normal"
    | "leading-relaxed"
    | "leading-loose";
type LetterSpacing =
    | "tracking-tighter"
    | "tracking-tight"
    | "tracking-normal"
    | "tracking-wide"
    | "tracking-wider"
    | "tracking-widest";
type TextTransform = "uppercase" | "lowercase" | "capitalize" | "normal-case";
type TextDecoration = "underline" | "line-through" | "no-underline";
type TextOverflow = "truncate" | "text-ellipsis" | "text-clip";
type BorderRadius =
    | "rounded-none"
    | "rounded-sm"
    | "rounded"
    | "rounded-md"
    | "rounded-lg"
    | "rounded-xl"
    | "rounded-2xl"
    | "rounded-3xl"
    | "rounded-full";
type Shadow =
    | "shadow-sm"
    | "shadow"
    | "shadow-md"
    | "shadow-lg"
    | "shadow-xl"
    | "shadow-2xl"
    | "shadow-inner"
    | "shadow-none";
type Cursor = "cursor-not-allowed" | "cursor-default" | "cursor-pointer";

export interface Typography {
    fontFamily: string;
    fontSize: FontSize;
    fontWeight: FontWeight;
    lineHeight?: LineHeight;
    letterSpacing?: LetterSpacing;
    textTransform?: TextTransform;
    textDecoration?: TextDecoration;
    textOverflow?: TextOverflow;
}

export interface Border {
    color?: string;
    width?:
        | "border-0"
        | "border-1"
        | "border-2"
        | "border-3"
        | "border-4"
        | "border-5"
        | "border-6"
        | "border-7"
        | "border-8"
        | "border-9"
        | "border-10";
    radius?: BorderRadius;
    style?:
        | "solid"
        | "dashed"
        | "dotted"
        | "double"
        | "groove"
        | "ridge"
        | "inset"
        | "outset"
        | "hidden"
        | "none";
}

export interface Padding {
    x?:
        | "px-0"
        | "px-1"
        | "px-2"
        | "px-3"
        | "px-4"
        | "px-5"
        | "px-6"
        | "px-8"
        | "px-10"
        | "px-12"
        | "px-16"
        | "px-20"
        | "px-24"
        | "px-32"
        | "px-40"
        | "px-48"
        | "px-56"
        | "px-64";
    y?:
        | "py-0"
        | "py-1"
        | "py-2"
        | "py-3"
        | "py-4"
        | "py-5"
        | "py-6"
        | "py-8"
        | "py-10"
        | "py-12"
        | "py-16"
        | "py-20"
        | "py-24"
        | "py-32"
        | "py-40"
        | "py-48"
        | "py-56"
        | "py-64";
}

export interface HoverStyle {
    color?: string;
    background?: string;
    border?: Border;
    shadow?: Shadow;
}

export interface DisabledStyle {
    color?: string;
    background?: string;
    border?: string;
    opacity?: "opacity-50" | "opacity-75" | "opacity-100";
    cursor?: Cursor;
}

export default interface Theme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        border: string;
        text: string;
        success: string;
        error: string;
        warning: string;
        info: string;
    };
    typography: {
        preheader: Typography;
        header1: Typography;
        header2: Typography;
        header3: Typography;
        header4: Typography;
        subheader1: Typography;
        subheader2: Typography;
        text1: Typography;
        text2: Typography;
        link: Typography;
        button: Typography;
        input: Typography;
        caption: Typography;
    };
    interactives: {
        button: {
            padding?: Padding;
            border?: Border;
            shadow?: Shadow;
            hover?: HoverStyle;
            disabled?: DisabledStyle;
        };
        link: {
            padding?: Padding;
            border?: Border;
            shadow?: Shadow;
            hover?: HoverStyle;
            disabled?: DisabledStyle;
        };
        card: {
            padding?: Padding;
            border?: Border;
            shadow?: Shadow;
            hover?: HoverStyle;
        };
        input: {
            borderRadius?: BorderRadius;
            padding?: Padding;
            border?: Border;
            shadow?: Shadow;
            hover?: HoverStyle;
            disabled?: DisabledStyle;
        };
    };
    structure: {
        page: {
            width:
                | "max-w-none"
                | "max-w-xs"
                | "max-w-sm"
                | "max-w-md"
                | "max-w-lg"
                | "max-w-xl"
                | "max-w-2xl"
                | "max-w-3xl"
                | "max-w-4xl"
                | "max-w-5xl"
                | "max-w-6xl"
                | "max-w-7xl"
                | "max-w-full"
                | "max-w-screen-sm"
                | "max-w-screen-md"
                | "max-w-screen-lg"
                | "max-w-screen-xl";
        };
    };
}
