import React, { useContext } from "react";
import { connect } from "react-redux";
import dynamic from "next/dynamic";
import {
    Constants,
    MembershipEntityType,
    PaymentPlan,
    UIConstants,
} from "@courselit/common-models";
import { AppState } from "@courselit/state-management";
import { SiteInfoContext } from "@components/contexts";

const Stripe = dynamic(() => import("./stripe"));
const Razorpay = dynamic(() => import("./razorpay"));
const Free = dynamic(() => import("./free"));

const CheckoutExternal = ({
    type,
    id,
    paymentPlan,
}: {
    type: MembershipEntityType;
    id: string;
    paymentPlan: PaymentPlan;
}) => {
    const siteinfo = useContext(SiteInfoContext);
    const { paymentMethod } = siteinfo;

    return (
        <div className="flex justify-end">
            {paymentPlan.type === Constants.PaymentPlanType.FREE && (
                <Free course={course} />
            )}
            {paymentPlan.type !== Constants.PaymentPlanType.FREE && (
                <>
                    {paymentMethod === UIConstants.PAYMENT_METHOD_STRIPE && (
                        <Stripe type={type} id={id} paymentPlan={paymentPlan} />
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
