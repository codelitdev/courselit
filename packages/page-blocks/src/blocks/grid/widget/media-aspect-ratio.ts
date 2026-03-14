import { GraphicMediaAspectRatio } from "../settings";

const mediaAspectRatioClasses: Record<GraphicMediaAspectRatio, string> = {
    auto: "aspect-auto",
    "16/9": "aspect-video",
    "4/3": "aspect-[4/3]",
    "1/1": "aspect-square",
    "3/4": "aspect-[3/4]",
    "9/16": "aspect-[9/16]",
};

export function getGraphicMediaAspectRatioClass(
    aspectRatio: GraphicMediaAspectRatio,
): string {
    return mediaAspectRatioClasses[aspectRatio];
}
