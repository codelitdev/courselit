import type {
    Alignment,
    Media,
    TextEditorContent,
    WidgetDefaultSettings,
} from "@courselit/common-models";

export interface Item {
    title: string;
    description?: TextEditorContent;
    buttonCaption?: string;
    buttonAction?: string;
    media?: Partial<Media>;
    svgText?: string;
    subTitle?: string;
}

export interface SvgStyle {
    width: number;
    height: number;
    svgColor: `#${string}`;
    backgroundColor: `#${string}`;
    borderRadius: number;
    borderWidth: number;
    borderStyle: "solid" | "dashed" | "double" | "dotted" | "none";
    borderColor: `#${string}`;
}

export type GridStyle = "default" | "testimonial" | "featuregrid" | "mediacard";

export type GridGraphicType = "media" | "svg";
export type GridMediaAlignment = Alignment | "top" | "bottom";

export type GraphicMediaAspectRatio =
    | "auto"
    | "16/9"
    | "4/3"
    | "1/1"
    | "3/4"
    | "9/16";

export default interface Settings extends WidgetDefaultSettings {
    title: string;
    description?: TextEditorContent;
    headerAlignment: Alignment;
    itemsAlignment: Alignment;
    graphicType: GridGraphicType;
    style?: GridStyle;
    buttonCaption?: string;
    buttonAction?: string;
    items?: Item[];
    cssId?: string;
    columns?: number;
    svgStyle?: SvgStyle;
    svgInline?: boolean;
    mediaAlignment?: GridMediaAlignment;
    graphicMediaAspectRatio?: GraphicMediaAspectRatio;
}
