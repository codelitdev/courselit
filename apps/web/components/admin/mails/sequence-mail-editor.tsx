import { Address, AppMessage } from "@courselit/common-models";
import {
    Breadcrumbs,
    Button,
    Form,
    FormField,
    Link,
    Select,
} from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder } from "@courselit/utils";
import {
    BUTTON_SAVE,
    COMPOSE_SEQUENCE_EDIT_DELAY,
    MAIL_PREVIEW_TITLE,
    MAIL_SUBJECT_PLACEHOLDER,
    PAGE_HEADER_ALL_MAILS,
    PAGE_HEADER_EDIT_MAIL,
    PAGE_HEADER_EDIT_SEQUENCE,
} from "@ui-config/strings";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { MailEditorAndPreview } from "./mail-editor-and-preview";

interface SequenceMailEditorProps {
    address: Address;
    sequenceId: string;
    mailId: string;
    loading?: boolean;
    dispatch?: AppDispatch;
    prefix: string;
}

const SequenceMailEditor = ({
    address,
    dispatch,
    sequenceId,
    mailId,
    prefix,
    loading = false,
}: SequenceMailEditorProps) => {
    const [delay, setDelay] = useState<number>(0);
    const [subject, setSubject] = useState<string>("");
    const [previewText, setPreviewText] = useState<string>("");
    const [content, setContent] = useState<string>("");
    const [email, setEmail] = useState(null);
    const [published, setPublished] = useState<"unpublished" | "published">(
        null,
    );

    const fetch = useMemo(
        () =>
            new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true),
        [address.backend],
    );

    const loadSequence = useCallback(async () => {
        const query = `
            query GetSequence($sequenceId: String!) {
                sequence: getSequence(sequenceId: $sequenceId) {
                    sequenceId,
                    title,
                    emails {
                        emailId,
                        subject,
                        delayInMillis,
                        published,
                        content,
                        previewText,
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

        const fetcher = fetch
            .setPayload({ query, variables: { sequenceId } })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                const email = sequence.emails.find((e) => e.emailId === mailId);
                if (email) {
                    setEmail(email);
                    setDelay(email.delayInMillis / 86400000);
                    setSubject(email.subject);
                    setPreviewText(email.previewText || "");
                    setContent(email.content);
                    setPublished(email.published ? "published" : "unpublished");
                }
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    }, [dispatch, fetch, sequenceId]);

    useEffect(() => {
        loadSequence();
    }, [loadSequence]);

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
                $previewText: String
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
                    previewText: $previewText
                ) {
                    sequenceId,
                    title,
                    emails {
                        emailId,
                        subject,
                        delayInMillis,
                        previewText,
                        published,
                        content
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

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    sequenceId,
                    emailId: email.emailId,
                    subject,
                    content,
                    delayInMillis: delay * 86400000,
                    published: published === "published",
                    previewText,
                },
            })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                const email = sequence.emails.find((e) => e.emailId === mailId);
                if (email) {
                    setEmail(email);
                    setDelay(email.delayInMillis / 86400000);
                    setSubject(email.subject);
                    setPreviewText(email.previewText || "");
                    setContent(email.content);
                    setPublished(email.published ? "published" : "unpublished");
                }
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    }, [
        dispatch,
        fetch,
        sequenceId,
        email,
        subject,
        content,
        delay,
        published,
        previewText,
    ]);

    return (
        <div className="flex flex-col gap-4">
            {prefix === "/dashboard" && (
                <Breadcrumbs aria-label="breakcrumb">
                    <Link href={`${prefix}/mails?tab=Sequences`}>
                        {PAGE_HEADER_ALL_MAILS}
                    </Link>
                    <Link href={`${prefix}/mails/sequence/${sequenceId}/edit`}>
                        {PAGE_HEADER_EDIT_SEQUENCE}
                    </Link>
                    {PAGE_HEADER_EDIT_MAIL}
                </Breadcrumbs>
            )}
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
                            (subject === email.subject &&
                                content === email.content &&
                                delay === email.delayInMillis / 86400000 &&
                                previewText === (email.previewText || "") &&
                                published ===
                                    (email.published
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
                                ) => setPublished(value)}
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
                    <FormField
                        value={previewText}
                        label={MAIL_PREVIEW_TITLE}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setPreviewText(e.target.value)
                        }
                        tooltip="This text will be shown in the email client before opening the email."
                    />
                    <MailEditorAndPreview
                        content={content}
                        onChange={setContent}
                    />
                </Form>
            </div>
        </div>
    );
};

export default SequenceMailEditor;
