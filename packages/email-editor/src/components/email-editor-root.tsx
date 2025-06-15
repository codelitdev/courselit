import { EmailEditorProvider } from "@/context/email-editor-context";
import { EmailEditor as EmailEditorComponent } from "./email-editor";
import type { Email } from "@/types/email-editor";

interface EmailEditorProps {
    email: Email;
    onChange: (email: Email) => void;
}

export function EmailEditor({ email, onChange }: EmailEditorProps) {
    return (
        <EmailEditorProvider initialEmail={email} onChange={onChange}>
            <EmailEditorComponent />
        </EmailEditorProvider>
    );
}
