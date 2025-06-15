import { Type } from "lucide-react";
import type { BlockMetadata } from "@/types/block-registry";

export const metadata: BlockMetadata = {
    name: "text",
    displayName: "Text",
    description: "Rich text content with formatting options",
    icon: Type,
};
