import {
    Address,
    Community,
    Constants,
    Course,
} from "@courselit/common-models";
import {
    Form,
    FormField,
    Link,
    Select,
    Menu2,
    MenuItem,
    FormSubmit,
    Skeleton,
    useToast,
    Badge,
} from "@courselit/components-library";
import { Pause } from "@courselit/icons";
import { Play } from "@courselit/icons";
import { Add, MoreVert } from "@courselit/icons";
import { AppDispatch } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import {
    COMPOSE_SEQUENCE_ENTRANCE_CONDITION,
    COMPOSE_SEQUENCE_ENTRANCE_CONDITION_DATA,
    COMPOSE_SEQUENCE_FORM_FROM,
    COMPOSE_SEQUENCE_FORM_TITLE,
    COMPOSE_SEQUENCE_FROM_PLC,
    DELETE_EMAIL_MENU,
    TOAST_TITLE_ERROR,
    PAGE_HEADER_EDIT_SEQUENCE,
    SEQUENCE_UNPUBLISHED_WARNING,
} from "@ui-config/strings";
import {
    ChangeEvent,
    FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Button } from "@components/ui/button";

interface SequenceEditorProps {
    id: string;
    address: Address;
    dispatch?: AppDispatch;
    loading?: boolean;
}

interface TagWithDetails {
    tag: string;
}

const SequenceEditor = ({
    id,
    address,
    loading = false,
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
    const [communities, setCommunities] = useState<
        Pick<Community, "communityId" | "name">[]
    >([]);
    const [emailsOrder, setEmailsOrder] = useState<string[]>([]);
    const [status, setStatus] = useState(null);
    const { toast } = useToast();

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
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        }
    }, [fetch, id]);

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
        if (
            triggerType === "COMMUNITY_JOINED" ||
            (triggerType === "COMMUNITY_LEFT" && communities.length === 0)
        ) {
            getCommunities();
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
            const response = await fetcher.exec();
            if (response.tags) {
                setTags(response.tags);
            }
        } catch (err) {}
    }, [fetch]);

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
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    }, [fetch]);

    const getCommunities = useCallback(async () => {
        const query = `
            query {
                communities: getCommunities(page: 1, limit: 1000000) {
                    communityId,
                    name    
                }
            }
        `;
        const fetcher = fetch.setPayload(query).build();
        try {
            const response = await fetcher.exec();
            if (response.communities) {
                setCommunities([...response.communities]);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    }, [, fetch]);

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
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        }
    }, [fetch, id]);

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
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        }
    }, [
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
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: e.message,
                    variant: "destructive",
                });
            }
        },
        [fetch, id],
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
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: e.message,
                    variant: "destructive",
                });
            }
        },
        [fetch, id],
    );

    return (
        <div className="flex flex-col gap-4">
            {[
                Constants.sequenceStatus[0],
                Constants.sequenceStatus[2],
            ].includes(status) && (
                <div className="bg-red-400 p-2 mb-4 text-sm text-white rounded-md">
                    {SEQUENCE_UNPUBLISHED_WARNING}{" "}
                </div>
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
                            variant="secondary"
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
                            {
                                label: "Community joined",
                                value: "COMMUNITY_JOINED",
                            },
                            {
                                label: "Community left",
                                value: "COMMUNITY_LEFT",
                            },
                        ]}
                    />
                    {triggerType !== "SUBSCRIBER_ADDED" && (
                        <Select
                            value={triggerData}
                            onChange={(value: string) => setTriggerData(value)}
                            title={COMPOSE_SEQUENCE_ENTRANCE_CONDITION_DATA}
                            options={(() => {
                                switch (triggerType) {
                                    case "TAG_ADDED":
                                    case "TAG_REMOVED":
                                        return tags.map((tag) => ({
                                            label: tag.tag,
                                            value: tag.tag,
                                        }));
                                    case "PRODUCT_PURCHASED":
                                        return products.map((product) => ({
                                            label: product.title,
                                            value: product.courseId,
                                        }));
                                    case "COMMUNITY_JOINED":
                                    case "COMMUNITY_LEFT":
                                        return communities.map((community) => ({
                                            label: community.name,
                                            value: community.communityId,
                                        }));
                                    default:
                                        return [];
                                }
                            })()}
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
                                <Badge variant="secondary">
                                    {Math.round(
                                        email.delayInMillis /
                                            (1000 * 60 * 60 * 24),
                                    )}{" "}
                                    day
                                </Badge>
                                <Link
                                    href={`/dashboard/mails/sequence/${id}/${
                                        email.emailId
                                    }`}
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
                            variant="outline"
                            onClick={addMailToSequence}
                            disabled={loading}
                            size="sm"
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
