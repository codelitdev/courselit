import { EmailEditorProvider } from "@/context/email-editor-context";
import { EmailEditor } from "./components/email-editor";
import type { Email } from "@/types/email-editor";
import { BlockRegistryProvider } from "@/context/block-registry-context";
import type { BlockComponent } from "@/types/block-registry";

interface EmailEditorProps {
    email: Email;
    onChange: (email: Email) => void;
    blocks?: BlockComponent[];
}

export function EmailEditorWithProviders({
    email,
    onChange,
    blocks,
}: EmailEditorProps) {
    return (
        <BlockRegistryProvider blocks={blocks}>
            <EmailEditorProvider initialEmail={email} onChange={onChange}>
                <EmailEditor />
            </EmailEditorProvider>
        </BlockRegistryProvider>
    );
}
