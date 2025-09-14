"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext } from "@components/contexts";
import {
    DELETE_EMAIL_DIALOG_HEADER,
    PAGE_HEADER_EDIT_SEQUENCE,
    SEQUENCES,
    TOAST_SEQUENCE_SAVED,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useContext, useState, useEffect, useCallback } from "react";
import { Tabbs, useToast } from "@courselit/components-library";
import EmailAnalytics from "@components/admin/mails/email-analytics";
import { useSequence } from "@/hooks/use-sequence";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { truncate } from "@courselit/utils";
import { Button } from "@components/ui/button";
import { Play, Pause, Add, MoreVert } from "@courselit/icons";
import {
    Form,
    FormField,
    Link,
    Select,
    Menu2,
    MenuItem,
    FormSubmit,
    Badge,
} from "@courselit/components-library";
import { Community, Course } from "@courselit/common-models";
import {
    COMPOSE_SEQUENCE_ENTRANCE_CONDITION,
    COMPOSE_SEQUENCE_ENTRANCE_CONDITION_DATA,
    COMPOSE_SEQUENCE_FORM_FROM,
    COMPOSE_SEQUENCE_FORM_TITLE,
    COMPOSE_SEQUENCE_FROM_PLC,
    DELETE_EMAIL_MENU,
    SEQUENCE_UNPUBLISHED_WARNING,
} from "@ui-config/strings";
import { ChangeEvent, FormEvent } from "react";

const breadcrumbs = [
    { label: SEQUENCES, href: "/dashboard/mails?tab=Sequences" },
    { label: PAGE_HEADER_EDIT_SEQUENCE, href: "#" },
];

interface TagWithDetails {
    tag: string;
}

export default function Page({
    params,
}: {
    params: {
        id: string;
    };
}) {
    const address = useContext(AddressContext);
    const { id } = params;
    const { sequence, loading, loadSequence } = useSequence();
    const [activeTab, setActiveTab] = useState("Compose");
    const [buttonLoading, setButtonLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [from, setFrom] = useState("");
    const [fromEmail, setFromEmail] = useState("");
    const [triggerType, setTriggerType] = useState("SUBSCRIBER_ADDED");
    const [triggerData, setTriggerData] = useState<string | null>(null);
    const [emails, setEmails] = useState<any[]>([]);
    const [tags, setTags] = useState<TagWithDetails[]>([]);
    const [products, setProducts] = useState<
        Pick<Course, "title" | "courseId">[]
    >([]);
    const [communities, setCommunities] = useState<
        Pick<Community, "communityId" | "name">[]
    >([]);
    const [emailsOrder, setEmailsOrder] = useState<string[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const { toast } = useToast();
    const fetch = useGraphQLFetch();

    // Load sequence on mount
    useEffect(() => {
        loadSequence(id);
    }, [loadSequence, id]);

    // Update local state when sequence data is loaded
    useEffect(() => {
        if (sequence) {
            setTitle(sequence.title || "");
            setFrom(sequence.from?.name || "");
            setFromEmail(sequence.from?.email || "");
            setTriggerType(sequence.trigger?.type);
            setTriggerData(sequence.trigger?.data || null);
            setEmails(sequence.emails || []);
            setEmailsOrder(sequence.emailsOrder || []);
            setStatus(sequence.status);
        }
    }, [sequence]);

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
    }, [fetch, toast]);

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
    }, [fetch, toast]);

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

    const addMailToSequence = useCallback(async () => {
        const query = `
            mutation AddMailToSequence($sequenceId: String!) {
                sequence: addMailToSequence(sequenceId: $sequenceId) {
                    sequenceId,
                }
            }`;

        const fetcher = fetch
            .setPayload({ query, variables: { sequenceId: id } })
            .build();

        try {
            const response = await fetcher.exec();
            if (response.sequence) {
                await loadSequence(id);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: "New email added to sequence",
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        }
    }, [fetch, id, loadSequence, toast]);

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
                // Reload sequence data after action
                await loadSequence(id);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: TOAST_SEQUENCE_SAVED,
                });
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
        loadSequence,
        toast,
    ]);

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
                    await loadSequence(id);
                }
            } catch (e: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: e.message,
                    variant: "destructive",
                });
            }
        },
        [fetch, id, loadSequence, toast],
    );

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await updateSequence();
    };

    const startSequence = useCallback(
        async (action: "start" | "pause") => {
            setButtonLoading(true);
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
                    await loadSequence(id);
                }
            } catch (e: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: e.message,
                    variant: "destructive",
                });
            } finally {
                setButtonLoading(false);
            }
        },
        [fetch, id, loadSequence, toast],
    );

    if (loading || !sequence) {
        return null;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            {status && (status === "draft" || status === "paused") && (
                <div className="bg-red-400 p-2 mb-4 text-sm text-white rounded-md">
                    {SEQUENCE_UNPUBLISHED_WARNING}{" "}
                </div>
            )}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl font-semibold">
                    {truncate(title || PAGE_HEADER_EDIT_SEQUENCE, 50)}
                </h1>
                <div className="flex gap-2">
                    {(sequence.status === "draft" ||
                        sequence.status === "paused") && (
                        <Button
                            disabled={buttonLoading}
                            onClick={() => startSequence("start")}
                        >
                            <Play /> Start
                        </Button>
                    )}
                    {sequence.status === "active" && (
                        <Button
                            variant="secondary"
                            disabled={buttonLoading}
                            onClick={() => startSequence("pause")}
                        >
                            <Pause /> Pause
                        </Button>
                    )}
                </div>
            </div>
            <Tabbs
                items={["Compose", "Analytics"]}
                value={activeTab}
                onChange={setActiveTab}
            >
                <div className="mt-4">
                    <div className="flex flex-col gap-4">
                        <Form
                            className="flex flex-col gap-4 mb-8"
                            onSubmit={onSubmit}
                        >
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
                            <Select
                                value={triggerType}
                                onChange={(value: string) => {
                                    if (value && value !== triggerType) {
                                        setTriggerType(value);
                                    }
                                }}
                                title={COMPOSE_SEQUENCE_ENTRANCE_CONDITION}
                                options={[
                                    // {
                                    //     label: "Tag added",
                                    //     value: "TAG_ADDED",
                                    // },
                                    // {
                                    //     label: "Tag removed",
                                    //     value: "TAG_REMOVED",
                                    // },
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
                                    value={triggerData || ""}
                                    onChange={(value: string) =>
                                        setTriggerData(value)
                                    }
                                    title={
                                        COMPOSE_SEQUENCE_ENTRANCE_CONDITION_DATA
                                    }
                                    options={(() => {
                                        switch (triggerType) {
                                            case "TAG_ADDED":
                                            case "TAG_REMOVED":
                                                return tags.map((tag) => ({
                                                    label: tag.tag,
                                                    value: tag.tag,
                                                }));
                                            case "PRODUCT_PURCHASED":
                                                return products.map(
                                                    (product) => ({
                                                        label: product.title,
                                                        value: product.courseId,
                                                    }),
                                                );
                                            case "COMMUNITY_JOINED":
                                            case "COMMUNITY_LEFT":
                                                return communities.map(
                                                    (community) => ({
                                                        label: community.name,
                                                        value: community.communityId,
                                                    }),
                                                );
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
                                        !title ||
                                        !from ||
                                        triggerType === "" ||
                                        (triggerType !== "SUBSCRIBER_ADDED" &&
                                            !triggerData) ||
                                        (sequence.title === title &&
                                            sequence.from?.name === from &&
                                            sequence.from?.email ===
                                                fromEmail &&
                                            sequence.trigger?.type ===
                                                triggerType &&
                                            sequence.trigger?.data ===
                                                triggerData)
                                    }
                                />
                            </div>
                        </Form>
                        <div className="flex flex-col gap-2">
                            <h2 className="font-semibold">Emails</h2>
                            <div className="flex flex-col gap-2 mb-2">
                                {emails.map((email) => (
                                    <div
                                        key={email.emailId}
                                        className="flex gap-2 px-2 items-center border rounded hover:bg-accent"
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
                                            <div className="rounded px-3 py-1">
                                                {truncate(email.subject, 70)}
                                            </div>
                                        </Link>
                                        {!email.published && (
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                Draft
                                            </Badge>
                                        )}
                                        <Menu2
                                            icon={<MoreVert />}
                                            variant="soft"
                                        >
                                            <MenuItem
                                                component="dialog"
                                                title={
                                                    DELETE_EMAIL_DIALOG_HEADER
                                                }
                                                triggerChildren={
                                                    DELETE_EMAIL_MENU
                                                }
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
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <EmailAnalytics sequence={sequence} />
                </div>
            </Tabbs>
        </DashboardContent>
    );
}
