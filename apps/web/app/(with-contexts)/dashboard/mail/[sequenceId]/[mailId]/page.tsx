"use client";

import { EmailEditor } from "@courselit/email-editor";
import "@courselit/email-editor/styles.css";
import {
    BROADCASTS,
    PAGE_HEADER_EDIT_MAIL,
    TOAST_TITLE_ERROR,
} from "@ui-config/strings";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button2 } from "@courselit/components-library";
import { LogOut } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Email as EmailContent } from "@courselit/email-editor";
import { useSequence } from "@/hooks/use-sequence";
import { Email } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { useContext } from "react";
import { AddressContext } from "@components/contexts";
import { useToast } from "@courselit/components-library";
import { debounce } from "@courselit/utils";

const breadcrumbs = [
    { label: BROADCASTS, href: "/dashboard/mails?tab=Broadcasts" },
    { label: PAGE_HEADER_EDIT_MAIL, href: "#" },
];

export default function EmailEditorPage({
    params,
}: {
    params: {
        sequenceId: string;
        mailId: string;
    };
}) {
    const [email, setEmail] = useState<Email | null>(null);
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
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

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

                setEmail(targetEmail);
                isInitialLoad.current = false;
            }
        }
    }, [sequence, params.mailId]);

    // Debounced save function
    const debouncedSave = useCallback(
        debounce(async (emailContent: EmailContent) => {
            if (!email || isInitialLoad.current) {
                return;
            }

            // Check if content has actually changed
            const hasChanged =
                JSON.stringify(emailContent) !==
                JSON.stringify(initialValues.current.content);

            if (!hasChanged) {
                return;
            }

            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Set new timeout for debounced save
            saveTimeoutRef.current = setTimeout(async () => {
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
            }, 1000); // 1 second debounce
        }, 1000),
        [email, params.sequenceId, params.mailId, fetch, toast],
    );

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleEmailChange = (newEmailContent: EmailContent) => {
        if (email) {
            const updatedEmail = {
                ...email,
                content: newEmailContent,
            };
            setEmail(updatedEmail);
            debouncedSave(newEmailContent);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen bg-muted/10">
                <div className="fixed w-full border-b z-10 bg-background">
                    <header className="flex w-full h-14 px-6 justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-[220px]">
                                <div className="h-10 flex items-center px-3 border rounded-md text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            </div>
                        </div>
                    </header>
                </div>
                <div className="flex w-full h-[calc(100vh-56px)] mt-14 gap-4 p-4 bg-muted/10">
                    <div className="w-full rounded-xl border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
                        <div className="flex items-center justify-center h-full">
                            <div className="text-muted-foreground">
                                Loading email editor...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-screen bg-muted/10">
                <div className="fixed w-full border-b z-10 bg-background">
                    <header className="flex w-full h-14 px-6 justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-[220px]">
                                <div className="h-10 flex items-center px-3 border rounded-md text-sm text-red-500">
                                    Error: {error}
                                </div>
                            </div>
                        </div>
                    </header>
                </div>
                <div className="flex w-full h-[calc(100vh-56px)] mt-14 gap-4 p-4 bg-muted/10">
                    <div className="w-full rounded-xl border bg-background/98 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
                        <div className="flex items-center justify-center h-full">
                            <div className="text-red-500">
                                Failed to load sequence: {error}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-muted/10">
            <div className="fixed w-full border-b z-10 bg-background">
                <header className="flex w-full h-14 px-6 justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-[220px]">
                            <div className="h-10 flex items-center px-3 border rounded-md text-sm text-muted-foreground">
                                {email?.subject || "Untitled Email"}
                                {isSaving && " (Saving...)"}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={
                                            redirectTo ||
                                            "/dashboard/mails?tab=Broadcasts"
                                        }
                                    >
                                        <Button2 variant="outline" size="icon">
                                            <LogOut className="h-4 w-4" />
                                        </Button2>
                                    </Link>
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
                    {email?.content && (
                        <EmailEditor
                            email={email.content}
                            onChange={handleEmailChange}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
