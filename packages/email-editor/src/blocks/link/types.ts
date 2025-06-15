import type { CommonBlockSettings } from "@/types/common-block-settings";

export interface LinkBlockSettings extends CommonBlockSettings {
    text: string;
    url: string;
    alignment?: "left" | "center" | "right";
    textColor?: string;
    fontSize?: string;
    fontWeight?: string;
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
