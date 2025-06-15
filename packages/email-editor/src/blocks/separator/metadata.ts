import { Minus } from "lucide-react";
import type { BlockMetadata } from "@/types/block-registry";

export const metadata: BlockMetadata = {
    name: "separator",
    displayName: "Separator",
    description: "Horizontal line to separate content sections",
    icon: Minus,
};
