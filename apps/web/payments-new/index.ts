import { SiteInfo, UIConstants } from "@courselit/common-models";
import { internal } from "../config/strings";
import DomainModel, { Domain } from "../models/Domain";
import StripePayment from "./stripe-payment";
import RazorpayPayment from "./razorpay-payment";
import LemonSqueezyPayment from "./lemonsqueezy-payment";
import PayPalPayment from "./paypal-payment";

const { error_unrecognised_payment_method: unrecognisedPaymentMethod } =
    internal;

export const getPaymentMethod = async (domainName: string) => {
    const domain: Domain | null = await DomainModel.findOne({
        _id: domainName,
    });
    const siteInfo: SiteInfo | null = domain && domain.settings;

    return await getPaymentMethodFromSettings(siteInfo);
};

export const getPaymentMethodFromSettings = async (
    siteInfo: Domain["settings"] | null,
    name?: string,
) => {
    if (!siteInfo || !siteInfo.paymentMethod) {
        return null;
    }

    switch (name || siteInfo.paymentMethod) {
        case UIConstants.PAYMENT_METHOD_PAYPAL:
            return await new PayPalPayment(siteInfo).setup();
        case UIConstants.PAYMENT_METHOD_STRIPE:
            return await new StripePayment(siteInfo).setup();
        case UIConstants.PAYMENT_METHOD_RAZORPAY:
            return await new RazorpayPayment(siteInfo).setup();
        case UIConstants.PAYMENT_METHOD_LEMONSQUEEZY:
            return await new LemonSqueezyPayment(siteInfo).setup();
        case UIConstants.PAYMENT_METHOD_PAYTM:
            throw new Error(internal.error_payment_method_not_implemented);
        default:
            throw new Error(unrecognisedPaymentMethod);
    }
};
