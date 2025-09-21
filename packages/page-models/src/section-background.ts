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
    blendMode: BlendMode;
    opacity: number;
}

export interface ColorSectionBackground {
    type: "color";
    backgroundColor: string;
    backgroundColorDark?: string;
}

export interface ImageSectionBackground {
    type: "image";
    overlay: SectionBackgroundOverlay;
    image: Record<string, unknown>;
    backgroundImage: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: BackgroundRepeat;
    maskImage?: string;
}

export interface GradientSectionBackground {
    type: "gradient";
    backgroundImage: string;
    backgroundImageDark?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: BackgroundRepeat;
    maskImage?: string;
}

export type SectionBackground =
    | ColorSectionBackground
    | ImageSectionBackground
    | GradientSectionBackground;
