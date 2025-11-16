"use client";

import { EmailEditor } from "@courselit/email-editor";
import "@courselit/email-editor/styles.css";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Email as EmailContent } from "@courselit/email-editor";
import { useToast } from "@courselit/components-library";
import { debounce } from "@courselit/utils";
import { EmailEditorLayout } from "@components/admin/mails/editor-layout";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { EmailTemplate } from "@courselit/common-models";

export default function EmailTemplateEditorPage({
    params,
}: {
    params: {
        id: string;
    };
}) {
    const [email, setEmail] = useState<EmailContent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const [template, setTemplate] = useState<EmailTemplate | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialValues = useRef({
        content: null as EmailContent | null,
    });
    const isInitialLoad = useRef(true);

    const fetch = useGraphQLFetch();

    const loadTemplate = useCallback(async () => {
        setLoading(true);
        const query = `
      query GetEmailTemplate($templateId: String!) {
        template: getEmailTemplate(templateId: $templateId) {
          templateId
          title
          content {
            content {
              blockType
              settings
            }
            style
            meta
          }
        }
      }
    `;
        try {
            const response = await fetch
                .setPayload({
                    query,
                    variables: {
                        templateId: params.id,
                    },
                })
                .build()
                .exec();
            if (response.template) {
                setTemplate(response.template);
                initialValues.current = {
                    content: response.template.content,
                };
                setEmail(response.template.content);
                isInitialLoad.current = false;
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [params.id, fetch]);

    useEffect(() => {
        loadTemplate();
    }, [loadTemplate]);

    const saveEmail = useCallback(
        async (emailContent: EmailContent) => {
            const hasChanged =
                JSON.stringify(emailContent) !==
                JSON.stringify(initialValues.current.content);

            if (!hasChanged) {
                return;
            }

            setIsSaving(true);

            const mutation = `
        mutation UpdateEmailTemplate(
            $templateId: String!,
            $content: String,
        ) {
            template: updateEmailTemplate(
                templateId: $templateId,
                content: $content,
            ) {
                templateId
                title
                content {
                    content {
                        blockType
                        settings
                    }
                    style
                    meta
                }
            }
        }`;

            const fetcher = fetch
                .setPayload({
                    query: mutation,
                    variables: {
                        templateId: params.id,
                        content: JSON.stringify(emailContent),
                    },
                })
                .build();

            try {
                await fetcher.exec();

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
        [params.id, fetch, toast],
    );

    const debouncedSave = useMemo(() => debounce(saveEmail, 1000), [saveEmail]);

    const handleEmailChange = (newEmailContent: EmailContent) => {
        debouncedSave(newEmailContent);
    };

    const title = template?.title || "Untitled Template";

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
        <div className="text-muted-foreground">Loading template editor...</div>
    </div>
);

const ErrorState = ({ error }: { error: string }) => (
    <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Failed to load template: {error}</div>
    </div>
);
