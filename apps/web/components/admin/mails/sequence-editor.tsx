import {
    Address,
    AppMessage,
    Constants,
    Course,
} from "@courselit/common-models";
import {
    Breadcrumbs,
    Form,
    FormField,
    Link,
    Select,
    Button,
    Menu2,
    MenuItem,
    FormSubmit,
    Skeleton,
} from "@courselit/components-library";
import { Pause } from "@courselit/icons";
import { Play } from "@courselit/icons";
import { Add, MoreVert } from "@courselit/icons";
import { AppDispatch } from "@courselit/state-management";
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
    COMPOSE_SEQUENCE_FROM_PLC,
    DELETE_EMAIL_MENU,
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

interface SequenceEditorProps {
    id: string;
    address: Address;
    dispatch?: AppDispatch;
    loading?: boolean;
    prefix: string;
}

interface TagWithDetails {
    tag: string;
}

const SequenceEditor = ({
    id,
    address,
    dispatch,
    loading = false,
    prefix,
}: SequenceEditorProps) => {
    const [title, setTitle] = useState("");
    const [from, setFrom] = useState("");
    const [fromEmail, setFromEmail] = useState("");
    const [triggerType, setTriggerType] = useState("SUBSCRIBER_ADDED");
    const [triggerData, setTriggerData] = useState("");
    const [emails, setEmails] = useState([]);
    const [sequence, setSequence] = useState(null);
    const [tags, setTags] = useState<TagWithDetails[]>([]);
    const [products, setProducts] = useState<
        Pick<Course, "title" | "courseId">[]
    >([]);
    const [emailsOrder, setEmailsOrder] = useState<string[]>([]);
    const [status, setStatus] = useState(null);

    const onSubmit = async (e: FormEvent, sendLater: boolean = false) => {
        e.preventDefault();

        await updateSequence();
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
                    },
                    emailsOrder,
                    status
                }
            }`;

        const fetcher = fetch
            .setPayload({ query, variables: { sequenceId: id } })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSequence(sequence);
                setTitle(sequence.title);
                setTriggerType(sequence.trigger?.type);
                setTriggerData(sequence.trigger?.data);
                setFrom(sequence.from?.name);
                setFromEmail(sequence.from?.email);
                setEmails(sequence.emails);
                setEmailsOrder(sequence.emailsOrder);
                setStatus(sequence.status);
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
            // setLoaded(true);
        }
    }, [dispatch, fetch, id]);

    useEffect(() => {
        loadSequence();
    }, [loadSequence]);

    useEffect(() => {
        if (
            (triggerType === "TAG_ADDED" || triggerType === "TAG_REMOVED") &&
            tags.length === 0
        ) {
            getTags();
        }
        if (triggerType === "PRODUCT_PURCHASED" && products.length === 0) {
            getProducts();
        }
    }, [triggerType]);

    const getTags = useCallback(async () => {
        const query = `
            query {
                tags: tagsWithDetails {
                    tag,
                    count
                }
            }
        `;
        const fetcher = fetch.setPayload(query).build();
        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err) {
        } finally {
            dispatch && dispatch(networkAction(false));
            // setLoaded(false);
        }
    }, [dispatch, fetch]);

    const getProducts = useCallback(async () => {
        const query = `
            query { courses: getCoursesAsAdmin(
                offset: 1
              ) {
                title,
                courseId,
              }
            }
        `;
        const fetcher = fetch.setPayload(query).build();
        try {
            const response = await fetcher.exec();
            if (response.courses) {
                setProducts([...response.courses]);
            }
        } catch (err: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        }
    }, [dispatch, fetch]);

    const addMailToSequence = useCallback(async () => {
        const query = `
            mutation AddMailToSequence($sequenceId: String!) {
                sequence: addMailToSequence(sequenceId: $sequenceId) {
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
                    },
                    emailsOrder,
                    status
                }
            }`;

        const fetcher = fetch
            .setPayload({ query, variables: { sequenceId: id } })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSequence(sequence);
                setTitle(sequence.title);
                setTriggerType(sequence.trigger?.type);
                setTriggerData(sequence.trigger?.data);
                setFrom(sequence.from?.name);
                setFromEmail(sequence.from?.email);
                setEmails(sequence.emails);
                setEmailsOrder(sequence.emailsOrder);
                setStatus(sequence.status);
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
            // setLoaded(true);
        }
    }, [dispatch, fetch, id]);

    const updateSequence = useCallback(async () => {
        const query = `
            mutation UpdateSequence(
                $sequenceId: String!
                $title: String!
                $fromName: String!
                $triggerType: SequenceTriggerType!
                $triggerData: String
                $emailsOrder: [String!]
            ) {
                sequence: updateSequence(
                    sequenceId: $sequenceId
                    title: $title,
                    fromName: $fromName,
                    triggerType: $triggerType,
                    triggerData: $triggerData,
                    emailsOrder: $emailsOrder
                ) {
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
                    },
                    emailsOrder,
                    status
                }
            }`;

        const fetcher = fetch
            .setPayload({
                query,
                variables: {
                    sequenceId: id,
                    title,
                    fromName: from,
                    fromEmail,
                    triggerType,
                    triggerData,
                    emailsOrder,
                },
            })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSequence(sequence);
                setTitle(sequence.title);
                setTriggerType(sequence.trigger?.type);
                setTriggerData(sequence.trigger?.data);
                setFrom(sequence.from?.name);
                setFromEmail(sequence.from?.email);
                setEmails(sequence.emails);
                setEmailsOrder(sequence.emailsOrder);
                setStatus(sequence.status);
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
            // setLoaded(true);
        }
    }, [
        dispatch,
        fetch,
        id,
        title,
        from,
        fromEmail,
        triggerType,
        triggerData,
        emailsOrder,
    ]);

    const startSequence = useCallback(
        async (action: "start" | "pause") => {
            const query =
                action === "start"
                    ? `
            mutation StartSequence(
                $sequenceId: String!
            ) {
                sequence: startSequence(
                    sequenceId: $sequenceId
                ) {
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
                    },
                    emailsOrder,
                    status
                }
            }`
                    : `
            mutation PauseSequence(
                $sequenceId: String!
            ) {
                sequence: pauseSequence(
                    sequenceId: $sequenceId
                ) {
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
                    },
                    emailsOrder,
                    status
                }
            }`;

            const fetcher = fetch
                .setPayload({
                    query,
                    variables: {
                        sequenceId: id,
                    },
                })
                .build();

            try {
                dispatch && dispatch(networkAction(true));
                const response = await fetcher.exec();
                if (response.sequence) {
                    const { sequence } = response;
                    setSequence(sequence);
                    setTitle(sequence.title);
                    setTriggerType(sequence.trigger?.type);
                    setTriggerData(sequence.trigger?.data);
                    setFrom(sequence.from?.name);
                    setFromEmail(sequence.from?.email);
                    setEmails(sequence.emails);
                    setEmailsOrder(sequence.emailsOrder);
                    setStatus(sequence.status);
                }
            } catch (e: any) {
                dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
            } finally {
                dispatch && dispatch(networkAction(false));
                // setLoaded(true);
            }
        },
        [dispatch, fetch, id],
    );

    const deleteMail = useCallback(
        async ({ emailId }: { emailId: string }) => {
            const query = `
        mutation DeleteMailFromSequence(
            $sequenceId: String!
            $emailId: String!
        ) {
            sequence: deleteMailFromSequence(
                sequenceId: $sequenceId,
                emailId: $emailId
            ) {
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
                },
                emailsOrder,
                status
            }
        }`;

            const fetcher = fetch
                .setPayload({
                    query,
                    variables: {
                        sequenceId: id,
                        emailId,
                    },
                })
                .build();

            try {
                dispatch && dispatch(networkAction(true));
                const response = await fetcher.exec();
                if (response.sequence) {
                    const { sequence } = response;
                    setSequence(sequence);
                    setTitle(sequence.title);
                    setTriggerType(sequence.trigger?.type);
                    setTriggerData(sequence.trigger?.data);
                    setFrom(sequence.from?.name);
                    setFromEmail(sequence.from?.email);
                    setEmails(sequence.emails);
                    setEmailsOrder(sequence.emailsOrder);
                    setStatus(sequence.status);
                }
            } catch (e: any) {
                dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
            } finally {
                dispatch && dispatch(networkAction(false));
                // setLoaded(true);
            }
        },
        [dispatch, fetch, id],
    );

    return (
        <div className="flex flex-col gap-4">
            {prefix === "/dashboard" && (
                <Breadcrumbs aria-label="breakcrumb">
                    <Link href={`${prefix}/mails?tab=Sequences`}>
                        {PAGE_HEADER_ALL_MAILS}
                    </Link>
                    {PAGE_HEADER_EDIT_SEQUENCE}
                </Breadcrumbs>
            )}
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-4xl font-semibold mb-4">
                    {PAGE_HEADER_EDIT_SEQUENCE}
                </h1>
                <div className="flex gap-2">
                    {[
                        Constants.sequenceStatus[0],
                        Constants.sequenceStatus[2],
                    ].includes(status) && (
                        <Button
                            disabled={loading}
                            onClick={() => startSequence("start")}
                        >
                            <Play /> Start
                        </Button>
                    )}
                    {status === Constants.sequenceStatus[1] && (
                        <Button
                            variant="soft"
                            disabled={loading}
                            onClick={() => startSequence("pause")}
                        >
                            <Pause /> Pause
                        </Button>
                    )}
                </div>
            </div>
            {!sequence && (
                <div className="flex flex-col gap-4 mb-8">
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-6 w-full" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-6 w-full" />
                    </div>
                </div>
            )}
            {sequence && (
                <Form className="flex flex-col gap-4 mb-8" onSubmit={onSubmit}>
                    <FormField
                        value={title}
                        label={COMPOSE_SEQUENCE_FORM_TITLE}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setTitle(e.target.value)
                        }
                    />
                    <FormField
                        value={from}
                        label={COMPOSE_SEQUENCE_FORM_FROM}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setFrom(e.target.value)
                        }
                        placeholder={COMPOSE_SEQUENCE_FROM_PLC}
                    />
                    {/* <div className="flex gap-2">
                    <FormField
                        value={from}
                        label={COMPOSE_SEQUENCE_FORM_FROM}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setFrom(e.target.value)
                        }
                    />
                    <div className="w-1/2 self-end">
                        <Select
                            value={fromEmail}
                            onChange={(value: string) => setFromEmail(value)}
                            title=""
                            options={[
                                {
                                    label: "email@mg.courselit.app",
                                    value: "email@mg.courselit.app",
                                },
                                {
                                    label: "Use your custom domain (soon)",
                                    value: "Custom",
                                    disabled: true
                                }
                            ]}
                        />
                    </div>
                </div> */}
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
                    {triggerType !== "SUBSCRIBER_ADDED" && (
                        <Select
                            value={triggerData}
                            onChange={(value: string) => setTriggerData(value)}
                            title={COMPOSE_SEQUENCE_ENTRANCE_CONDITION_DATA}
                            options={
                                triggerType === "TAG_ADDED" ||
                                triggerType === "TAG_REMOVED"
                                    ? tags.map((tag) => ({
                                          label: tag.tag,
                                          value: tag.tag,
                                      }))
                                    : triggerType === "PRODUCT_PURCHASED"
                                      ? products.map((product) => ({
                                            label: product.title,
                                            value: product.courseId,
                                        }))
                                      : []
                            }
                        />
                    )}
                    <div className="flex justify-between">
                        <FormSubmit
                            text="Save"
                            loading={loading}
                            disabled={
                                loading ||
                                !title ||
                                !from ||
                                // !fromEmail ||
                                triggerType === "" ||
                                (triggerType !== "SUBSCRIBER_ADDED" &&
                                    !triggerData) ||
                                (sequence.title === title &&
                                    sequence.from?.name === from &&
                                    sequence.from?.email === fromEmail &&
                                    sequence.trigger?.type === triggerType &&
                                    sequence.trigger?.data === triggerData)
                            }
                        />
                    </div>
                </Form>
            )}
            <div className="flex flex-col gap-2">
                <h2 className="font-semibold">Emails</h2>
                <div className="flex flex-col gap-2 mb-2">
                    {!sequence && (
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2 items-center">
                                <Skeleton className="h-8 w-[100px]" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-8" />
                            </div>
                            <div className="flex gap-2 items-center">
                                <Skeleton className="h-8 w-[100px]" />
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-8" />
                            </div>
                        </div>
                    )}
                    {sequence &&
                        emails.map((email) => (
                            <div
                                key={email.emailId}
                                className="flex gap-2 items-center"
                            >
                                <div className="bg-slate-100 rounded px-3 py-1 text-slate-600 font-semibold text-sm">
                                    {Math.round(
                                        email.delayInMillis /
                                            (1000 * 60 * 60 * 24),
                                    )}{" "}
                                    day
                                </div>
                                <Link
                                    href={`${prefix}/mails/sequence/${id}/${
                                        email.emailId
                                    }${prefix === "/dashboard" ? "/edit" : ""}`}
                                    style={{
                                        flex: "1",
                                    }}
                                >
                                    <div
                                        className={`hover:bg-slate-100 rounded px-3 py-1 text-slate-600 ${
                                            email.published
                                                ? ""
                                                : "text-slate-400"
                                        }`}
                                    >
                                        {email.subject}
                                    </div>
                                </Link>
                                <Menu2 icon={<MoreVert />} variant="soft">
                                    <MenuItem
                                        component="dialog"
                                        title={DELETE_EMAIL_MENU}
                                        triggerChildren={DELETE_EMAIL_MENU}
                                        onClick={() =>
                                            deleteMail({
                                                emailId: email.emailId,
                                            })
                                        }
                                    />
                                </Menu2>
                            </div>
                        ))}
                </div>
                {!sequence && <Skeleton className="h-8 w-[100px]" />}
                {sequence && (
                    <div>
                        <Button
                            variant="soft"
                            onClick={addMailToSequence}
                            disabled={loading}
                        >
                            <Add />
                            New mail
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SequenceEditor;
