import React from "react";
import { Button, useToast } from "@courselit/components-library";
import {
    ENROLL_BUTTON_TEXT,
    TOAST_TITLE_ERROR,
} from "../../../ui-config/strings";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import type { AppState, AppDispatch } from "@courselit/state-management";
import { Address, Course, SiteInfo } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";

const { networkAction } = actionCreators;

interface MercadoPagoProps {
    course: Course;
    siteInfo: SiteInfo;
    address: Address;
    dispatch: AppDispatch;
}

const MercadoPago = (props: MercadoPagoProps) => {
    const { course, siteInfo, address, dispatch } = props;
    const router = useRouter();
    const { toast } = useToast();

    const handleClick = async () => {
        const payload = {
            courseid: course.courseId,
            metadata: JSON.stringify({
                cancelUrl: `${address.frontend}${router.asPath}`,
                successUrl: `${address.frontend}/checkout/${course.courseId}`,
                sourceUrl: `/course/${course.slug}/${course.courseId}`,
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
                // If the API returns a payment URL, use it for redirection
                if (response.paymentUrl) {
                    window.location.href = response.paymentUrl;
                } else {
                    // Fallback to the old behavior
                    router.push(`/checkout/${course.courseId}?id=${response.paymentTracker}`);
                }
            } else if (response.status === "success") {
                router.replace(`/course/${course.slug}/${course.courseId}`);
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            dispatch(networkAction(false));
        }
    };

    return <Button onClick={handleClick}>{ENROLL_BUTTON_TEXT}</Button>;
};

const mapStateToProps = (state: AppState) => ({
    siteInfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(MercadoPago);
