import { Minus } from "lucide-react";
import type { BlockMetadata } from "@/types/block-registry";

export const metadata: BlockMetadata = {
    name: "separator",
    displayName: "Separator",
    description: "Horizontal line to separate content sections",
    icon: Minus,
    docs: {
        settings: {
            color: "[Optional] The color of the separator line. Format: #000000. Default: transparent",
            thickness:
                "[Optional] The thickness of the separator line. Format: 1px. Range: 1-20. Default: 1px",
            style: "[Optional] The style of the separator line. Range: solid, dashed, dotted, double. Default: solid",
            backgroundColor:
                "[Optional] The background color of the separator block. Format: #000000. Default: transparent",
            paddingTop:
                "[Optional] The top padding of the separator block. Format: 0px. Range: 0-100. Default: 0px",
            paddingBottom:
                "[Optional] The bottom padding of the separator block. Format: 0px. Range: 0-100. Default: 0px",
        },
    },
};
