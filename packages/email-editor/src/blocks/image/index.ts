import { ImageBlock as block } from "./block";
import { ImageSettings as settings } from "./settings";
import { metadata } from "./metadata";
import type { BlockComponent } from "@/types/block-registry";

export const ImageBlock: BlockComponent = {
    block,
    settings,
    metadata,
};
