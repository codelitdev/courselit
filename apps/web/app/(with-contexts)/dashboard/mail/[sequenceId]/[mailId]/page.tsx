"use client";

import { EmailEditor } from "@courselit/email-editor";
import "@courselit/email-editor/styles.css";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button2 } from "@courselit/components-library";
import { LogOut } from "lucide-react";
import { Sync, CheckCircled } from "@courselit/icons";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter, useSearchParams } from "next/navigation";
import type { Email as EmailContent } from "@courselit/email-editor";
import { useSequence } from "@/hooks/use-sequence";
import { FetchBuilder } from "@courselit/utils";
import { useContext } from "react";
import { AddressContext } from "@components/contexts";
import { useToast } from "@courselit/components-library";
import { debounce } from "@courselit/utils";

// Reusable layout components
const EmailEditorLayout = ({
    children,
    title,
    redirectTo,
    isSaving,
}: {
    children: React.ReactNode;
    title?: string;
    redirectTo?: string | null;
    isSaving?: boolean;
}) => (
    <div className="flex flex-col h-screen bg-muted/10">
        <div className="fixed w-full border-b z-10 bg-background">
            <header className="flex w-full h-14 px-6 justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-[220px]">
                        <div className="h-10 flex items-center px-3 rounded-md text-sm text-muted-foreground">
                            {title || "Untitled Email"}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {isSaving ? (
                        <Sync className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        <CheckCircled className="h-4 w-4 text-green-500" />
                    )}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <a
                                    href={
                                        redirectTo ||
                                        "/dashboard/mails?tab=Broadcasts"
                                    }
                                >
                                    <Button2 variant="outline" size="icon">
                                        <LogOut className="h-4 w-4" />
                                    </Button2>
                                </a>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Exit</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </header>
        </div>
        <div className="flex w-full h-[calc(100vh-56px)] mt-14 gap-4 p-4 bg-muted/10">
            <div className="w-full rounded-xl border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
                {children}
            </div>
        </div>
    </div>
);

const LoadingState = () => (
    <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading email editor...</div>
    </div>
);

const ErrorState = ({ error }: { error: string }) => (
    <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Failed to load sequence: {error}</div>
    </div>
);

const EmailEditorContent = ({
    email,
    onEmailChange,
}: {
    email: EmailContent;
    onEmailChange: (email: EmailContent) => void;
}) => <EmailEditor email={email} onChange={onEmailChange} />;

export default function EmailEditorPage({
    params,
}: {
    params: {
        sequenceId: string;
        mailId: string;
    };
}) {
    const [email, setEmail] = useState<EmailContent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams?.get("redirectTo");
    const address = useContext(AddressContext);
    const { toast } = useToast();

    const { sequence, loading, error, loadSequence } = useSequence();

    // Refs to track initial values and prevent saving during load
    const initialValues = useRef({
        content: null as EmailContent | null,
    });
    const isInitialLoad = useRef(true);

    const fetch = useCallback(
        () =>
            new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true),
        [address.backend],
    );

    useEffect(() => {
        if (params.sequenceId) {
            loadSequence(params.sequenceId);
        }
    }, [loadSequence, params.sequenceId]);

    useEffect(() => {
        if (sequence && params.mailId) {
            const targetEmail = sequence.emails.find(
                (email) => email.emailId === params.mailId,
            );

            if (targetEmail) {
                // Set initial values in ref
                initialValues.current = {
                    content: targetEmail.content,
                };

                setEmail(targetEmail.content);
                isInitialLoad.current = false;
            }
        }
    }, [sequence, params.mailId]);

    // Debounced save function
    const saveEmail = useCallback(
        async (emailContent: EmailContent) => {
            // Check if content has actually changed
            const hasChanged =
                JSON.stringify(emailContent) !==
                JSON.stringify(initialValues.current.content);

            if (!hasChanged) {
                return;
            }

            setIsSaving(true);

            const mutation = `
        mutation updateMailInSequence(
            $sequenceId: String!,
            $emailId: String!,
            $content: String,
        ) {
            mail: updateMailInSequence(
                sequenceId: $sequenceId,
                emailId: $emailId,
                content: $content,
            ) {
                sequenceId,
                title,
                emails {
                    emailId,
                    templateId,
                    content {
                        content {
                            blockType,
                            settings
                        },
                        style,
                        meta
                    },
                    subject,
                    delayInMillis,
                    published
                },
                filter {
                    aggregator,
                    filters {
                        name,
                        condition,
                        value,
                        valueLabel
                    },
                }
            },
        }`;

            const fetcher = fetch()
                .setPayload({
                    query: mutation,
                    variables: {
                        sequenceId: params.sequenceId,
                        emailId: params.mailId,
                        content: JSON.stringify(emailContent),
                    },
                })
                .build();

            try {
                await fetcher.exec();

                // Update initial values after successful save
                initialValues.current = {
                    content: emailContent,
                };
            } catch (e: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: e.message,
                    variant: "destructive",
                });
            } finally {
                setIsSaving(false);
            }
        },
        [params.sequenceId, params.mailId, fetch, toast],
    );

    // Create debounced version of save function
    const debouncedSave = useMemo(() => debounce(saveEmail, 1000), [saveEmail]);

    const handleEmailChange = (newEmailContent: EmailContent) => {
        debouncedSave(newEmailContent);
    };

    // Get email title from sequence
    const emailTitle = useMemo(() => {
        if (sequence && params.mailId) {
            const targetEmail = sequence.emails.find(
                (email) => email.emailId === params.mailId,
            );
            return targetEmail?.subject || "Untitled Email";
        }
        return "Untitled Email";
    }, [sequence, params.mailId]);

    const title = emailTitle;

    if (loading) {
        return (
            <EmailEditorLayout
                title="Loading..."
                redirectTo={redirectTo}
                isSaving={isSaving}
            >
                <LoadingState />
            </EmailEditorLayout>
        );
    }

    if (error) {
        return (
            <EmailEditorLayout
                title={`Error: ${error}`}
                redirectTo={redirectTo}
                isSaving={isSaving}
            >
                <ErrorState error={error} />
            </EmailEditorLayout>
        );
    }

    return (
        <EmailEditorLayout
            title={title}
            redirectTo={redirectTo}
            isSaving={isSaving}
        >
            {email && (
                <EmailEditorContent
                    email={email}
                    onEmailChange={handleEmailChange}
                />
            )}
        </EmailEditorLayout>
    );
}
