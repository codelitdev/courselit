import type { CommonBlockSettings } from "@/types/common-block-settings";

export interface SeparatorBlockSettings extends CommonBlockSettings {
    color?: string;
    thickness?: string;
    style?: "solid" | "dashed" | "dotted" | "double";
    marginY?: string;
}
