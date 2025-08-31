import { Type } from "lucide-react";
import type { BlockMetadata } from "@/types/block-registry";

export const metadata: BlockMetadata = {
    name: "text",
    displayName: "Text",
    description: "Rich text content with formatting options",
    icon: Type,
    docs: {
        settings: {
            content:
                "The text content to display. Use markdown to format the text.",
            alignment:
                "[Optional] The alignment of the text. Range: left, center, right, justify. Default: left",
            fontFamily:
                "[Optional] The font family to use. Range: Arial, Helvetica, Verdana, Georgia, Times New Roman, Monospace. Default: Arial, sans-serif",
            fontSize:
                "The font size to use. Format: 12px. Range: 12-48. Default: 16px",
            lineHeight:
                "The line height to use. Values: 1, 1.2, 1.5, 1.8, 2. Default: 1.5",
            foregroundColor:
                "[Optional] The color of the text. Format: #000000",
            backgroundColor:
                "[Optional] The background color of the text. Format: #000000",
            paddingTop:
                "[Optional] The top padding of the text. Format: 0px. Range: 0 - 100",
            paddingBottom:
                "[Optional] The bottom padding of the text. Format: 0px. Range: 0 - 100",
        },
    },
};
