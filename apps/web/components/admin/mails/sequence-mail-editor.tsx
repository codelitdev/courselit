import { Address, AppMessage, Sequence } from "@courselit/common-models";
import {
    Breadcrumbs,
    Button,
    Form,
    FormField,
    Link,
    Select,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
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
import { connect } from "react-redux";
import { MailEditorAndPreview } from "./mail-editor-and-preview";

interface SequenceMailEditorProps {
    address: Address;
    dispatch: AppDispatch;
    sequenceId: string;
    mailId: string;
    loading: boolean;
}

const SequenceMailEditor = ({
    address,
    dispatch,
    sequenceId,
    mailId,
    loading,
}: SequenceMailEditorProps) => {
    const [sequence, setSequence] = useState<Sequence>(null);
    const [delay, setDelay] = useState<number>(0);
    const [subject, setSubject] = useState<string>("");
    const [previewText, setPreviewText] = useState<string>("");
    const [content, setContent] = useState<string>("");
    // const [emailRendered, setEmailRendered] = useState<string>("");
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

    // const renderEmail = async () => {
    //     if (!content) return;
    //     const emailContent = await renderEmailContent(content, {
    //         subscriber: {
    //             email: "USER_EMAIL",
    //             name: "USER_NAME",
    //         },
    //         address: "MAILING_ADDRESS",
    //         unsubscribe_link: "UNSUBSCRIBE_LINK",
    //     });
    //     setEmailRendered(emailContent);
    // };

    // useEffect(() => {
    //     renderEmail();
    // }, [content]);

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
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSequence(sequence);
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
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
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
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSequence(sequence);
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
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
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
            <Breadcrumbs aria-label="breakcrumb">
                <Link href="/dashboard/mails?tab=Sequences">
                    {PAGE_HEADER_ALL_MAILS}
                </Link>
                <Link href={`/dashboard/mails/sequence/${sequenceId}/edit`}>
                    {PAGE_HEADER_EDIT_SEQUENCE}
                </Link>
                {PAGE_HEADER_EDIT_MAIL}
            </Breadcrumbs>
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
                    {/* <div className="flex gap-2">
                        <div className="flex flex-col w-1/5">
                            <h3 className="text-lg font-semibold">Variables</h3>
                            <div className="flex flex-col gap-4 border border-gray-200 rounded w-full h-[360px] p-2">
                                <p className="text-xs text-slate-500">
                                    You can use the following variables in your
                                    content.
                                </p>
                                <p className="text-xs text-slate-500">
                                    These will be replaced with the actual data
                                    while sending emails.
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
                                        A link to unsubscribe from the marketing
                                        emails
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
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setContent(e.target.value)
                                }
                            />
                        </div>
                        <div className="flex flex-col w-1/4">
                            <h3 className="text-lg font-semibold">Preview</h3>
                            <iframe
                                srcDoc={emailRendered}
                                title="Preview"
                                className="border border-gray-200 rounded w-full h-[360px]"
                            />
                        </div>
                    </div> */}
                </Form>
            </div>
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(SequenceMailEditor);
