import React, { useEffect, useCallback, useMemo } from "react";
import {
    Form,
    Select,
    Skeleton,
    useToast,
} from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { useState } from "react";
import { ThunkDispatch } from "redux-thunk";
import {
    TOAST_TITLE_ERROR,
    USER_FILTER_AGGREGATOR_ALL,
    USER_FILTER_AGGREGATOR_ANY,
    USER_FILTER_AGGREGATOR_HEADER,
    USER_FILTER_BTN_LABEL,
    USER_FILTER_CLEAR,
    USER_FILTER_LABEL_DEFAULT,
} from "@ui-config/strings";
import Segment from "@ui-models/segment";
// import SegmentEditor from "./segment-editor.tsx.notused";
import { AnyAction } from "redux";
import {
    Address,
    State,
    UserFilter,
    UserFilterAggregator,
    UserFilterWithAggregator,
} from "@courselit/common-models";
import { actionCreators } from "@courselit/state-management";
import dynamic from "next/dynamic";
import { PieChart, Search } from "@courselit/icons";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@components/ui/dropdown-menu";
import { Button } from "@components/ui/button";
import { Popover } from "@components/ui/popover";
import SegmentEditor2 from "./segment-editor";
import { Filter } from "lucide-react";
import { Input } from "@components/ui/input";
const FilterChip = dynamic(() => import("./filter-chip"));
const FilterSave = dynamic(() => import("./filter-save"));
const FilterEditor = dynamic(() => import("./filter-editor"));
const FilterEditor2 = dynamic(() => import("./filter-editor-2"));
const { networkAction } = actionCreators;

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
    const { toast } = useToast();

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
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
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
                    count: getUsersCount(
                        filters: ${JSON.stringify(
                            JSON.stringify({
                                aggregator: internalAggregator,
                                filters: internalFilters,
                            }),
                        )}
                    )
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
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
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

    const searchByEmail = useCallback(async () => {
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
    }, [searchEmail, internalFilters]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {/* <Popover
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
                </Popover> */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            // onClick={() => setSegmentSelectOpen(true)}
                        >
                            <PieChart />
                            {
                                segments.filter(
                                    (segment) =>
                                        segment.segmentId === activeSegment,
                                )[0]?.name
                            }
                        </Button>
                    </DropdownMenuTrigger>
                    <SegmentEditor2
                        address={address}
                        segments={segments}
                        selectedSegment={activeSegment}
                        onDelete={({
                            selectedSegment,
                            segments: receivedSegments,
                        }) => {
                            if (receivedSegments) {
                                mapSegments(receivedSegments);
                            }
                            const selectedSeg = segments.find(
                                (segment) =>
                                    segment.segmentId === selectedSegment,
                            );
                            setInternalFilters([
                                ...(selectedSeg?.filter.filters || []),
                            ]);
                            setInternalAggregator(
                                selectedSeg?.filter.aggregator || "or",
                            );
                            setActiveSegment(selectedSegment);
                            onChange({
                                filters: [
                                    ...(selectedSeg?.filter.filters || []),
                                ],
                                aggregator:
                                    selectedSeg?.filter.aggregator || "or",
                                segmentId: selectedSegment,
                                count,
                            });
                            setSegmentSelectOpen(false);
                        }}
                    />
                </DropdownMenu>
                {/* <Popover
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
                </Popover> */}
                <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            // onClick={() => setFilterOpen(true)}
                        >
                            <Filter className="w-4 h-4" />
                            {USER_FILTER_BTN_LABEL}
                        </Button>
                    </DropdownMenuTrigger>
                    <FilterEditor2
                        dismissPopover={(filter?: UserFilter) => {
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
                </DropdownMenu>
                <Form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (searchEmail) {
                            searchByEmail();
                        }
                    }}
                    className="flex-1 relative max-w-sm"
                >
                    {/* <FormField
                        type="email"
                        onChange={(e) => setSearchEmail(e.target.value)}
                        value={searchEmail}
                        required
                        placeholder="Search by email"
                        disabled={disabled}
                        endIcon={
                                <span className="flex gap-2">
                                    <IconButton
                                        type="submit"
                                        variant="soft"
                                        onClick={(e: MouseEvent) => {
                                            e.preventDefault();
                                            searchByEmail();
                                        }}
                                        disabled={!searchEmail}
                                    >
                                        <Search />
                                    </IconButton>
                            </span>
                        }
                    /> */}
                    <div>
                        <Input
                            placeholder="Search by email"
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            className="pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full aspect-square"
                            onClick={searchByEmail}
                            disabled={!searchEmail}
                            aria-label="Search"
                        >
                            <Search className="h-4 w-4" />
                        </Button>
                    </div>
                </Form>
                <p className="text-sm text-muted-foreground mr-2">
                    {!countLoading && `${count} Users`}
                    {countLoading && <Skeleton className="h-4 w-16" />}
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
                                onOpenChange={setSegmentSaveOpen}
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
