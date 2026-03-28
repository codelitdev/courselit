export type BlendMode =
    | "normal"
    | "multiply"
    | "screen"
    | "overlay"
    | "darken"
    | "lighten"
    | "color-dodge"
    | "color-burn"
    | "hard-light"
    | "soft-light"
    | "difference"
    | "exclusion"
    | "hue"
    | "saturation"
    | "color"
    | "luminosity";

export type BackgroundRepeat =
    | "no-repeat"
    | "repeat"
    | "repeat-x"
    | "repeat-y"
    | "space"
    | "round";

export interface SectionBackgroundOverlay {
    color: string;
    colorDark?: string;
    blendMode: BlendMode;
    opacity: number;
}

export type SectionBackground = {
    type: "color" | "image" | "gradient";
    backgroundColor?: string;
    backgroundColorDark?: string;
    backgroundImage?: string;
    backgroundImageDark?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: BackgroundRepeat;
    maskImage?: string;
    gradientBackgroundSize?: string;
    gradientBackgroundPosition?: string;
    gradientBackgroundRepeat?: BackgroundRepeat;
    gradientMaskImage?: string;
    blur?: number;
    overlay?: SectionBackgroundOverlay;
    media?: Record<string, unknown>;
};
