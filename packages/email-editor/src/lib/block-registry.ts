import type { BlockRegistry } from "@/types/block-registry";
import { TextBlock } from "@/blocks/text";
import { SeparatorBlock } from "@/blocks/separator";
import { ImageBlock } from "@/blocks/image";
import { LinkBlock } from "@/blocks/link";

function loadBlocks(): BlockRegistry {
    const blocks: BlockRegistry = {};

    // Register all blocks
    blocks[TextBlock.metadata.name] = TextBlock;
    blocks[SeparatorBlock.metadata.name] = SeparatorBlock;
    blocks[ImageBlock.metadata.name] = ImageBlock;
    blocks[LinkBlock.metadata.name] = LinkBlock;

    return blocks;
}

const blockRegistry = loadBlocks();
export default blockRegistry;
