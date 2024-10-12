import type { Address } from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import { Button, IconButton, ScrollArea } from "@courselit/components-library";
import { Delete } from "@courselit/icons";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import React, { useState } from "react";
import type { ThunkDispatch } from "redux-thunk";
import {
    POPUP_CANCEL_ACTION,
    POPUP_OK_ACTION,
    USER_DELETE_SEGMENT,
    USER_DELETE_SEGMENT_DESCRIPTION,
    USER_SEGMENT_DESCRIPTION,
    USER_SEGMENT_DROPDOWN_LABEL,
} from "@ui-config/strings";
import Segment from "@ui-models/segment";
import PopoverDescription from "./popover-description";
import PopoverHeader from "./popover-header";
import type { AnyAction } from "redux";
import { actionCreators } from "@courselit/state-management";
import DocumentationLink from "@components/public/documentation-link";
const { networkAction, setAppMessage } = actionCreators;

interface DismissPopoverProps {
    selectedSegment: string;
    segments?: Segment[];
    cancelled?: boolean;
}

interface SegmentEditorProps {
    segments: Segment[];
    selectedSegment: string;
    address: Address;
    dispatch?: AppDispatch;
    dismissPopover: (props: DismissPopoverProps) => void;
}

export default function SegmentEditor({
    segments,
    selectedSegment,
    address,
    dispatch,
    dismissPopover,
}: SegmentEditorProps) {
    const [activeSegment, setActiveSegment] = useState<Segment>();

    const deleteSegment = async () => {
        const mutation = `
                mutation {
                    segments: deleteSegment(
                        segmentId: "${activeSegment.segmentId}",
                    ) {
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
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            dispatch &&
                (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                    networkAction(true),
                );
            const response = await fetch.exec();
            const segmentId =
                activeSegment.segmentId === selectedSegment
                    ? ""
                    : selectedSegment;
            if (response.segments) {
                dismissPopover({
                    selectedSegment: segmentId,
                    segments: response.segments,
                });
            } else {
                dismissPopover({
                    selectedSegment: segmentId,
                });
            }
        } catch (err) {
            dispatch && dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch &&
                (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                    networkAction(false),
                );
        }
    };

    return (
        <div className="max-w-[180px]">
            {!activeSegment && (
                <ScrollArea>
                    <div className="p-2">
                        <PopoverHeader>
                            {USER_SEGMENT_DROPDOWN_LABEL}
                        </PopoverHeader>
                        <PopoverDescription>
                            {USER_SEGMENT_DESCRIPTION}{" "}
                            <DocumentationLink path="/en/users/segments" />
                        </PopoverDescription>
                        <ul className="mt-2">
                            {segments.map((segment) => (
                                <li
                                    key={segment.segmentId}
                                    className="flex justify-between cursor-pointer text-medium leading-none rounded-[3px] flex items-center h-8 relative select-none outline-none data-[disabled]:text-slate-200 data-[disabled]:pointer-events-none hover:bg-slate-200"
                                    onClick={() => {
                                        dismissPopover({
                                            selectedSegment: segment.segmentId,
                                        });
                                    }}
                                >
                                    <span
                                        className={
                                            segment.segmentId ===
                                            selectedSegment
                                                ? "font-medium"
                                                : ""
                                        }
                                    >
                                        {segment.name}
                                    </span>
                                    {segment.segmentId && (
                                        <span className="mr-2">
                                            <IconButton
                                                variant="soft"
                                                onClick={(e: MouseEvent) => {
                                                    e.stopPropagation();
                                                    setActiveSegment(segment);
                                                }}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </ScrollArea>
            )}
            {activeSegment && (
                <div className="p-2">
                    <PopoverHeader>{USER_DELETE_SEGMENT}</PopoverHeader>
                    <PopoverDescription>{`${USER_DELETE_SEGMENT_DESCRIPTION}"${activeSegment.name}"?`}</PopoverDescription>
                    <div className="flex justify-between mt-4">
                        <Button
                            name="delete"
                            onClick={(e: MouseEvent) => {
                                e.preventDefault();
                                deleteSegment();
                            }}
                        >
                            {POPUP_OK_ACTION}
                        </Button>
                        <Button
                            name="cancel"
                            variant="soft"
                            onClick={(e: MouseEvent) => {
                                e.preventDefault();
                                dismissPopover({
                                    selectedSegment,
                                    cancelled: true,
                                });
                            }}
                        >
                            {POPUP_CANCEL_ACTION}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
