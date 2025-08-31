import { EmailEditor as EmailEditorComponent } from "./components/email-editor";
import type { Email } from "@/types/email-editor";
import type { BlockComponent, BlockRegistry } from "@/types/block-registry";
import { Text, Separator, Image, Link } from "@/blocks";

interface EmailEditorProps {
    email: Email;
    onChange: (email: Email) => void;
    blocks?: BlockComponent[];
}

function generateBlockRegistry(blocks?: BlockComponent[]): BlockRegistry {
    const blockRegistry: BlockRegistry = {};
    for (const block of blocks || [Text, Separator, Image, Link]) {
        blockRegistry[block.metadata.name] = block;
    }
    return blockRegistry;
}

export function EmailEditor({ email, onChange, blocks }: EmailEditorProps) {
    const blockRegistry = generateBlockRegistry(blocks);

    return (
        <EmailEditorComponent
            initialEmail={email}
            onChange={onChange}
            blockRegistry={blockRegistry}
        />
    );
}
