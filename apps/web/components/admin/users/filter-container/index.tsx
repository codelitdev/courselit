import React, { useEffect, useCallback, useMemo } from "react";
import {
    Button,
    Form,
    FormField,
    IconButton,
    Popover,
    Select,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { useState } from "react";
import { ThunkDispatch } from "redux-thunk";
import {
    USER_FILTER_AGGREGATOR_ALL,
    USER_FILTER_AGGREGATOR_ANY,
    USER_FILTER_AGGREGATOR_HEADER,
    USER_FILTER_BTN_LABEL,
    USER_FILTER_CLEAR,
    USER_FILTER_LABEL_DEFAULT,
    USER_FILTER_SAVE,
} from "@ui-config/strings";
import Segment from "@ui-models/segment";
import SegmentEditor from "./segment-editor";
import { AnyAction } from "redux";
import {
    Address,
    AppMessage,
    State,
    UserFilter,
    UserFilterAggregator,
    UserFilterWithAggregator,
} from "@courselit/common-models";
import { actionCreators } from "@courselit/state-management";
import dynamic from "next/dynamic";
import { PieChart, Search, Settings } from "@courselit/icons";
import { FormEvent } from "react";
import AppLoader from "@components/app-loader";
const FilterChip = dynamic(() => import("./filter-chip"));
const FilterSave = dynamic(() => import("./filter-save"));
const FilterEditor = dynamic(() => import("./filter-editor"));
const { networkAction, setAppMessage } = actionCreators;

interface FilterContainerProps {
    onChange: ({
        filters,
        aggregator,
        segmentId,
        count,
    }: {
        filters: UserFilter[];
        aggregator: UserFilterAggregator;
        segmentId: string;
        count: number;
    }) => void;
    address: Address;
    dispatch?: AppDispatch;
    filter?: UserFilterWithAggregator;
    disabled?: boolean;
}

export default function FilterContainer({
    onChange,
    address,
    dispatch,
    filter,
    disabled = false,
}: FilterContainerProps) {
    const [internalFilters, setInternalFilters] = useState<UserFilter[]>(
        filter?.filters || [],
    );
    const defaultSegment: Segment = useMemo(
        () => ({
            name: USER_FILTER_LABEL_DEFAULT,
            filter: {
                aggregator: "or",
                filters: [],
            },
            segmentId: "",
        }),
        [],
    );
    const [segments, setSegments] = useState<Segment[]>([defaultSegment]);
    const [internalAggregator, setInternalAggregator] =
        useState<UserFilterAggregator>(filter?.aggregator || "or");
    const [activeSegment, setActiveSegment] = useState("");
    const [segmentSelectOpen, setSegmentSelectOpen] = useState(false);
    const [count, setCount] = useState(0);
    const [segmentSaveOpen, setSegmentSaveOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [searchEmail, setSearchEmail] = useState("");
    const [countLoading, setCountLoading] = useState(false);

    const mapSegments = useCallback(
        (segments: Segment[]) => {
            setSegments([defaultSegment, ...segments]);
        },
        [defaultSegment],
    );

    const loadSegments = useCallback(async () => {
        const query = `
            query {
                segments {
                    name,
                        filter {
                            aggregator,
                            filters {
                                name,
                                condition,
                                value,
                                valueLabel
                            },
                        }
                    segmentId
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch &&
                (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                    networkAction(true),
                );
            const response = await fetch.exec();
            if (response.segments) {
                mapSegments(response.segments);
            }
        } catch (err) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch &&
                (dispatch as ThunkDispatch<State, null, AnyAction>)(
                    networkAction(false),
                );
        }
    }, [address.backend, dispatch, mapSegments]);

    useEffect(() => {
        loadSegments();
    }, [loadSegments]);

    const loadCount = useCallback(async () => {
        const query =
            internalFilters.length !== 0
                ? `
                query {
                    count: getUsersCount(searchData: {
                        filters: ${JSON.stringify(
                            JSON.stringify({
                                aggregator: internalAggregator,
                                filters: internalFilters,
                            }),
                        )}
                    })
                }
            `
                : `
                query {
                    count: getUsersCount
                }
            `;

        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(query)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            setCountLoading(true);
            const response = await fetch.exec();
            if (typeof response.count !== "undefined") {
                onChange({
                    filters: [...internalFilters],
                    aggregator: internalAggregator,
                    segmentId: activeSegment,
                    count: response.count,
                });
                setCount(response.count);
            }
        } catch (err) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            setCountLoading(false);
        }
    }, [
        address.backend,
        dispatch,
        internalFilters,
        internalAggregator,
        activeSegment,
        onChange,
    ]);

    useEffect(() => {
        loadCount();
    }, [loadCount]);

    const searchByEmail = useCallback(
        async (e?: FormEvent) => {
            e && e.preventDefault();
            const newFilters = [
                ...internalFilters,
                {
                    name: "email",
                    condition: "Contains",
                    value: searchEmail,
                },
            ];
            setInternalFilters(newFilters);
            onChange({
                filters: newFilters,
                aggregator: internalAggregator,
                segmentId: activeSegment,
                count,
            });
            setSearchEmail("");
        },
        [searchEmail, internalFilters],
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Popover
                    open={segmentSelectOpen}
                    setOpen={setSegmentSelectOpen}
                    title={
                        <span className="flex items-center gap-2">
                            <PieChart />
                            {
                                segments.filter(
                                    (segment) =>
                                        segment.segmentId === activeSegment,
                                )[0]?.name
                            }
                        </span>
                    }
                    disabled={disabled}
                >
                    <SegmentEditor
                        address={address}
                        dispatch={dispatch}
                        segments={segments}
                        selectedSegment={activeSegment}
                        dismissPopover={({
                            selectedSegment,
                            segments: receivedSegments,
                            cancelled,
                        }) => {
                            if (!cancelled) {
                                if (receivedSegments) {
                                    mapSegments(receivedSegments);
                                }
                                const selectedSeg = segments.find(
                                    (segment) =>
                                        segment.segmentId === selectedSegment,
                                );
                                setInternalFilters([
                                    ...selectedSeg.filter.filters,
                                ]);
                                setInternalAggregator(
                                    selectedSeg.filter.aggregator,
                                );
                                setActiveSegment(selectedSegment);
                                onChange({
                                    filters: [...selectedSeg.filter.filters],
                                    aggregator: selectedSeg.filter.aggregator,
                                    segmentId: selectedSegment,
                                    count,
                                });
                            }
                            setSegmentSelectOpen(false);
                        }}
                    />
                </Popover>
                <Popover
                    open={filterOpen}
                    setOpen={setFilterOpen}
                    title={
                        <span className="flex items-center gap-2">
                            <Settings />
                            {USER_FILTER_BTN_LABEL}
                        </span>
                    }
                    disabled={disabled}
                >
                    <FilterEditor
                        dismissPopover={(filter: UserFilter) => {
                            if (filter) {
                                const newFilters = [...internalFilters, filter];
                                setInternalFilters(newFilters);
                                onChange({
                                    filters: newFilters,
                                    aggregator: internalAggregator,
                                    segmentId: activeSegment,
                                    count,
                                });
                            }
                            setFilterOpen(false);
                        }}
                        address={address}
                        dispatch={dispatch}
                    />
                </Popover>
                <Form
                    onSubmit={searchByEmail}
                    className="flex gap-2 items-start grow"
                >
                    <FormField
                        type="email"
                        onChange={(e) => setSearchEmail(e.target.value)}
                        value={searchEmail}
                        required
                        placeholder="Search by email"
                        className="grow"
                        disabled={disabled}
                        endIcon={
                            searchEmail ? (
                                <span className="flex gap-2">
                                    <IconButton
                                        type="submit"
                                        variant="soft"
                                        onClick={(e: MouseEvent) => {
                                            e.preventDefault();
                                            searchByEmail();
                                        }}
                                    >
                                        <Search />
                                    </IconButton>
                                </span>
                            ) : null
                        }
                    />
                </Form>
                <p>
                    {!countLoading && `${count} Users`}
                    {countLoading && <AppLoader />}
                </p>
            </div>
            {internalFilters.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    <Select
                        value={internalAggregator}
                        disabled={disabled}
                        onChange={(value) => {
                            setInternalAggregator(value);
                            onChange({
                                filters: [...internalFilters],
                                aggregator: value,
                                segmentId: activeSegment,
                                count,
                            });
                        }}
                        options={[
                            { label: USER_FILTER_AGGREGATOR_ANY, value: "or" },
                            { label: USER_FILTER_AGGREGATOR_ALL, value: "and" },
                        ]}
                        variant="without-label"
                        title={USER_FILTER_AGGREGATOR_HEADER}
                    />
                    {internalFilters.map((filter, index) => (
                        <FilterChip
                            onRemove={(index: number) => {
                                internalFilters.splice(index, 1);
                                setInternalFilters([...internalFilters]);
                                onChange({
                                    filters: [...internalFilters],
                                    aggregator: internalAggregator,
                                    segmentId: activeSegment,
                                    count,
                                });
                            }}
                            key={index}
                            index={index}
                            filter={filter}
                            disabled={disabled}
                        />
                    ))}
                    {!disabled && (
                        <>
                            <Button
                                onClick={() => {
                                    setInternalFilters([]);
                                    setActiveSegment("");
                                    onChange({
                                        filters: [],
                                        aggregator: "or",
                                        segmentId: "",
                                        count,
                                    });
                                }}
                                variant="soft"
                                className="mx-2"
                            >
                                {USER_FILTER_CLEAR}
                            </Button>
                            <Popover
                                open={segmentSaveOpen}
                                setOpen={setSegmentSaveOpen}
                                title={USER_FILTER_SAVE}
                            >
                                <FilterSave
                                    filters={internalFilters}
                                    aggregator={internalAggregator}
                                    dismissPopover={(segments?: Segment[]) => {
                                        if (segments && segments.length) {
                                            mapSegments(segments);
                                        }
                                        setSegmentSaveOpen(false);
                                    }}
                                    address={address}
                                    dispatch={dispatch}
                                />
                            </Popover>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
