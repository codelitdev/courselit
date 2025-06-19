import type { CommonBlockSettings } from "@/types/email-editor";

export interface ImageBlockSettings extends CommonBlockSettings {
    src: string;
    alt?: string;
    alignment?: "left" | "center" | "right";
    width?: string;
    height?: string;
    maxWidth?: string;
    borderRadius?: string;
    borderWidth?: string;
    borderStyle?: string;
    borderColor?: string;
    padding?: string;
}
