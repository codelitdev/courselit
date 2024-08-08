import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
    TRANSACTION_FAILED,
    TRANSACTION_INITIATED,
    TRANSACTION_SUCCESS,
} from "../../ui-config/constants";
import {
    TRANSACTION_STATUS_FAILED,
    TRANSACTION_STATUS_FAILED_DETAILS,
    TRANSACTION_STATUS_INITIATED,
    TRANSACTION_STATUS_SUCCESS,
    TRANSACTION_STATUS_SUCCESS_DETAILS,
    VERIFY_PAYMENT_BUTTON,
    VISIT_COURSE_BUTTON,
    PURCHASE_ID_HEADER,
} from "../../ui-config/strings";
import dynamic from "next/dynamic";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { Address, AppMessage, Auth } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { Button, Button2 } from "@courselit/components-library";
import Link from "next/link";

const { networkAction, setAppMessage } = actionCreators;

const AppLoader = dynamic(() => import("../app-loader"));

interface PurchaseStatusProps {
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
    loading: boolean;
}

const PurchaseStatus = (props: PurchaseStatusProps) => {
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { id, source } = router.query;
    const courseLink: string = (source as string) || "";
    const { dispatch, address } = props;

    useEffect(() => {
        if (props.auth.checked && props.auth.guest) {
            router.push("/");
        }
    }, [props.auth.checked]);

    useEffect(() => {
        if (props.auth && !props.auth.guest) {
            getPaymentStatus();
        }
    }, [props.auth.guest]);

    const getPaymentStatus = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/verify`)
            .setHeaders({
                "Content-Type": "application/json",
            })
            .setPayload(JSON.stringify({ purchaseId: id as string }))
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetch.exec();
            setStatus(response.status);
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <>
            {status === TRANSACTION_SUCCESS && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">
                        {TRANSACTION_STATUS_SUCCESS}
                    </h3>
                    <p className="mb-2">{TRANSACTION_STATUS_SUCCESS_DETAILS}</p>
                    <Link href={courseLink}>
                        <Button2>{VISIT_COURSE_BUTTON}</Button2>
                    </Link>
                </div>
            )}
            {status === TRANSACTION_INITIATED && (
                <>
                    {loading ? (
                        <>
                            <AppLoader />
                        </>
                    ) : (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">
                                {TRANSACTION_STATUS_INITIATED}
                            </h3>
                            <p className="text-sm mb-8">
                                {PURCHASE_ID_HEADER}: {id}
                            </p>
                            <Button2
                                onClick={getPaymentStatus}
                                disabled={props.loading}
                            >
                                {VERIFY_PAYMENT_BUTTON}
                            </Button2>
                        </div>
                    )}
                </>
            )}
            {status === TRANSACTION_FAILED && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">
                        {TRANSACTION_STATUS_FAILED}
                    </h3>
                    <p className="mb-2">{TRANSACTION_STATUS_FAILED_DETAILS}</p>
                    <p className="text-sm mb-8">
                        {PURCHASE_ID_HEADER}: {id}
                    </p>
                    <Button component="link" href={courseLink}>
                        {VISIT_COURSE_BUTTON}
                    </Button>
                </div>
            )}
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
    loading: state.networkAction,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(PurchaseStatus);
