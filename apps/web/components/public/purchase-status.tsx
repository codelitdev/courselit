import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
    TRANSACTION_FAILED,
    TRANSACTION_INITIATED,
    TRANSACTION_SUCCESS,
} from "../../ui-config/constants";
import { Button, Grid, Typography } from "@mui/material";
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
import Link from "next/link";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { Address, AppMessage, Auth } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";

const { networkAction, setAppMessage } = actionCreators;

const AppLoader = dynamic(() => import("../app-loader"));

interface PurchaseStatusProps {
    auth: Auth;
    address: Address;
    dispatch: AppDispatch;
}

const PurchaseStatus = (props: PurchaseStatusProps) => {
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { id, source } = router.query;
    const courseLink = source || "";
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
        <Section>
            <Grid container>
                {status === TRANSACTION_SUCCESS && (
                    <Grid item container direction="column" spacing={4}>
                        <Grid item>
                            <Typography variant="h2">
                                {TRANSACTION_STATUS_SUCCESS}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Typography variant="body1" color="textSecondary">
                                {TRANSACTION_STATUS_SUCCESS_DETAILS}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Link href={courseLink}>
                                <Button variant="outlined" color="primary">
                                    {VISIT_COURSE_BUTTON}
                                </Button>
                            </Link>
                        </Grid>
                    </Grid>
                )}
                {status === TRANSACTION_INITIATED && (
                    <>
                        {loading ? (
                            <>
                                <AppLoader />
                            </>
                        ) : (
                            <Grid item container direction="column" spacing={4}>
                                <Grid item>
                                    <Typography variant="h2">
                                        {TRANSACTION_STATUS_INITIATED}
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <Typography variant="subtitle2">
                                        {PURCHASE_ID_HEADER}: {id}
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={getPaymentStatus}
                                    >
                                        {VERIFY_PAYMENT_BUTTON}
                                    </Button>
                                </Grid>
                            </Grid>
                        )}
                    </>
                )}
                {status === TRANSACTION_FAILED && (
                    <Grid item container direction="column" spacing={4}>
                        <Grid item>
                            <Typography variant="h2">
                                {TRANSACTION_STATUS_FAILED}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Typography variant="body1" color="textSecondary">
                                {TRANSACTION_STATUS_FAILED_DETAILS}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Typography variant="subtitle2">
                                {PURCHASE_ID_HEADER}: {id}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Link href={courseLink}>
                                <Button variant="outlined" color="primary">
                                    {VISIT_COURSE_BUTTON}
                                </Button>
                            </Link>
                        </Grid>
                    </Grid>
                )}
            </Grid>
        </Section>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(PurchaseStatus);
