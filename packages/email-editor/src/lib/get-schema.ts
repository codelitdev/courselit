import { BlockComponent } from "@/types/block-registry";

export default function getSchema(blocks: BlockComponent[]) {
    let specs = "";

    for (const block of blocks) {
        specs += `
### ${block.metadata.displayName}

${block.metadata.description}

#### Technical name: ${block.metadata.name}

#### Settings

${Object.entries(block.metadata.docs.settings)
    .map(([key, description]) => `- **${key}**: ${description}`)
    .join("\n")}

`;
    }

    return specs;
}
