import {
    Alignment,
    Media,
    WidgetDefaultSettings,
} from "@courselit/common-models";
import { ImageObjectFit } from "@courselit/components-library";
import { AspectRatio } from "@courselit/components-library";

export default interface Settings extends WidgetDefaultSettings {
    title?: string;
    description?: Record<string, unknown>;
    buttonCaption?: string;
    buttonAction?: string;
    buttonBackground?: string;
    buttonForeground?: string;
    media?: Media;
    youtubeLink?: string;
    alignment?: Alignment | "right";
    backgroundColor?: string;
    foregroundColor?: string;
    style: "card" | "normal";
    mediaRadius?: number;
    horizontalPadding: number;
    verticalPadding: number;
    secondaryButtonCaption?: string;
    secondaryButtonAction?: string;
    secondaryButtonBackground?: string;
    secondaryButtonForeground?: string;
    titleFontSize?: number;
    descriptionFontSize?: number;
    contentAlignment?: Alignment;
    cssId?: string;
    playVideoInModal?: boolean;
    aspectRatio?: AspectRatio;
    objectFit?: ImageObjectFit;
}
