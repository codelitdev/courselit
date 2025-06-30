import { useState } from "react";
import { Email, EmailEditor, renderEmailToHtml } from "@courselit/email-editor";
import { Text, Link, Separator, Image } from "@courselit/email-editor/blocks";
import "@courselit/email-editor/styles.css";
import { Button } from "@components/ui/button";

const blocks = [Text, Link, Separator, Image];

export function MailEditorAndPreview({
    initialEmail,
    onChange,
    disabled,
}: {
    initialEmail: Email;
    onChange: (email: Email) => void;
    disabled?: boolean;
}) {
    const [email, setEmail] = useState<Email>(initialEmail);

    return (
        <div>
            <div>
                <Button
                    onClick={async () => {
                        const html = await renderEmailToHtml({
                            email: email!,
                        });
                    }}
                >
                    Render
                </Button>
                <div className="overflow-hidden h-[540px]">
                    <EmailEditor
                        email={email}
                        onChange={(email) => {
                            onChange(email);
                        }}
                        blocks={blocks}
                    />
                </div>
            </div>
        </div>
    );
}
