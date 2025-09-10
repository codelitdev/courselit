"use client";

import React, { useEffect, useState } from "react";
import { Button2, useToast } from "@courselit/components-library";
import {
    ENROLL_BUTTON_TEXT,
    TOAST_TITLE_ERROR,
    WORKING,
} from "../../../ui-config/strings";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import type { AppState, AppDispatch } from "@courselit/state-management";
import { Address, Course } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import Script from "next/script";

const { networkAction } = actionCreators;

interface LemonsqueezyProps {
    course: Course;
    address: Address;
    dispatch: AppDispatch;
}

const Lemonsqueezy = (props: LemonsqueezyProps) => {
    const { course, address, dispatch } = props;
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleClick = async () => {
        const payload = {
            courseid: course.courseId,
            metadata: JSON.stringify({
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
            setLoading(true);
            const response = await fetch.exec({
                redirectToOnUnAuth: router.asPath,
            });
            dispatch(networkAction(false));
            if (response.status === "initiated") {
                (window as any).LemonSqueezy.Url.Open(response.paymentTracker);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        function setupLemonSqueezy() {
            if (typeof (window as any).createLemonSqueezy !== "undefined") {
                (window as any).createLemonSqueezy();
            }
        }

        setupLemonSqueezy();
    });

    return (
        <>
            <Button2 onClick={handleClick} disabled={loading}>
                {loading ? WORKING : ENROLL_BUTTON_TEXT}
            </Button2>
            <Script
                src="https://app.lemonsqueezy.com/js/lemon.js"
                id="lemonsqueezy"
                strategy="beforeInteractive"
            />
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(Lemonsqueezy);
