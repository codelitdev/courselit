import type { CommonBlockSettings } from "@/types/email-editor";

export interface TextBlockSettings extends CommonBlockSettings {
    content: string;
    alignment?: "left" | "center" | "right" | "justify";
    fontFamily?: string;
    fontSize?: `${number}px`;
    lineHeight?: `${number}`;
}
