import type { CommonBlockSettings } from "@/types/email-editor";

export interface LinkBlockSettings extends CommonBlockSettings {
    text: string;
    url: string;
    alignment?: "left" | "center" | "right";
    textColor?: string;
    fontSize?: string;
    textDecoration?: string;

    // Button mode settings
    isButton?: boolean;
    buttonColor?: string;
    buttonTextColor?: string;
    buttonBorderRadius?: string;
    buttonPaddingX?: string;
    buttonPaddingY?: string;
    buttonBorderWidth?: string;
    buttonBorderStyle?: string;
    buttonBorderColor?: string;
}
