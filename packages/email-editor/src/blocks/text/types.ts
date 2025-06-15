import type { CommonBlockSettings } from "@/types/common-block-settings";

export interface TextBlockSettings extends CommonBlockSettings {
    content: string;
    alignment?: "left" | "center" | "right" | "justify";
    fontFamily?: string;
    fontSize?: string;
    lineHeight?: string;
    textColor?: string;
}
