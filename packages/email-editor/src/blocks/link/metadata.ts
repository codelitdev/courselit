import { Link } from "lucide-react";
import type { BlockMetadata } from "@/types/block-registry";

export const metadata: BlockMetadata = {
    name: "link",
    displayName: "Link",
    description: "Add a hyperlink or call-to-action button",
    icon: Link,
};
