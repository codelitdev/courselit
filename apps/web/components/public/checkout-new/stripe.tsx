import React, { useContext } from "react";
import { Button2, useToast } from "@courselit/components-library";
import { loadStripe } from "@stripe/stripe-js";
import { CHECKOUT_BUTTON_TEXT } from "../../../ui-config/strings";
import { useRouter } from "next/router";
import { MembershipEntityType, PaymentPlan } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { actionCreators } from "@courselit/state-management";
import { AddressContext, SiteInfoContext } from "@components/contexts";

const { networkAction, setAppMessage } = actionCreators;

interface StripeProps {
    type: MembershipEntityType;
    id: string;
    paymentPlan: PaymentPlan;
    disabled: boolean;
}

const Stripe = ({ type, id, paymentPlan, disabled }: StripeProps) => {
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);
    const stripePromise = loadStripe(siteinfo.stripeKey as string);
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(false);

    const handleClick = async () => {
        const payload = {
            id: id,
            type: type,
            planId: paymentPlan.planId,
            metadata: {
                cancelUrl: `${address.frontend}${router.asPath}`,
                successUrl: `${address.frontend}/checkout?type=${type}&id=${id}&success=true`,
                sourceUrl: `${address.frontend}/checkout?type=${type}&id=${id}`,
            },
        };
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/payment/initiate-new`)
            .setHeaders({
                "Content-Type": "application/json",
            })
            .setPayload(JSON.stringify(payload))
            .build();

        try {
            setLoading(true);
            const response = await fetch.exec({
                redirectToOnUnAuth: router.asPath,
            });
            setLoading(false);
            if (response.status === "initiated") {
                await redirectToStripeCheckout({
                    stripe: await stripePromise,
                    sessionId: response.paymentTracker,
                });
            } else if (response.status === "success") {
                router.replace(`/checkout?type=${type}&id=${id}&success=true`);
            }
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message,
            });
        } finally {
            setLoading(false);
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
        <Button2 onClick={handleClick} disabled={disabled || loading}>
            {CHECKOUT_BUTTON_TEXT}
        </Button2>
    );
};

export default Stripe;
