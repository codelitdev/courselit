import { TextBlock as block } from "./block";
import { TextSettings as settings } from "./settings";
import { metadata } from "./metadata";
import type { BlockComponent } from "@/types/block-registry";

export const TextBlock: BlockComponent = {
    block,
    settings,
    metadata,
};
