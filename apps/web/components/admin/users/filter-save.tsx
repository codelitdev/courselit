import React, { useState, ChangeEvent } from "react";
import { Form, FormField, FormSubmit } from "@courselit/components-library";
import Filter from "../../../ui-models/filter";
import { BUTTON_SAVE, USER_FILTER_NEW_SEGMENT_NAME, USER_FILTER_SAVE_DESCRIPTION } from "../../../ui-config/strings";
import { FormEvent } from "react";
import { FetchBuilder } from "@courselit/utils";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Address, AppMessage } from "@courselit/common-models";
import { ThunkDispatch } from "redux-thunk";
import { actionCreators } from "@courselit/state-management";
import { AnyAction } from "redux";

const { networkAction, setAppMessage } = actionCreators;

interface FilterSaveProps {
    filters: Filter[];
    address: Address;
    dispatch: AppDispatch;
    dismissPopover: (val: boolean, segments: {
        name: string,
        filters: Filter[]
        }) => void;
}

function FilterSave({
    filters,
    address,
    dispatch,
    dismissPopover
}: FilterSaveProps) {
    const [name, setName] = useState("");

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const mutation =`
                mutation {
                    segments: createSegment(
                        segmentData: {
                            name: "${name}",
                            filters: ${JSON.stringify(JSON.stringify(filters))}
                        } 
                    ) {
                       name,
                       filters {
                           name,
                           condition,
                           value
                       }
                    }
                }
            `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(mutation)
            .setIsGraphQLEndpoint(true)
            .build();
        try {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(true),
            );
            const response = await fetch.exec();
            if (response.segments) {
                console.log(response.segments)
            }
        } catch (err) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            (dispatch as ThunkDispatch<AppState, null, AnyAction>)(
                networkAction(false),
            );
            dismissPopover(true)
        }
    }

    return (
        <div className="max-w-[180px] p-1">
            <p className="text-xs text-slate-500 mb-2">{USER_FILTER_SAVE_DESCRIPTION}</p>
       <Form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <FormField 
            value={name}
            label={USER_FILTER_NEW_SEGMENT_NAME}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            onSubmit={onSubmit} />
            <div className="flex justify-end">
            <FormSubmit text={BUTTON_SAVE} className="" />
            </div>
       </Form>
       </div>
    )
}

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(FilterSave);
