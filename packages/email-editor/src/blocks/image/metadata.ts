import { ImageIcon } from "lucide-react";
import type { BlockMetadata } from "@/types/block-registry";

export const metadata: BlockMetadata = {
    name: "image",
    displayName: "Image",
    description: "Add images with customizable sizing and alignment",
    icon: ImageIcon,
};
