import { EmailEditorProvider } from "@/context/email-editor-context";
import { EmailEditor as EmailEditorComponent } from "./email-editor";
import type { Email } from "@/types/email-editor";
import { BlockRegistryProvider } from "@/context/block-registry-context";
import type { BlockComponent } from "@/types/block-registry";

interface EmailEditorProps {
    email: Email;
    onChange: (email: Email) => void;
    blocks?: BlockComponent[];
}

export function EmailEditor({ email, onChange, blocks }: EmailEditorProps) {
    return (
        <BlockRegistryProvider blocks={blocks}>
            <EmailEditorProvider initialEmail={email} onChange={onChange}>
                <EmailEditorComponent />
            </EmailEditorProvider>
        </BlockRegistryProvider>
    );
}
