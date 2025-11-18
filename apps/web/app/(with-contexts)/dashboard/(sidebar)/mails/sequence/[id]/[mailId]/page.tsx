"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { PAGE_HEADER_EDIT_SEQUENCE, SEQUENCES } from "@ui-config/strings";
import {
    Button,
    Form,
    FormField,
    Select,
    useToast,
} from "@courselit/components-library";
import {
    BUTTON_SAVE,
    COMPOSE_SEQUENCE_EDIT_DELAY,
    TOAST_TITLE_ERROR,
    MAIL_SUBJECT_PLACEHOLDER,
    PAGE_HEADER_EDIT_MAIL,
} from "@ui-config/strings";
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useState,
    use,
    startTransition,
} from "react";
import { Email as EmailContent } from "@courselit/email-editor";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { Email } from "@courselit/common-models";
import EmailViewer from "@components/admin/mails/email-viewer";
import { useSequence } from "@/hooks/use-sequence";

export default function Page(props: {
    params: Promise<{
        id: string;
        mailId: string;
    }>;
}) {
    const params = use(props.params);
    const { id: sequenceId, mailId } = params;
    const breadcrumbs = [
        { label: SEQUENCES, href: "/dashboard/mails?tab=Sequences" },
        {
            label: PAGE_HEADER_EDIT_SEQUENCE,
            href: `/dashboard/mails/sequence/${sequenceId}`,
        },
        {
            label: PAGE_HEADER_EDIT_MAIL,
            href: "#",
        },
    ];
    const [delay, setDelay] = useState<number>(0);
    const [subject, setSubject] = useState<string>("");
    const [content, setContent] = useState<EmailContent | null>(null);
    const [email, setEmail] = useState<Email | null>(null);
    const [published, setPublished] = useState<"unpublished" | "published">(
        "unpublished",
    );
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const { sequence, loading, error, loadSequence } = useSequence();

    useEffect(() => {
        loadSequence(sequenceId);
    }, [loadSequence, sequenceId]);

    useEffect(() => {
        if (sequence) {
            const nextEmail = sequence.emails.find(
                (sequenceEmail) => sequenceEmail.emailId === mailId,
            );
            if (nextEmail) {
                startTransition(() => {
                    setEmail(nextEmail);
                    setDelay(nextEmail.delayInMillis / 86400000);
                    setSubject(nextEmail.subject);
                    // setPreviewText(nextEmail.content?.meta?.previewText || "");
                    setContent(nextEmail.content || null);
                    setPublished(
                        nextEmail.published ? "published" : "unpublished",
                    );
                });
            }
        }
    }, [sequence, mailId]);

    const updateMail = useCallback(async () => {
        const query = `
            mutation UpdateMail(
                $sequenceId: String!
                $emailId: String!
                $subject: String
                $content: String
                $delayInMillis: Float
                $templateId: String
                $actionType: SequenceEmailActionType
                $actionData: String
                $published: Boolean
            ) {
                sequence: updateMailInSequence(
                    sequenceId: $sequenceId,
                    emailId: $emailId,
                    subject: $subject,
                    content: $content,
                    delayInMillis: $delayInMillis,
                    templateId: $templateId,
                    actionType: $actionType,
                    actionData: $actionData,
                    published: $published,
                ) {
                    sequenceId,
                    title,
                    emails {
                        emailId,
                        subject,
                        delayInMillis,
                        published,
                        content {
                            content {
                                blockType,
                                settings
                            },
                            style,
                            meta
                        }
                    },
                    trigger {
                        type,
                        data
                    },
                    from {
                        name,
                        email
                    },
                    emailsOrder,
                    status
                }
            }`;

        const emailIdForUpdate = email?.emailId ?? mailId;

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    sequenceId,
                    emailId: emailIdForUpdate,
                    subject,
                    content: JSON.stringify(content),
                    delayInMillis: delay * 86400000,
                    published: published === "published",
                    // previewText,
                },
            })
            .build();

        try {
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                const updatedEmail = sequence.emails.find(
                    (sequenceEmail) => sequenceEmail.emailId === mailId,
                );
                if (updatedEmail) {
                    startTransition(() => {
                        setEmail(updatedEmail);
                        setDelay(updatedEmail.delayInMillis / 86400000);
                        setSubject(updatedEmail.subject);
                        // setPreviewText(updatedEmail.previewText || "");
                        setContent(updatedEmail.content);
                        setPublished(
                            updatedEmail.published
                                ? "published"
                                : "unpublished",
                        );
                    });
                }
            }
        } catch (e: unknown) {
            const errorMessage =
                e instanceof Error ? e.message : "Unknown error occurred";
            toast({
                title: TOAST_TITLE_ERROR,
                description: errorMessage,
                variant: "destructive",
            });
        }
    }, [
        fetch,
        sequenceId,
        email?.emailId,
        mailId,
        subject,
        content,
        delay,
        published,
        toast,
        // previewText,
    ]);

    useEffect(() => {
        if (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error,
                variant: "destructive",
            });
        }
    }, [error, toast]);

    if (loading || !sequence) {
        return null;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-semibold mb-4">
                        {PAGE_HEADER_EDIT_MAIL}
                    </h1>
                    <div className="flex gap-2">
                        <Button
                            onClick={updateMail}
                            disabled={
                                !subject ||
                                !content ||
                                delay < 0 ||
                                (subject === email?.subject &&
                                    content === email?.content &&
                                    delay === email?.delayInMillis / 86400000 &&
                                    // previewText ===
                                    //     (email?.content?.meta?.previewText ||
                                    //         "") &&
                                    published ===
                                        (email?.published
                                            ? "published"
                                            : "unpublished"))
                            }
                        >
                            {BUTTON_SAVE}
                        </Button>
                    </div>
                </div>
                <div>
                    <Form className="flex flex-col gap-4 mb-8">
                        <div className="flex gap-8">
                            <FormField
                                type="number"
                                min={0}
                                value={delay}
                                label={COMPOSE_SEQUENCE_EDIT_DELAY}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setDelay(+e.target.value)
                                }
                                endIcon={<span>days</span>}
                                className="w-1/2"
                                tooltip="The delay in days after which the email will be sent after the last mail."
                            />
                            <div className="w-1/2 self-end">
                                <Select
                                    value={published}
                                    onChange={(
                                        value: "unpublished" | "published",
                                    ) => {
                                        if (value) {
                                            setPublished(value);
                                        }
                                    }}
                                    title="Status"
                                    options={[
                                        {
                                            label: "Published",
                                            value: "published",
                                        },
                                        {
                                            label: "Unpublished",
                                            value: "unpublished",
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                        <FormField
                            value={subject}
                            label={MAIL_SUBJECT_PLACEHOLDER}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                setSubject(e.target.value)
                            }
                        />
                    </Form>
                    <EmailViewer
                        content={content}
                        emailEditorLink={`/dashboard/mail/sequence/${sequenceId}/${mailId}?redirectTo=/dashboard/mails/sequence/${sequenceId}/${mailId}`}
                    />
                </div>
            </div>
        </DashboardContent>
    );
}
