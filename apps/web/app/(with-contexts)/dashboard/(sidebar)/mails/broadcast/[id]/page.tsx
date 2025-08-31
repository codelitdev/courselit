"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { isDateInFuture } from "@/lib/utils";
import { AddressContext } from "@components/contexts";
import { BROADCASTS } from "@ui-config/strings";
import { useContext, useState } from "react";
import { PaperPlane, Clock } from "@courselit/icons";
import {
    Form,
    FormField,
    Dialog2,
    useToast,
    Tabbs,
} from "@courselit/components-library";
import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import {
    SequenceReport,
    UserFilter,
    UserFilterAggregator,
    SequenceStatus,
} from "@courselit/common-models";
import {
    BTN_SCHEDULE,
    BTN_SEND,
    BUTTON_CANCEL_SCHEDULED_MAIL,
    BUTTON_CANCEL_TEXT,
    DIALOG_SEND_HEADER,
    ERROR_DELAY_EMPTY,
    TOAST_TITLE_ERROR,
    ERROR_SUBJECT_EMPTY,
    FORM_MAIL_SCHEDULE_TIME_LABEL,
    MAIL_SUBJECT_PLACEHOLDER,
    PAGE_HEADER_EDIT_MAIL,
    TOAST_MAIL_SENT,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { Email as EmailContent } from "@courselit/email-editor";
import { useSequence } from "@/hooks/use-sequence";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import FilterContainer from "@components/admin/users/filter-container";
import EmailViewer from "@components/admin/mails/email-viewer";
import { Button } from "@components/ui/button";
import { truncate } from "@courselit/utils";
import EmailAnalytics from "@components/admin/mails/email-analytics";

const breadcrumbs = [
    { label: BROADCASTS, href: "/dashboard/mails?tab=Broadcasts" },
    { label: PAGE_HEADER_EDIT_MAIL, href: "#" },
];

export default function Page({
    params,
}: {
    params: {
        id: string;
    };
}) {
    const address = useContext(AddressContext);
    const { id } = params;
    const { sequence, loading, error, loadSequence } = useSequence();
    const [filters, setFilters] = useState<UserFilter[]>([]);
    const [filtersAggregator, setFiltersAggregator] =
        useState<UserFilterAggregator>("or");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState<EmailContent | null>(null);
    const [delay, setDelay] = useState(0);
    const [showScheduleInput, setShowScheduleInput] = useState(false);
    const [emailId, setEmailId] = useState<string | undefined>();
    // const [published, setPublished] = useState(true);
    const [filteredUsersCount, setFilteredUsersCount] = useState(0);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [report, setReport] = useState<SequenceReport>();
    const [status, setStatus] = useState<SequenceStatus | null>(null);
    const [activeTab, setActiveTab] = useState("Compose");

    // Refs to track initial values and prevent saving during load
    const initialValues = useRef({
        subject: "",
        content: null as EmailContent | null,
        delay: 0,
        filters: [] as UserFilter[],
        filtersAggregator: "or" as UserFilterAggregator,
    });
    const isInitialLoad = useRef(true);
    const saveTimeoutRef = useRef<NodeJS.Timeout>();

    const { toast } = useToast();

    const fetch = useGraphQLFetch();

    // Load sequence on mount
    useEffect(() => {
        loadSequence(id);
    }, [loadSequence, id]);

    // Update state when sequence data is loaded
    useEffect(() => {
        if (sequence && isInitialLoad.current) {
            // Set initial values in ref
            initialValues.current = {
                subject: sequence.emails[0].subject,
                content: sequence.emails[0].content,
                delay: sequence.emails[0].delayInMillis,
                filters: sequence.filter?.filters || [],
                filtersAggregator: sequence.filter?.aggregator || "or",
            };

            // Update state
            setSubject(sequence.emails[0].subject);
            setContent(sequence.emails[0].content);
            setDelay(sequence.emails[0].delayInMillis);
            setEmailId(sequence.emails[0].emailId);
            // setPublished(sequence.emails[0].published);
            if (sequence.filter) {
                setFilters(sequence.filter.filters);
                setFiltersAggregator(sequence.filter.aggregator);
            }
            setReport(sequence.report);
            setStatus(sequence.status);

            isInitialLoad.current = false;
        }
    }, [sequence]);

    // Handle error state
    useEffect(() => {
        if (error) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: error,
                variant: "destructive",
            });
        }
    }, [error, toast]);

    const debouncedSave = useCallback(async () => {
        if (!emailId || isInitialLoad.current) {
            return;
        }

        // Check if values have actually changed
        const hasChanged =
            subject !== initialValues.current.subject ||
            content !== initialValues.current.content ||
            delay !== initialValues.current.delay ||
            JSON.stringify(filters) !==
                JSON.stringify(initialValues.current.filters) ||
            filtersAggregator !== initialValues.current.filtersAggregator;

        if (!hasChanged) {
            return;
        }

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for debounced save
        saveTimeoutRef.current = setTimeout(async () => {
            const mutation = `
            mutation updateSequence(
                $sequenceId: String!,
                $emailId: String!,
                $title: String,
                $filter: String,
                $content: String,
                $delayInMillis: Float,
            ) {
                sequence: updateSequence(
                    sequenceId: $sequenceId,
                    title: $title,
                    filter: $filter,
                ) {
                    sequenceId,
                },
                mail: updateMailInSequence(
                    sequenceId: $sequenceId,
                    emailId: $emailId,
                    subject: $title,
                    content: $content,
                    delayInMillis: $delayInMillis, 
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
                        sequenceId: id,
                        emailId,
                        title: subject,
                        filter: JSON.stringify({
                            aggregator: filtersAggregator,
                            filters,
                        }),
                        content: JSON.stringify(content),
                        delayInMillis: delay,
                    },
                })
                .build();

            try {
                await fetcher.exec();

                // Update initial values after successful save
                initialValues.current = {
                    subject,
                    content,
                    delay,
                    filters: [...filters],
                    filtersAggregator,
                };
            } catch (e: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: e.message,
                    variant: "destructive",
                });
            }
        }, 1000); // 1 second debounce
    }, [
        emailId,
        subject,
        content,
        delay,
        filters,
        filtersAggregator,
        id,
        fetch,
        toast,
    ]);

    // Trigger debounced save when values change
    useEffect(() => {
        debouncedSave();
    }, [debouncedSave]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const onSubmit = async (e: FormEvent, sendLater: boolean = false) => {
        e.preventDefault();

        if (!subject.trim()) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: ERROR_SUBJECT_EMPTY,
                variant: "destructive",
            });
            setConfirmationDialogOpen(false);
            return;
        }

        if (sendLater && delay === 0) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: ERROR_DELAY_EMPTY,
                variant: "destructive",
            });
            setConfirmationDialogOpen(false);
            return;
        }

        const mutation = `
        mutation (
            $sequenceId: String!
            $emailId: String!
            $delayInMillis: Float
        ) {
            updateMailInSequence(
                sequenceId: $sequenceId
                emailId: $emailId
                delayInMillis: $delayInMillis
                published: true
            ) {
                sequenceId,
            }
            sequence: startSequence(sequenceId: $sequenceId) {
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
                },
                report {
                    broadcast {
                        lockedAt,
                        sentAt
                    }
                },
                status
            }
        }`;

        const fetcher = fetch
            .setPayload({
                query: mutation,
                variables: {
                    sequenceId: id,
                    emailId,
                    delayInMillis: sendLater ? delay : 0,
                },
            })
            .build();

        try {
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSubject(sequence.emails[0].subject);
                setContent(sequence.emails[0].content);
                setDelay(sequence.emails[0].delayInMillis);
                setEmailId(sequence.emails[0].emailId);
                // setPublished(sequence.emails[0].published);
                if (sequence.filter) {
                    setFilters(sequence.filter.filters);
                    setFiltersAggregator(sequence.filter.aggregator);
                }
                setReport(sequence.report);
                setStatus(sequence.status);
                setShowScheduleInput(false);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: TOAST_MAIL_SENT,
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setConfirmationDialogOpen(false);
        }
    };

    const cancelSending = async () => {
        const mutation = `
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
                        templateId,
                        content,
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
                    },
                    report {
                        broadcast {
                            lockedAt,
                            sentAt
                        }
                    },
                    status
                }
            }`;

        const fetcher = fetch
            .setPayload({
                query: mutation,
                variables: {
                    sequenceId: id,
                },
            })
            .build();

        try {
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSubject(sequence.emails[0].subject);
                setContent(sequence.emails[0].content);
                setDelay(sequence.emails[0].delayInMillis);
                setEmailId(sequence.emails[0].emailId);
                // setPublished(sequence.emails[0].published);
                if (sequence.filter) {
                    setFilters(sequence.filter.filters);
                    setFiltersAggregator(sequence.filter.aggregator);
                }
                setReport(sequence.report);
                setStatus(sequence.status);
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        }
    };

    const onFilterChange = useCallback(
        ({
            filters: newFilters,
            aggregator,
            segmentId,
            count: filteredCount,
        }) => {
            if (
                JSON.stringify(filters) !== JSON.stringify(newFilters) ||
                filtersAggregator !== aggregator ||
                filteredUsersCount !== filteredCount
            ) {
                setFilters(newFilters);
                setFiltersAggregator(aggregator);
                setFilteredUsersCount(filteredCount);
            }
        },
        [filters, filtersAggregator, filteredUsersCount],
    );

    const isEditable = useMemo(() => {
        return Boolean(
            status &&
                [
                    "draft" as SequenceStatus,
                    "paused" as SequenceStatus,
                ].includes(status),
        );
    }, [status]);

    if (loading || !sequence) {
        return null;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl font-semibold">
                    {truncate(subject || PAGE_HEADER_EDIT_MAIL, 50)}
                </h1>
            </div>
            <Tabbs
                items={["Compose", "Analytics"]}
                value={activeTab}
                onChange={setActiveTab}
            >
                <div className="mt-4">
                    <div className="flex flex-col gap-4">
                        <fieldset>
                            <label className="mb-1 font-medium">To</label>
                            {!isInitialLoad.current && (
                                <FilterContainer
                                    filter={{
                                        aggregator: filtersAggregator,
                                        filters,
                                    }}
                                    onChange={onFilterChange}
                                    disabled={!isEditable}
                                    address={address}
                                />
                            )}
                        </fieldset>
                        <Form
                            className="flex flex-col gap-4"
                            onSubmit={onSubmit}
                        >
                            <FormField
                                value={subject}
                                disabled={!isEditable}
                                label={MAIL_SUBJECT_PLACEHOLDER}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setSubject(e.target.value)
                                }
                            />
                            <EmailViewer
                                content={content}
                                emailEditorLink={
                                    isEditable
                                        ? `/dashboard/mail/sequence/${id}/${emailId}?redirectTo=/dashboard/mails/broadcast/${id}`
                                        : ""
                                }
                            />
                            {showScheduleInput && (
                                <FormField
                                    value={new Date(
                                        (delay || new Date().getTime()) -
                                            new Date().getTimezoneOffset() *
                                                60000,
                                    )
                                        .toISOString()
                                        .slice(0, 16)}
                                    type="datetime-local"
                                    label={FORM_MAIL_SCHEDULE_TIME_LABEL}
                                    min={new Date().toISOString().slice(0, 16)}
                                    disabled={!isEditable}
                                    onChange={(
                                        e: ChangeEvent<HTMLInputElement>,
                                    ) => {
                                        const selectedDate = new Date(
                                            e.target.value,
                                        );
                                        setDelay(selectedDate.getTime());
                                    }}
                                />
                            )}
                            {isEditable && (
                                <div className="flex gap-2">
                                    {!showScheduleInput && (
                                        <div className="flex gap-2">
                                            <Dialog2
                                                open={confirmationDialogOpen}
                                                onOpenChange={
                                                    setConfirmationDialogOpen
                                                }
                                                title={`${DIALOG_SEND_HEADER} to ${filteredUsersCount} contacts?`}
                                                trigger={
                                                    <Button>
                                                        <div className="flex items-center gap-2">
                                                            <PaperPlane />
                                                            {BTN_SEND}
                                                        </div>
                                                    </Button>
                                                }
                                                onClick={onSubmit}
                                            >
                                                <p>
                                                    Are you sure you want to
                                                    send this email to{" "}
                                                    {filteredUsersCount}{" "}
                                                    contacts?
                                                </p>
                                            </Dialog2>
                                            <Button
                                                variant="ghost"
                                                className="gap-2"
                                                onClick={() => {
                                                    setShowScheduleInput(true);
                                                }}
                                            >
                                                <Clock />
                                                {BTN_SCHEDULE}
                                            </Button>
                                        </div>
                                    )}
                                    {showScheduleInput && (
                                        <>
                                            <Dialog2
                                                title={`${DIALOG_SEND_HEADER} to ${filteredUsersCount} contacts?`}
                                                open={confirmationDialogOpen}
                                                onOpenChange={
                                                    setConfirmationDialogOpen
                                                }
                                                trigger={
                                                    <Button>
                                                        <div className="flex items-center gap-2">
                                                            <Clock />
                                                            {BTN_SCHEDULE}
                                                        </div>
                                                    </Button>
                                                }
                                                onClick={(e) =>
                                                    onSubmit(e, true)
                                                }
                                            >
                                                <div className="p-4">
                                                    <p>
                                                        Are you sure you want to
                                                        schedule this email to{" "}
                                                        {filteredUsersCount}{" "}
                                                        contacts?
                                                    </p>
                                                </div>
                                            </Dialog2>
                                            <Button
                                                variant="secondary"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setShowScheduleInput(false);
                                                    setDelay(0);
                                                }}
                                            >
                                                {BUTTON_CANCEL_TEXT}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                        </Form>
                        {status === "active" &&
                            isDateInFuture(new Date(delay)) &&
                            !report?.broadcast?.lockedAt && (
                                <div>
                                    <p className="flex items-center gap-2 text-sm mb-4 font-semibold text-slate-600">
                                        <Clock /> Scheduled for{" "}
                                        {new Date(delay).toLocaleString()}
                                    </p>
                                    <Button
                                        variant="secondary"
                                        onClick={cancelSending}
                                    >
                                        {BUTTON_CANCEL_SCHEDULED_MAIL}
                                    </Button>
                                </div>
                            )}
                    </div>
                </div>
                <div className="mt-4">
                    <EmailAnalytics sequence={sequence} />
                </div>
            </Tabbs>
        </DashboardContent>
    );
}
