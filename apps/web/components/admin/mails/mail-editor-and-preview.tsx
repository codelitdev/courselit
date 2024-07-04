import { FormField } from "@courselit/components-library";
import { renderEmailContent } from "@courselit/utils";
import { ChangeEvent, useEffect, useState } from "react";

export function MailEditorAndPreview({
    content,
    onChange,
    disabled,
}: {
    content: string;
    onChange: (content: string) => void;
    disabled?: boolean;
}) {
    const [emailRendered, setEmailRendered] = useState<string>("");

    const renderEmail = async () => {
        if (!content) return;
        try {
            const emailContent = await renderEmailContent(content, {
                subscriber: {
                    email: "USER_EMAIL",
                    name: "USER_NAME",
                },
                address: "MAILING_ADDRESS",
                unsubscribe_link: "UNSUBSCRIBE_LINK",
            });
            setEmailRendered(emailContent);
        } catch (e) {
            setEmailRendered(
                "<p style='color: red;'>Error: You might have forgotten to close a Liquid tag. </p><p style='color: red;'>Check the variables you are using in the content.</p>",
            );
        }
    };

    useEffect(() => {
        renderEmail();
    }, [content]);

    return (
        <div className="flex gap-2">
            <div className="flex flex-col w-1/5">
                <h3 className="text-lg font-semibold">Variables</h3>
                <div className="flex flex-col gap-4 border border-gray-200 rounded w-full p-2 min-h-[360px]">
                    <p className="text-xs text-slate-500">
                        You can use the following variables in your content.
                    </p>
                    <p className="text-xs text-slate-500">
                        These will be replaced with the actual data while
                        sending emails.
                    </p>
                    <div>
                        <h4 className="font-semibold text-sm text-slate-600">
                            {"{{ subscriber.email }}"}
                        </h4>
                        <p className="text-sm text-slate-500">
                            The email of the subscriber
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-slate-600">
                            {"{{ subscriber.name}}"}
                        </h4>
                        <p className="text-sm text-slate-500">
                            The name of the subscriber
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-slate-600">
                            {"{{ address }}"}
                        </h4>
                        <p className="text-sm text-slate-500">
                            Your mailing address
                        </p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-slate-600">
                            {"{{ unsubscribe_link}}"}
                        </h4>
                        <p className="text-sm text-slate-500">
                            A link to unsubscribe from the marketing emails
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex-1">
                <FormField
                    component="textarea"
                    value={content}
                    label={"Mail content"}
                    multiline="true"
                    rows={17}
                    disabled={disabled}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        onChange(e.target.value)
                    }
                />
            </div>
            <div className="flex flex-col w-1/4">
                <h3 className="text-lg font-semibold">Preview</h3>
                <iframe
                    srcDoc={emailRendered}
                    title="Preview"
                    className="border border-gray-200 rounded w-full min-h-[360px]"
                />
            </div>
        </div>
    );
}
