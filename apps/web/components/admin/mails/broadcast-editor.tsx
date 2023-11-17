import {
    Button,
    Form,
    FormField,
    Breadcrumbs,
    Link,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { actionCreators } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import {
    Address,
    AppMessage,
    SequenceReport,
    UserFilter,
    UserFilterAggregator,
} from "@courselit/common-models";
import { connect } from "react-redux";
import {
    BTN_SCHEDULE,
    BTN_SEND,
    BUTTON_CANCEL_SCHEDULED_MAIL,
    BUTTON_CANCEL_TEXT,
    DIALOG_SEND_HEADER,
    ERROR_DELAY_EMPTY,
    ERROR_SUBJECT_EMPTY,
    FORM_MAIL_SCHEDULE_TIME_LABEL,
    MAIL_BODY_PLACEHOLDER,
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
const { networkAction } = actionCreators;

interface MailEditorProps {
    id: string;
    address: Address;
    dispatch: AppDispatch;
}

function MailEditor({ id, address, dispatch }: MailEditorProps) {
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
                    broadcastSettings {
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
                    report {
                        broadcast {
                            lockedAt,
                            sentAt
                        }
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
                setSubject(sequence.emails[0].subject);
                setContent(sequence.emails[0].content);
                setDelay(sequence.emails[0].delayInMillis);
                setEmailId(sequence.emails[0].emailId);
                setPublished(sequence.emails[0].published);
                if (sequence.emails[0].delayInMillis) {
                    setShowScheduleInput(true);
                }
                if (sequence.broadcastSettings.filter) {
                    setFilters(sequence.broadcastSettings.filter.filters);
                    setFiltersAggregator(
                        sequence.broadcastSettings.filter.aggregator,
                    );
                }
                setReport(sequence.report);
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

    // TODO: debounce this
    const saveSequence = useCallback(async () => {
        const mutation = `
        mutation updateBroadcast(
            $sequenceId: String!,
            $title: String,
            $filter: String,
            $templateId: String,
            $content: String,
            $delayInMillis: Float,
        ) {
            mail: updateBroadcast(
                sequenceId: $sequenceId,
                title: $title,
                filter: $filter,
                templateId: $templateId,
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
                broadcastSettings {
                    filter {
                        aggregator,
                        filters {
                            name,
                            condition,
                            value,
                            valueLabel
                        },
                    }
                }
            }
        }`;

        const fetcher = fetch
            .setPayload({
                query: mutation,
                variables: {
                    sequenceId: id,
                    filter: JSON.stringify({
                        aggregator: filtersAggregator,
                        filters,
                    }),
                    title: subject,
                    //templateId: $templateId,
                    content,
                    delayInMillis: delay,
                    //published: $published,
                },
            })
            .build();

        try {
            dispatch(networkAction(true));
            await fetcher.exec();
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
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
    ]);

    useEffect(() => {
        saveSequence();
    }, [saveSequence]);

    const onSubmit = async (e: FormEvent, sendLater: boolean = false) => {
        e.preventDefault();

        if (!subject.trim()) {
            dispatch(setAppMessage(new AppMessage(ERROR_SUBJECT_EMPTY)));
            setConfirmationDialogOpen(false);
            return;
        }

        if (sendLater && delay === 0) {
            dispatch(setAppMessage(new AppMessage(ERROR_DELAY_EMPTY)));
            setConfirmationDialogOpen(false);
            return;
        }

        const mutation = `
        mutation ($sequenceId: String!, $emailId: String!) {
            sequence: toggleEmailPublishStatus(sequenceId: $sequenceId, emailId: $emailId) {
                emails {
                    published
                }
            }
        }`;

        const fetcher = fetch
            .setPayload({
                query: mutation,
                variables: {
                    sequenceId: id,
                    emailId: emailId,
                },
            })
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetcher.exec();
            if (response.sequence) {
                const { sequence } = response;
                dispatch(setAppMessage(new AppMessage(TOAST_MAIL_SENT)));
                setPublished(sequence.emails[0].published);
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
            setConfirmationDialogOpen(false);
        }
    };

    const onFilterChange = ({ filters, aggregator, segmentId, count }) => {
        setFilters(filters);
        setFiltersAggregator(aggregator);
        setFilteredUsersCount(count);
    };

    const isPublished = useMemo(() => {
        return published;
    }, [published, delay]);

    if (!loaded) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4">
            <Breadcrumbs aria-label="breakcrumb">
                <Link href="/dashboard/mails">{PAGE_HEADER_ALL_MAILS}</Link>
                {PAGE_HEADER_EDIT_MAIL}
            </Breadcrumbs>
            <h1 className="text-4xl font-semibold mb-4">
                {PAGE_HEADER_EDIT_MAIL}
            </h1>
            <fieldset>
                <label className="mb-1 font-medium">To</label>
                <FilterContainer
                    filter={{ aggregator: filtersAggregator, filters }}
                    onChange={onFilterChange}
                    disabled={isPublished}
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
                <FormField
                    component="textarea"
                    value={content}
                    disabled={isPublished}
                    multiline="true"
                    rows={5}
                    label={MAIL_BODY_PLACEHOLDER}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setContent(e.target.value)
                    }
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
                    /*
                    <FormField
                        value={
                            new Date(delay || new Date().getTime())
                            .toISOString()
                            .slice(0, 16)
                        }
                        type="datetime-local"
                        label={FORM_MAIL_SCHEDULE_TIME_LABEL}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            const selectedDate = new Date(e.target.value);
                            const utcDate = new Date(Date.UTC(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), selectedDate.getHours(), selectedDate.getMinutes()));
                            setDelay(utcDate.getTime());
                        }}
                    />
                    */
                )}
                <div className="flex gap-2">
                    {!published && delay === 0 && !showScheduleInput && (
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
                    )}
                    {!published && !showScheduleInput && (
                        <Button
                            variant={showScheduleInput ? "classic" : "soft"}
                            className="gap-2"
                            onClick={(e: ChangeEvent<HTMLInputElement>) => {
                                setShowScheduleInput(true);
                            }}
                        >
                            <Clock />
                            {BTN_SCHEDULE}
                        </Button>
                    )}
                    {!published && showScheduleInput && (
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
                                onClick={(e: ChangeEvent<HTMLInputElement>) => {
                                    e.preventDefault();
                                    setShowScheduleInput(false);
                                    setDelay(0);
                                }}
                            >
                                {BUTTON_CANCEL_TEXT}
                            </Button>
                        </>
                    )}
                    {published && delay > 0 && !report?.broadcast?.lockedAt && (
                        <Button variant="soft">
                            {BUTTON_CANCEL_SCHEDULED_MAIL}
                        </Button>
                    )}
                </div>
            </Form>
        </div>
    );
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(MailEditor);
