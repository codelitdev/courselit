import {
    Alignment,
    Media,
    TextEditorContent,
    WidgetDefaultSettings,
} from "@courselit/common-models";
import { ImageObjectFit } from "@courselit/components-library";
import { AspectRatio } from "../../components";

export default interface Settings extends WidgetDefaultSettings {
    title?: string;
    description?: TextEditorContent;
    buttonCaption?: string;
    buttonAction?: string;
    media?: Media;
    youtubeLink?: string;
    alignment?: Alignment | "right";
    mediaRadius?: number;
    secondaryButtonCaption?: string;
    secondaryButtonAction?: string;
    titleFontSize?: number;
    descriptionFontSize?: number;
    contentAlignment?: Alignment;
    cssId?: string;
    playVideoInModal?: boolean;
    aspectRatio?: AspectRatio;
    objectFit?: ImageObjectFit;
    layout?: "normal" | "card";
}
