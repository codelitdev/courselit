import { SiteInfo, UIConstants } from "@courselit/common-models";
import { internal, responses } from "../config/strings";
import DomainModel, { Domain } from "../models/Domain";
import StripePayment from "./stripe-payment";
import RazorpayPayment from "./razorpay-payment";

const {
    error_unrecognised_payment_method: unrecognisedPaymentMethod,
    error_payment_method_not_implemented: notYetSupported,
} = internal;
const { update_payment_method: updatePaymentMethod } = responses;

export const getPaymentMethod = async (domainName: string) => {
    const domain: Domain | null = await DomainModel.findOne({
        _id: domainName,
    });
    const siteInfo: SiteInfo | null = domain && domain.settings;

    if (!siteInfo || !siteInfo.paymentMethod) {
        throw new Error(updatePaymentMethod);
    }

    switch (siteInfo.paymentMethod) {
        case UIConstants.PAYMENT_METHOD_PAYPAL:
            throw new Error(notYetSupported);
        case UIConstants.PAYMENT_METHOD_STRIPE:
            return await new StripePayment(siteInfo).setup();
        case UIConstants.PAYMENT_METHOD_RAZORPAY:
            return await new RazorpayPayment(siteInfo).setup();
        case UIConstants.PAYMENT_METHOD_PAYTM:
            throw new Error(notYetSupported);
        default:
            throw new Error(unrecognisedPaymentMethod);
    }
};
