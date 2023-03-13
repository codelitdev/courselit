import { Media, WidgetDefaultSettings } from "@courselit/common-models";

export default interface Settings extends WidgetDefaultSettings {
    title?: string;
    description?: string;
    buttonCaption?: string;
    buttonAction?: string;
    buttonBackground?: string;
    buttonForeground?: string;
    media?: Media;
    youtubeLink?: string;
    alignment?: "left" | "right";
    backgroundColor?: string;
    foregroundColor?: string;
    style: "card" | "normal";
    mediaRadius?: number;
}
