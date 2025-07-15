import { ImageIcon } from "lucide-react";
import type { BlockMetadata } from "@/types/block-registry";

export const metadata: BlockMetadata = {
    name: "image",
    displayName: "Image",
    description: "Add images with customizable sizing and alignment",
    icon: ImageIcon,
    docs: {
        settings: {
            src: "The URL of the image to display. Format: https://example.com/image.jpg",
            alt: "[Optional] Alternative text for the image for accessibility. Format: string",
            alignment:
                "[Optional] The alignment of the image. Range: left, center, right. Default: left",
            width: "[Optional] The width of the image. Range: auto, 100px, 200px, 300px, 400px, 500px, 100%. Default: auto",
            height: "[Optional] The height of the image. Range: auto, 100px, 150px, 200px, 250px, 300px. Default: auto",
            maxWidth:
                "[Optional] The maximum width of the image. Range: 100%, 75%, 50%, 25%, none. Default: 100%",
            borderRadius:
                "[Optional] The border radius of the image. Format: 0px. Range: 0-250. Default: 0px",
            borderWidth:
                "[Optional] The border width of the image. Format: 0px. Range: 0-10. Default: 0px",
            borderStyle:
                "[Optional] The border style of the image. Range: solid, dashed, dotted. Default: solid",
            borderColor:
                "[Optional] The border color of the image. Format: #e2e8f0. Default: #e2e8f0",
            backgroundColor:
                "[Optional] The background color of the image block. Format: #000000. Default: transparent",
            paddingTop:
                "[Optional] The top padding of the image block. Format: 0px. Range: 0-100. Default: 0px",
            paddingBottom:
                "[Optional] The bottom padding of the image block. Format: 0px. Range: 0-100. Default: 0px",
        },
    },
};
