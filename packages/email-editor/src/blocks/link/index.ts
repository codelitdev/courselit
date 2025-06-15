import { LinkBlock as block } from "./block";
import { LinkSettings as settings } from "./settings";
import { metadata } from "./metadata";
import type { BlockComponent } from "@/types/block-registry";

export const LinkBlock: BlockComponent = {
    block,
    settings,
    metadata,
};
