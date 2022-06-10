import React from "react";
import { Button } from "@mui/material";
import { loadStripe } from "@stripe/stripe-js";
import { ENROLL_BUTTON_TEXT } from "../../../ui-config/strings";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import type { AppState, AppDispatch } from "@courselit/state-management";
import {
    Address,
    AppMessage,
    Auth,
    Course,
    SiteInfo,
} from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";

const { networkAction, setAppMessage } = actionCreators;

interface StripeProps {
    course: Course;
    siteInfo: SiteInfo;
    address: Address;
    dispatch: AppDispatch;
}

const Stripe = (props: StripeProps) => {
    const { course, siteInfo, address, dispatch } = props;
    const stripePromise = loadStripe(siteInfo.stripePublishableKey as string);
    const router = useRouter();

    const handleClick = async () => {
        const payload = {
            courseid: course.courseId,
            metadata: JSON.stringify({
                cancelUrl: `${address.frontend}${router.asPath}`,
                successUrl: `${address.frontend}/purchase`,
                sourceUrl: router.asPath,
            }),
        };
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/initiate`)
            .setHeaders({
                "Content-Type": "application/json",
            })
            .setPayload(JSON.stringify(payload))
            .build();

        try {
            dispatch(networkAction(true));
            const response = await fetch.exec({
                redirectToOnUnAuth: router.asPath,
            });
            dispatch(networkAction(false));
            response &&
                response.paymentTracker &&
                (await redirectToStripeCheckout({
                    stripe: await stripePromise,
                    sessionId: response.paymentTracker,
                }));
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const redirectToStripeCheckout = async ({
        stripe,
        sessionId,
    }: {
        stripe: any;
        sessionId: string;
    }) => {
        const result = await stripe.redirectToCheckout({
            sessionId,
        });
        if (result.error) {
        }
    };

    return (
        <Button
            onClick={handleClick}
            variant="outlined"
            color="primary"
            size="large"
        >
            {ENROLL_BUTTON_TEXT}
        </Button>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps)(Stripe);
