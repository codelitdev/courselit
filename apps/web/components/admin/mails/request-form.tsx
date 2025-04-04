import { Address } from "@courselit/common-models";
import {
    Form,
    FormField,
    FormSubmit,
    useToast,
} from "@courselit/components-library";
import { AppDispatch } from "@courselit/state-management";
import { networkAction } from "@courselit/state-management/dist/action-creators";
import { FetchBuilder, capitalize } from "@courselit/utils";
import {
    TOAST_TITLE_ERROR,
    MAIL_REQUEST_FORM_REASON_FIELD,
    MAIL_REQUEST_FORM_REASON_PLACEHOLDER,
    MAIL_REQUEST_FORM_SUBMIT_INITIAL_REQUEST_TEXT,
    MAIL_REQUEST_FORM_SUBMIT_UPDATE_REQUEST_TEXT,
    MAIL_REQUEST_RECEIVED,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { ChangeEvent, useEffect, useState } from "react";

interface RequestFormProps {
    address: Address;
    loading?: boolean;
    dispatch?: AppDispatch;
}

const RequestForm = ({ address, dispatch, loading }: RequestFormProps) => {
    const [reason, setReason] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState("");
    const { toast } = useToast();

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
                dispatch && dispatch(networkAction(true));
                const response = await fetch.exec();
                if (response.getMailRequest) {
                    const { reason, message, status } = response.getMailRequest;
                    setReason(reason);
                    setMessage(message);
                    setStatus(status);
                }
            } catch (e: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: e.message,
                    variant: "destructive",
                });
            } finally {
                dispatch && dispatch(networkAction(false));
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
            dispatch && dispatch(networkAction(true));
            const response = await fetch.exec();
            if (response.updateMailRequest) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: MAIL_REQUEST_RECEIVED,
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            dispatch && dispatch(networkAction(false));
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

export default RequestForm;
