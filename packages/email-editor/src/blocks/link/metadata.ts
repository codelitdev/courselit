import { Link } from "lucide-react";
import type { BlockMetadata } from "@/types/block-registry";

export const metadata: BlockMetadata = {
    name: "link",
    displayName: "Link",
    description: "Add a hyperlink or call-to-action button",
    icon: Link,
    docs: {
        settings: {
            text: "The text to display for the link or button",
            url: "The URL that the link or button will navigate to. Format: https://example.com",
            alignment:
                "[Optional] The alignment of the link or button. Range: left, center, right. Default: left",
            isButton:
                "[Optional] Whether to display as a button instead of a text link. Default: false",
            textColor:
                "[Optional] The color of the link text (when not in button mode). Format: #000000",
            fontSize:
                "[Optional] The font size of the link text (when not in button mode). Range: 12px, 14px, 16px, 18px, 20px, 24px. Default: 16px",
            textDecoration:
                "[Optional] The text decoration of the link (when not in button mode). Range: underline, none, line-through. Default: underline",
            buttonColor:
                "[Optional] The background color of the button (when in button mode). Format: #000000",
            buttonTextColor:
                "[Optional] The text color of the button (when in button mode). Format: #000000",
            buttonBorderRadius:
                "[Optional] The border radius of the button (when in button mode). Format: 4px. Range: 0-50. Default: 4px",
            buttonPaddingX:
                "[Optional] The horizontal padding of the button (when in button mode). Format: 16px. Range: 0-100. Default: 16px",
            buttonPaddingY:
                "[Optional] The vertical padding of the button (when in button mode). Format: 8px. Range: 0-50. Default: 8px",
            buttonBorderWidth:
                "[Optional] The border width of the button (when in button mode). Format: 0px. Range: 0-10. Default: 0px",
            buttonBorderStyle:
                "[Optional] The border style of the button (when in button mode). Range: solid, dashed, dotted. Default: solid",
            buttonBorderColor:
                "[Optional] The border color of the button (when in button mode). Format: #000000",
            backgroundColor:
                "[Optional] The background color of the link block. Format: #000000",
            paddingTop:
                "[Optional] The top padding of the link block. Format: 0px. Range: 0-100. Default: 0px",
            paddingBottom:
                "[Optional] The bottom padding of the link block. Format: 0px. Range: 0-100. Default: 0px",
        },
    },
};
