import { createContext, useContext, ReactNode } from "react";
import type { BlockComponent, BlockRegistry } from "@/types/block-registry";
import { Image, Link, Separator, Text } from "@/blocks";

const BlockRegistryContext = createContext<BlockRegistry | undefined>(
    undefined,
);

export function BlockRegistryProvider({
    children,
    blocks,
}: {
    children: ReactNode;
    blocks?: BlockComponent[];
}) {
    const blockRegistry = generateBlockRegistry(blocks);

    return (
        <BlockRegistryContext.Provider value={blockRegistry}>
            {children}
        </BlockRegistryContext.Provider>
    );
}

export function useBlockRegistry() {
    const context = useContext(BlockRegistryContext);
    if (context === undefined) {
        throw new Error(
            "useBlockRegistry must be used within a BlockRegistryProvider",
        );
    }
    return context;
}

export function generateBlockRegistry(
    blocks?: BlockComponent[],
): BlockRegistry {
    const blockRegistry: BlockRegistry = {};
    for (const block of blocks || [Text, Separator, Image, Link]) {
        blockRegistry[block.metadata.name] = block;
    }
    return blockRegistry;
}
