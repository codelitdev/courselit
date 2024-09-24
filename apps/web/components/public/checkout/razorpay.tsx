import React from "react";
import { Button2 } from "@courselit/components-library";
import { ENROLL_BUTTON_TEXT } from "../../../ui-config/strings";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import type { AppState, AppDispatch } from "@courselit/state-management";
import {
    Address,
    AppMessage,
    Course,
    Profile,
    SiteInfo,
} from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import Script from "next/script";

const { networkAction, setAppMessage } = actionCreators;

interface RazorpayProps {
    course: Course;
    siteInfo: SiteInfo;
    address: Address;
    dispatch: AppDispatch;
    profile: Profile;
}

const RazorpayComp = (props: RazorpayProps) => {
    const { course, siteInfo, address, dispatch, profile } = props;
    const router = useRouter();

    const verifySignature = async (response) => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/vendor/razorpay/verify`)
            .setHeaders({
                "Content-Type": "application/json",
            })
            .setPayload(
                JSON.stringify({
                    orderId: response.razorpay_order_id,
                    signature: response.razorpay_signature,
                    paymentId: response.razorpay_payment_id,
                }),
            )
            .build();

        try {
            dispatch(networkAction(true));
            const verifyResponse = await fetch.exec({
                redirectToOnUnAuth: router.asPath,
            });
            dispatch(networkAction(false));
            router.replace(
                `/checkout/${course.courseId}?id=${verifyResponse.purchaseId}&source=/course/${course.slug}/${course.courseId}`,
            );
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    const handleClick = async () => {
        const payload = {
            courseid: course.courseId,
            metadata: JSON.stringify({
                //     cancelUrl: `${address.frontend}${router.asPath}`,
                //     successUrl: `${address.frontend}/checkout/${course.courseId}`,
                //     sourceUrl: `/course/${course.slug}/${course.courseId}`,
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
            if (response.status === "initiated") {
                // @ts-ignore
                const rzp1 = new Razorpay({
                    name: course.title,
                    image: course.featuredImage?.file || siteInfo.logo?.file,
                    order_id: response.paymentTracker,
                    prefill: {
                        email: profile.email,
                    },
                    handler: function (response) {
                        verifySignature(response);
                    },
                    // callback_url: `${address.frontend}/checkout/${course.courseId}?id=${response.paymentTracker}`
                });
                rzp1.open();
            } else if (response.status === "success") {
                router.replace(`/course/${course.slug}/${course.courseId}`);
            }
        } catch (err: any) {
            dispatch(setAppMessage(new AppMessage(err.message)));
        } finally {
            dispatch(networkAction(false));
        }
    };

    return (
        <>
            <Button2 onClick={handleClick}>{ENROLL_BUTTON_TEXT}</Button2>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo,
    address: state.address,
    profile: state.profile,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(RazorpayComp);
