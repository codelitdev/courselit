import { WidgetDefaultSettings } from "@courselit/common-models";

export interface Item {
    // title: string;
    href?: string;
    text?: string;
    svgText?: string;
}

export interface FadeEffect {
    // enabled: boolean;
    width: number;
    color?: string;
}

export interface ScrollEffect {
    speed: number;
    direction: "left" | "right";
    pauseOnHover: boolean;
}

export interface ItemStyle {
    backgroundColor?: string;
    foregroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    borderStyle?: "solid" | "dashed" | "dotted" | "double" | "none";
}

export default interface Settings extends WidgetDefaultSettings {
    items: Item[];
    scrollEffect: ScrollEffect;
    itemStyle: ItemStyle;
    fadeEffect: FadeEffect;
    cssId?: string;
}
