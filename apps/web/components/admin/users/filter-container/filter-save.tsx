import React, { useState, ChangeEvent } from "react";
import { Form, FormField, FormSubmit } from "@courselit/components-library";
import Segment from "@ui-models/segment";
import {
    BUTTON_SAVE,
    USER_FILTER_NEW_SEGMENT_NAME,
    USER_FILTER_SAVE_DESCRIPTION,
} from "@ui-config/strings";
import { FormEvent } from "react";
import { FetchBuilder } from "@courselit/utils";
import type { AppDispatch, AppState } from "@courselit/state-management";
import {
    Address,
    AppMessage,
    UserFilter,
    UserFilterAggregator,
} from "@courselit/common-models";
import type { ThunkDispatch } from "redux-thunk";
import { actionCreators } from "@courselit/state-management";
import type { AnyAction } from "redux";
import PopoverDescription from "./popover-description";

const { networkAction, setAppMessage } = actionCreators;

interface FilterSaveProps {
    filters: UserFilter[];
    aggregator: UserFilterAggregator;
    address: Address;
    dismissPopover: (segments?: Segment[]) => void;
    dispatch?: AppDispatch;
}

export default function FilterSave({
    filters,
    aggregator,
    address,
    dispatch,
    dismissPopover,
}: FilterSaveProps) {
    const [name, setName] = useState("");

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const mutation = `
                mutation {
                    segments: createSegment(
                        segmentData: {
                            name: "${name}",
                            filter: ${JSON.stringify(
                                JSON.stringify({
                                    aggregator,
                                    filters,
                                }),
                            )}
                        } 
                    ) {
                       name,
                       filter {
                           aggregator,
                           filters {
                               name,
                               condition,
                               value
                           }
                       },
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
            if (response.segments) {
                dismissPopover(response.segments);
            } else {
                dismissPopover();
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
        <div className="max-w-[180px] p-2">
            <PopoverDescription>
                {USER_FILTER_SAVE_DESCRIPTION}
            </PopoverDescription>
            <Form className="flex flex-col gap-2 mt-2" onSubmit={onSubmit}>
                <FormField
                    value={name}
                    label={USER_FILTER_NEW_SEGMENT_NAME}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setName(e.target.value)
                    }
                    onSubmit={onSubmit}
                />
                <div className="flex">
                    <FormSubmit text={BUTTON_SAVE} />
                </div>
            </Form>
        </div>
    );
}
