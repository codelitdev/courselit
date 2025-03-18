import React, { useState, ChangeEvent } from "react";
import { Form, FormField, useToast } from "@courselit/components-library";
import Segment from "@ui-models/segment";
import {
    BUTTON_SAVE,
    TOAST_TITLE_ERROR,
    USER_FILTER_NEW_SEGMENT_NAME,
    USER_FILTER_SAVE,
    USER_FILTER_SAVE_DESCRIPTION,
} from "@ui-config/strings";
import { FormEvent } from "react";
import { FetchBuilder } from "@courselit/utils";
import type { AppDispatch, AppState } from "@courselit/state-management";
import {
    Address,
    UserFilter,
    UserFilterAggregator,
} from "@courselit/common-models";
import type { ThunkDispatch } from "redux-thunk";
import { actionCreators } from "@courselit/state-management";
import type { AnyAction } from "redux";
import PopoverDescription from "./popover-description";
import { PopoverContent, PopoverTrigger } from "@components/ui/popover";
import { Save } from "lucide-react";
import { Button } from "@components/ui/button";

const { networkAction } = actionCreators;

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
    const { toast } = useToast();

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
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            dispatch &&
                (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                    networkAction(false),
                );
        }
    };

    return (
        <>
            <PopoverTrigger>
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={filters.length === 0}
                    className="flex items-center gap-1"
                >
                    <Save className="h-3.5 w-3.5" />
                    {USER_FILTER_SAVE}
                </Button>
            </PopoverTrigger>
            <PopoverContent>
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
                        <Button type="submit">{BUTTON_SAVE}</Button>
                    </div>
                </Form>
            </PopoverContent>
        </>
    );
}
