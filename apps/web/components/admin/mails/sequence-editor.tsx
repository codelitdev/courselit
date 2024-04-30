import {
    Address,
    AppMessage,
    Constants,
} from "@courselit/common-models";
import {
    Breadcrumbs,
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
    COMPOSE_SEQUENCE_ENTRANCE_CONDITION,
    COMPOSE_SEQUENCE_ENTRANCE_CONDITION_DATA,
    COMPOSE_SEQUENCE_FORM_FROM,
    COMPOSE_SEQUENCE_FORM_TITLE,
    PAGE_HEADER_ALL_MAILS,
    PAGE_HEADER_EDIT_SEQUENCE,
} from "@ui-config/strings";
import {
    ChangeEvent,
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { connect } from "react-redux";

interface SequenceEditorProps {
    id: string;
    address: Address;
    dispatch: AppDispatch;
}

const SequenceEditor = ({ id, address, dispatch }: SequenceEditorProps) => {
    const [title, setTitle] = useState("");
    const [from, setFrom] = useState("");
    const [fromEmail, setFromEmail] = useState("email@mg.courselit.app");
    const [triggerType, setTriggerType] = useState("SUBSCRIBER_ADDED");
    const [triggerData, setTriggerData] = useState("");
    const [triggerDataOptions, setTriggerDataOptions] = useState([]);
    const [emails, setEmails] = useState([]);
    const [loaded, setLoaded] = useState(false);

    const onSubmit = async (e: FormEvent, sendLater: boolean = false) => {
        e.preventDefault();
    };

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
                        published
                    },
                    trigger {
                        type,
                        data
                    },
                    from {
                        name,
                        email
                    }
                }
            }`;

        const fetcher = fetch
            .setPayload({ query, variables: { sequenceId: id } })
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setTitle(sequence.title);
                setTriggerType(sequence.trigger?.type);
                setTriggerData(sequence.trigger?.data);
                setFrom(sequence.from?.name);
                setFromEmail(sequence.from?.email);
                setEmails(sequence.emails);
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
            setLoaded(true);
        }
    }, [dispatch, fetch, id]);

    useEffect(() => {
        loadSequence();
    }, [loadSequence]);

    return (
        <div className="flex flex-col gap-4">
            <Breadcrumbs aria-label="breakcrumb">
                <Link href="/dashboard/mails">{PAGE_HEADER_ALL_MAILS}</Link>
                {PAGE_HEADER_EDIT_SEQUENCE}
            </Breadcrumbs>
            <h1 className="text-4xl font-semibold mb-4">
                {PAGE_HEADER_EDIT_SEQUENCE}
            </h1>
            <Form className="flex flex-col gap-4 mb-8" onSubmit={onSubmit}>
                <FormField
                    value={title}
                    label={COMPOSE_SEQUENCE_FORM_TITLE}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setTitle(e.target.value)
                    }
                />
                <div className="flex gap-2">
                    <FormField
                        value={from}
                        label={COMPOSE_SEQUENCE_FORM_FROM}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setFrom(e.target.value)
                        }
                        className="w-1/2"
                    />
                    <div className="w-1/2 self-end">
                        <Select
                            value={fromEmail}
                            onChange={() => {}}
                            title=""
                            options={[
                                {
                                    label: "email@mg.courselit.app",
                                    value: "email@mg.courselit.app",
                                },
                            ]}
                        />
                    </div>
                </div>
                <Select
                    value={triggerType}
                    onChange={(value: string) => setTriggerType(value)}
                    title={COMPOSE_SEQUENCE_ENTRANCE_CONDITION}
                    options={[
                        {
                            label: "Tag added",
                            value: "TAG_ADDED",
                        },
                        {
                            label: "Tag removed",
                            value: "TAG_REMOVED",
                        },
                        {
                            label: "Product purchased",
                            value: "PRODUCT_PURCHASED",
                        },
                        {
                            label: "Subscriber added",
                            value: "SUBSCRIBER_ADDED",
                        },
                    ]}
                />
                {triggerType !== Constants.eventTypes[3] && (
                    <Select
                        value={triggerData}
                        onChange={(value: string) => setTriggerData(value)}
                        title={COMPOSE_SEQUENCE_ENTRANCE_CONDITION_DATA}
                        options={triggerDataOptions}
                    />
                )}
            </Form>
            <div>
                <h2 className="font-semibold">Emails</h2>
                {emails.map((email) => (
                    <div key={email.emailId} className="flex gap-4">
                        {email.subject}
                    </div>
                ))}
            </div>
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(SequenceEditor);
