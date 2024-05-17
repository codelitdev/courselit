import { Address, AppMessage } from "@courselit/common-models";
import { Form, FormField, FormSubmit } from "@courselit/components-library";
import { AppDispatch, AppState } from "@courselit/state-management";
import {
    networkAction,
    setAppMessage,
} from "@courselit/state-management/dist/action-creators";
import { FetchBuilder, capitalize } from "@courselit/utils";
import {
    MAIL_REQUEST_FORM_REASON_FIELD,
    MAIL_REQUEST_FORM_REASON_PLACEHOLDER,
    MAIL_REQUEST_FORM_SUBMIT_INITIAL_REQUEST_TEXT,
    MAIL_REQUEST_FORM_SUBMIT_UPDATE_REQUEST_TEXT,
    MAIL_REQUEST_RECEIVED,
} from "@ui-config/strings";
import { ChangeEvent, useEffect, useState } from "react";
import { connect } from "react-redux";

interface RequestFormProps {
    address: Address;
    dispatch: AppDispatch;
    loading: boolean;
}

const RequestForm = ({ address, dispatch, loading }: RequestFormProps) => {
    const [reason, setReason] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");

    useEffect(() => {
        const loadMailRequestStatus = async () => {
            const query = `
            query {
                getMailRequest {
                    reason,
                    message,
                    status
                }
            }
            `;

            try {
                const fetch = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
                    .setIsGraphQLEndpoint(true)
                    .setPayload(query)
                    .build();
                dispatch(networkAction(true));
                const response = await fetch.exec();
                if (response.getMailRequest) {
                    const { reason, message, status } = response.getMailRequest;
                    setReason(reason);
                    setMessage(message);
                    setStatus(status);
                }
            } catch (e: any) {
                dispatch(setAppMessage(new AppMessage(e.message)));
            } finally {
                dispatch(networkAction(false));
            }
        };

        loadMailRequestStatus();
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!reason) {
            return;
        }

        const mutation = `
        mutation updateMailRequest(
            $reason: String!
        ) {
            updateMailRequest(reason: $reason) {
                reason,
                message,
                status
            }
        }
        `;

        try {
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setIsGraphQLEndpoint(true)
                .setPayload({
                    query: mutation,
                    variables: {
                        reason,
                    },
                })
                .build();
            dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.updateMailRequest) {
                dispatch(setAppMessage(new AppMessage(MAIL_REQUEST_RECEIVED)));
            }
        } catch (e: any) {
            dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <Form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FormField
                    component="textarea"
                    value={reason}
                    multiline="true"
                    rows={5}
                    label={MAIL_REQUEST_FORM_REASON_FIELD}
                    placeholder={MAIL_REQUEST_FORM_REASON_PLACEHOLDER}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setReason(e.target.value)
                    }
                />
                <div>
                    <FormSubmit
                        text={
                            !status
                                ? MAIL_REQUEST_FORM_SUBMIT_INITIAL_REQUEST_TEXT
                                : MAIL_REQUEST_FORM_SUBMIT_UPDATE_REQUEST_TEXT
                        }
                        disabled={loading || !reason}
                    />
                </div>
            </Form>
            <div>
                {status && (
                    <p>
                        <span className="font-semibold">Status:</span>{" "}
                        {capitalize(status)}
                    </p>
                )}
                {message && (
                    <p>
                        <span className="font-semibold">Our response:</span>{" "}
                        {capitalize(message)}
                    </p>
                )}
            </div>
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(RequestForm);
