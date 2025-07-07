import { Button2 } from "@courselit/components-library";
import { CheckCircled, Sync } from "@courselit/icons";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export const EmailEditorLayout = ({
    children,
    isSaving,
    type = "sequence",
}: {
    children: React.ReactNode;
    isSaving?: boolean;
    type?: "sequence" | "product";
}) => (
    <div className="flex flex-col h-screen bg-muted/10">
        <div className="flex w-full h-full gap-4 p-4 bg-muted/10">
            <div className="max-w-[220px] flex flex-col">
                <div className="flex items-center mb-4">
                    <h2 className="text-base font-semibold text-gray-800">
                        Variables
                    </h2>
                </div>
                <div className="flex flex-col gap-5 flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                        You can use the following variables in your content.
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                        These will be replaced with the actual data while
                        sending emails.
                    </p>
                    <div className="flex flex-col gap-3">
                        {type === "product" && (
                            <>
                                <VariableDisplay
                                    variable="{{ product.title }}"
                                    description="The title of the product"
                                />
                                <VariableDisplay
                                    variable="{{ product.url }}"
                                    description="The URL of the product"
                                />
                            </>
                        )}
                        <VariableDisplay
                            variable="{{ subscriber.email }}"
                            description="The email of the subscriber"
                        />
                        <VariableDisplay
                            variable="{{ subscriber.name }}"
                            description="The name of the subscriber"
                        />
                        <VariableDisplay
                            variable="{{ address }}"
                            description="Your mailing address"
                        />
                        <VariableDisplay
                            variable="{{ unsubscribe_link }}"
                            description="A link to unsubscribe from the marketing emails"
                        />
                    </div>
                </div>
                <div className="flex items-center mt-4">
                    {isSaving ? (
                        <Sync className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        <CheckCircled className="h-4 w-4 text-green-500" />
                    )}
                </div>
            </div>
            <div className="w-full rounded-xl overflow-hidden border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
                {children}
            </div>
        </div>
    </div>
);

export const VariableDisplay = ({
    variable,
    description,
}: {
    variable: string;
    description: string;
}) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(variable);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Silently fail - just don't show the check mark
        }
    };

    return (
        <div className="group">
            <div className="flex items-center gap-2">
                <div className="font-mono text-sm bg-muted px-2 py-1 rounded text-slate-700 font-semibold inline-block cursor-pointer hover:bg-muted/80 transition-colors">
                    {variable}
                </div>
                <Button2
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={copyToClipboard}
                >
                    {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                    ) : (
                        <Copy className="h-3 w-3" />
                    )}
                </Button2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 ml-1">
                {description}
            </p>
        </div>
    );
};
