import Settings from "./settings";

export const validateSvg = (code: string): boolean => {
    if (!code.trim()) return false;

    // Basic validation - check if it starts with <svg and ends with </svg>
    const hasSvgTags =
        code.trim().startsWith("<svg") && code.trim().endsWith("</svg>");

    if (!hasSvgTags) {
        throw new Error(
            "Invalid SVG format. Make sure your code starts with <svg and ends with </svg>",
        );
    }

    return true;
};

export const processedSvg = (
    svgCode: string,
    svgStyle: Settings["svgStyle"],
) => {
    if (!validateSvg(svgCode)) return "";

    // Replace currentColor with the selected color
    // For Lucide icons, replace currentColor with the selected color
    // For other SVGs, replace the fill attribute if it exists
    return svgCode
        .replace(/currentColor/g, svgStyle.svgColor)
        .replace(/fill="([^"]*)"(?!.*fill=)/g, (match, fillValue) => {
            // Only replace the fill if it's not already set to a specific color
            return fillValue === "none" ? match : `fill="${svgStyle.svgColor}"`;
        })
        .replace(/<svg/, '<svg width="100%" height="100%"');
};
