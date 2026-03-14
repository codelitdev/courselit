import { GridGraphicType, GridMediaAlignment, GridStyle } from "./settings";

export const DEFAULT_GRID_STYLE: GridStyle = "default";

export function normalizeGraphicType(
    style: GridStyle,
    graphicType: GridGraphicType,
): GridGraphicType {
    if (style === "testimonial" || style === "mediacard") {
        return "media";
    }

    return graphicType;
}

export function getDefaultMediaAlignment(style: GridStyle): GridMediaAlignment {
    return style === "default" ? "top" : "left";
}

export function normalizeMediaAlignment(
    style: GridStyle,
    mediaAlignment: GridMediaAlignment,
): GridMediaAlignment {
    if (style === "default") {
        return mediaAlignment === "bottom" ? "bottom" : "top";
    }

    if (style === "mediacard") {
        return "left";
    }

    return mediaAlignment === "center" || mediaAlignment === "right"
        ? mediaAlignment
        : "left";
}
