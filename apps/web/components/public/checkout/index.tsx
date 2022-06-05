import React from "react";
import { connect } from "react-redux";
import {
    PAYMENT_METHOD_PAYPAL,
    PAYMENT_METHOD_PAYTM,
    PAYMENT_METHOD_STRIPE,
} from "../../../ui-config/constants";
import dynamic from "next/dynamic";
import { Course, SiteInfo } from "@courselit/common-models";
import { AppState } from "@courselit/state-management";

const Stripe = dynamic(() => import("./stripe"));
const Free = dynamic(() => import("./free"));

interface CheckoutExternalProps {
    course: Course;
    siteInfo: SiteInfo;
}

const CheckoutExternal = (props: CheckoutExternalProps) => {
    const { course } = props;
    const { paymentMethod } = props.siteInfo;

    return (
        <>
            {course.cost === 0 && <Free course={course} />}
            {course.cost !== 0 && (
                <>
                    {paymentMethod === PAYMENT_METHOD_STRIPE && (
                        <Stripe course={course} />
                    )}
                    {paymentMethod === PAYMENT_METHOD_PAYTM && <></>}
                    {paymentMethod === PAYMENT_METHOD_PAYPAL && <></>}
                </>
            )}
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(CheckoutExternal);
