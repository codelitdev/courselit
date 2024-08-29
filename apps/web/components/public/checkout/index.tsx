import React from "react";
import { connect } from "react-redux";
import dynamic from "next/dynamic";
import { Course, SiteInfo, UIConstants } from "@courselit/common-models";
import { AppState } from "@courselit/state-management";

const Stripe = dynamic(() => import("./stripe"));
const Razorpay = dynamic(() => import("./razorpay"));
const Free = dynamic(() => import("./free"));

interface CheckoutExternalProps {
    course: Course;
    siteInfo: SiteInfo;
}

const CheckoutExternal = (props: CheckoutExternalProps) => {
    const { course } = props;
    const { paymentMethod } = props.siteInfo;

    return (
        <div className="flex justify-end">
            {course.cost === 0 && <Free course={course} />}
            {course.cost !== 0 && (
                <>
                    {paymentMethod === UIConstants.PAYMENT_METHOD_STRIPE && (
                        <Stripe course={course} />
                    )}
                    {paymentMethod === UIConstants.PAYMENT_METHOD_RAZORPAY && (
                        <Razorpay course={course} />
                    )}
                    {paymentMethod === UIConstants.PAYMENT_METHOD_PAYTM && (
                        <></>
                    )}
                    {paymentMethod === UIConstants.PAYMENT_METHOD_PAYPAL && (
                        <></>
                    )}
                </>
            )}
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(CheckoutExternal);
