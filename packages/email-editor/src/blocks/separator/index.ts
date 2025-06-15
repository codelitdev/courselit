import { SeparatorBlock as block } from "./block";
import { SeparatorSettings as settings } from "./settings";
import { metadata } from "./metadata";
import type { BlockComponent } from "@/types/block-registry";

export const SeparatorBlock: BlockComponent = {
    block,
    settings,
    metadata,
};
