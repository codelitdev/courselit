import {
    Button,
    Form,
    FormField,
    Breadcrumbs,
    Link,
} from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import {
    Address,
    AppMessage,
    Constants,
    SequenceReport,
    UserFilter,
    UserFilterAggregator,
} from "@courselit/common-models";
import {
    BTN_SCHEDULE,
    BTN_SEND,
    BUTTON_CANCEL_SCHEDULED_MAIL,
    BUTTON_CANCEL_TEXT,
    DIALOG_SEND_HEADER,
    ERROR_DELAY_EMPTY,
    ERROR_SUBJECT_EMPTY,
    FORM_MAIL_SCHEDULE_TIME_LABEL,
    MAIL_SUBJECT_PLACEHOLDER,
    PAGE_HEADER_ALL_MAILS,
    PAGE_HEADER_EDIT_MAIL,
    TOAST_MAIL_SENT,
} from "@ui-config/strings";
import { setAppMessage } from "@courselit/state-management/dist/action-creators";
import FilterContainer from "@components/admin/users/filter-container";
import { useCallback } from "react";
import { useMemo } from "react";
import { PaperPlane, Clock } from "@courselit/icons";
import { Dialog2 } from "@courselit/components-library";
import { isDateInFuture } from "../../../lib/utils";
import { MailEditorAndPreview } from "./mail-editor-and-preview";
const { networkAction } = actionCreators;

interface MailEditorProps {
    id: string;
    address: Address;
    dispatch?: AppDispatch;
    prefix: string;
}

function MailEditor({ id, address, dispatch, prefix }: MailEditorProps) {
    const [filters, setFilters] = useState<UserFilter[]>([]);
    const [filtersAggregator, setFiltersAggregator] =
        useState<UserFilterAggregator>("or");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [delay, setDelay] = useState(0);
    const [showScheduleInput, setShowScheduleInput] = useState(false);
    const [emailId, setEmailId] = useState();
    const [published, setPublished] = useState(true);
    const [loaded, setLoaded] = useState(false);
    const [filteredUsersCount, setFilteredUsersCount] = useState(0);
    const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
    const [report, setReport] = useState<SequenceReport>();
    const [status, setStatus] = useState(null);

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
            .setPayload({ query, variables: { sequenceId: id } })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSubject(sequence.emails[0].subject);
                setContent(sequence.emails[0].content);
                setDelay(sequence.emails[0].delayInMillis);
                setEmailId(sequence.emails[0].emailId);
                setPublished(sequence.emails[0].published);
                if (sequence.filter) {
                    setFilters(sequence.filter.filters);
                    setFiltersAggregator(sequence.filter.aggregator);
                }
                setReport(sequence.report);
                setStatus(sequence.status);
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
            setLoaded(true);
        }
    }, [dispatch, fetch, id]);

    useEffect(() => {
        loadSequence();
    }, [loadSequence]);

    // TODO: debounce this
    const saveSequence = useCallback(async () => {
        if (!emailId) {
            return;
        }

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
                    //templateId: $templateId,
                    content,
                    delayInMillis: delay,
                },
            })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            await fetcher.exec();
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    }, [
        dispatch,
        content,
        delay,
        filtersAggregator,
        fetch,
        subject,
        filters,
        id,
        emailId,
    ]);

    useEffect(() => {
        saveSequence();
    }, [saveSequence]);

    const onSubmit = async (e: FormEvent, sendLater: boolean = false) => {
        e.preventDefault();

        if (!subject.trim()) {
            dispatch &&
                dispatch(setAppMessage(new AppMessage(ERROR_SUBJECT_EMPTY)));
            setConfirmationDialogOpen(false);
            return;
        }

        if (sendLater && delay === 0) {
            dispatch &&
                dispatch(setAppMessage(new AppMessage(ERROR_DELAY_EMPTY)));
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
                    emailId,
                    delayInMillis: sendLater ? delay : 0,
                },
            })
            .build();

        try {
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSubject(sequence.emails[0].subject);
                setContent(sequence.emails[0].content);
                setDelay(sequence.emails[0].delayInMillis);
                setEmailId(sequence.emails[0].emailId);
                setPublished(sequence.emails[0].published);
                if (sequence.filter) {
                    setFilters(sequence.filter.filters);
                    setFiltersAggregator(sequence.filter.aggregator);
                }
                setReport(sequence.report);
                setStatus(sequence.status);
                setShowScheduleInput(false);
                dispatch &&
                    dispatch(setAppMessage(new AppMessage(TOAST_MAIL_SENT)));
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
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
            dispatch && dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                setSubject(sequence.emails[0].subject);
                setContent(sequence.emails[0].content);
                setDelay(sequence.emails[0].delayInMillis);
                setEmailId(sequence.emails[0].emailId);
                setPublished(sequence.emails[0].published);
                if (sequence.filter) {
                    setFilters(sequence.filter.filters);
                    setFiltersAggregator(sequence.filter.aggregator);
                }
                setReport(sequence.report);
                setStatus(sequence.status);
            }
        } catch (e: any) {
            dispatch && dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch && dispatch(networkAction(false));
        }
    };

    const onFilterChange = ({
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
    };

    const isPublished = useMemo(() => {
        return [
            Constants.sequenceStatus[1],
            Constants.sequenceStatus[3],
        ].includes(status);
    }, [status]);

    if (!loaded) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            {prefix === "/dashboard" && (
                <Breadcrumbs aria-label="breakcrumb">
                    <Link href={`${prefix}/mails?tab=Broadcasts`}>
                        {PAGE_HEADER_ALL_MAILS}
                    </Link>
                    {PAGE_HEADER_EDIT_MAIL}
                </Breadcrumbs>
            )}
            <h1 className="text-4xl font-semibold mb-4">
                {PAGE_HEADER_EDIT_MAIL}
            </h1>
            <fieldset>
                <label className="mb-1 font-medium">To</label>
                <FilterContainer
                    filter={{ aggregator: filtersAggregator, filters }}
                    onChange={onFilterChange}
                    disabled={isPublished}
                    address={address}
                    dispatch={dispatch}
                />
            </fieldset>
            <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
                <FormField
                    value={subject}
                    disabled={isPublished}
                    label={MAIL_SUBJECT_PLACEHOLDER}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setSubject(e.target.value)
                    }
                />
                <MailEditorAndPreview
                    content={content}
                    onChange={setContent}
                    disabled={isPublished}
                />
                {showScheduleInput && (
                    <FormField
                        value={new Date(
                            (delay || new Date().getTime()) -
                                new Date().getTimezoneOffset() * 60000,
                        )
                            .toISOString()
                            .slice(0, 16)}
                        type="datetime-local"
                        label={FORM_MAIL_SCHEDULE_TIME_LABEL}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const selectedDate = new Date(e.target.value);
                            setDelay(selectedDate.getTime());
                        }}
                    />
                )}
                {[
                    Constants.sequenceStatus[0],
                    Constants.sequenceStatus[2],
                ].includes(status) && (
                    <div className="flex gap-2">
                        {!showScheduleInput && (
                            <div className="flex gap-2">
                                <Dialog2
                                    open={confirmationDialogOpen}
                                    onOpenChange={setConfirmationDialogOpen}
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
                                />
                                <Button
                                    variant={
                                        showScheduleInput ? "classic" : "soft"
                                    }
                                    className="gap-2"
                                    onClick={(
                                        e: ChangeEvent<HTMLInputElement>,
                                    ) => {
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
                                    onOpenChange={setConfirmationDialogOpen}
                                    trigger={
                                        <Button>
                                            <div className="flex items-center gap-2">
                                                <Clock />
                                                {BTN_SCHEDULE}
                                            </div>
                                        </Button>
                                    }
                                    onClick={(e) => onSubmit(e, true)}
                                />
                                <Button
                                    variant="soft"
                                    onClick={(
                                        e: ChangeEvent<HTMLInputElement>,
                                    ) => {
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
            {status === Constants.sequenceStatus[1] &&
                isDateInFuture(new Date(delay)) &&
                !report?.broadcast?.lockedAt && (
                    <div>
                        <p className="flex items-center gap-2 text-sm mb-4 font-semibold text-slate-600">
                            <Clock /> Scheduled for{" "}
                            {new Date(delay).toLocaleString()}
                        </p>
                        <Button variant="soft" onClick={cancelSending}>
                            {BUTTON_CANCEL_SCHEDULED_MAIL}
                        </Button>
                    </div>
                )}
        </div>
    );
}

export default MailEditor;
