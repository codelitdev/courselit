import {
    Address,
    AppMessage,
    Sequence,
} from "@courselit/common-models";
import {
    Breadcrumbs,
    Form,
    FormField,
    Link,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { renderEmailContent, FetchBuilder } from "@courselit/utils";
import {
    COMPOSE_SEQUENCE_EDIT_DELAY,
    MAIL_PREVIEW_TITLE,
    MAIL_SUBJECT_PLACEHOLDER,
    PAGE_HEADER_ALL_MAILS,
    PAGE_HEADER_EDIT_MAIL,
    PAGE_HEADER_EDIT_SEQUENCE,
} from "@ui-config/strings";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { connect } from "react-redux";

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
    const [delay, setDelay] = useState<number>(null);
    const [subject, setSubject] = useState<string>(null);
    const [preview, setPreview] = useState<string>(null);
    const [content, setContent] = useState<string>(null);
    const [emailRendered, setEmailRendered] = useState<string>(null);

    const fetch = useMemo(
        () =>
            new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true),
        [address.backend],
    );

    const renderEmail = async () => {
        if (!content) return;
        const emailContent = await renderEmailContent(content, {
            subscriber: {
                email: "USER_EMAIL",
                name: "USER_NAME",
            },
            address: "MAILING_ADDRESS",
            unsubscribe_link: "UNSUBSCRIBE_LINK",
        });
        setEmailRendered(emailContent);
    };

    useEffect(() => {
        renderEmail();
    }, [content]);

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
                    setDelay(email.delayInMillis / 86400000);
                    setSubject(email.subject);
                    setPreview(email.previewText);
                    setContent(email.content);
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
                    {/*
                    <Button onClick={() => createSequence()}>
                        {BTN_NEW_SEQUENCE}
                    </Button>
                    */}
                </div>
            </div>
            <div>
                <Form className="flex flex-col gap-4 mb-8" onSubmit={() => {}}>
                    <FormField
                        type="number"
                        min={0}
                        value={delay}
                        label={COMPOSE_SEQUENCE_EDIT_DELAY}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setDelay(+e.target.value)
                        }
                        endIcon={<span>days</span>}
                    />
                    <FormField
                        value={subject}
                        label={MAIL_SUBJECT_PLACEHOLDER}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setSubject(e.target.value)
                        }
                    />
                    <FormField
                        value={preview}
                        label={MAIL_PREVIEW_TITLE}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setPreview(e.target.value)
                        }
                    />
                    <div className="flex gap-2">
                        <div className="flex flex-col w-1/4">
                            <h3 className="text-lg font-semibold">Variables</h3>
                        </div>
                        <div className="w-1/2">
                            <FormField
                                component="textarea"
                                value={content}
                                label={"Editor"}
                                multiline="true"
                                rows={10}
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
                                className="border border-gray-200 rounded w-full"
                            />
                        </div>
                    </div>
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
