import type { CommonBlockSettings } from "@/types/email-editor";

export interface SeparatorBlockSettings extends CommonBlockSettings {
    color?: string;
    thickness?: string;
    style?: "solid" | "dashed" | "dotted" | "double";
}
