"use client";

import { EmailEditor } from "@courselit/email-editor";
import "@courselit/email-editor/styles.css";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { useState, useEffect, useCallback, useRef, useMemo, use } from "react";
import type { Email as EmailContent } from "@courselit/email-editor";
import { useSequence } from "@/hooks/use-sequence";
import { useToast } from "@courselit/components-library";
import { debounce } from "@courselit/utils";
import { EmailEditorLayout } from "@components/admin/mails/editor-layout";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";

export default function EmailEditorPage(props: {
    params: Promise<{
        sequenceId: string;
        mailId: string;
    }>;
}) {
    const params = use(props.params);
    const [email, setEmail] = useState<EmailContent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const { sequence, loading, error, loadSequence } = useSequence();

    // Refs to track initial values and prevent saving during load
    const initialValues = useRef({
        content: null as EmailContent | null,
    });
    const isInitialLoad = useRef(true);

    const fetch = useGraphQLFetch();

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

            const fetcher = fetch
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
            <EmailEditorLayout title="Loading..." isSaving={isSaving}>
                <LoadingState />
            </EmailEditorLayout>
        );
    }

    if (error) {
        return (
            <EmailEditorLayout title={`Error: ${error}`} isSaving={isSaving}>
                <ErrorState error={error} />
            </EmailEditorLayout>
        );
    }

    return (
        <EmailEditorLayout title={title} isSaving={isSaving}>
            {email && (
                <EmailEditor email={email} onChange={handleEmailChange} />
            )}
        </EmailEditorLayout>
    );
}

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
