import constants from "../config/constants";
import { internal, responses } from "../config/strings";
import StripePayment from "./stripe-payment";
import SiteInfoModel, { SiteInfo } from "../models/SiteInfo";

const { paypal, stripe, paytm } = constants;
const {
    error_unrecognised_payment_method: unrecognisedPaymentMethod,
    error_payment_method_not_implemented: notYetSupported,
} = internal;
const { update_payment_method: updatePaymentMethod } = responses;

export const getPaymentMethod = async (domain: string) => {
    const siteInfo: SiteInfo | null = await SiteInfoModel.findOne({ domain });

    if (!siteInfo) {
        throw new Error(updatePaymentMethod);
    }

    switch (siteInfo.paymentMethod) {
        case paypal:
            throw new Error(notYetSupported);
        case stripe:
            return await new StripePayment(siteInfo).setup();
        case paytm:
            throw new Error(notYetSupported);
        default:
            throw new Error(unrecognisedPaymentMethod);
    }
};
