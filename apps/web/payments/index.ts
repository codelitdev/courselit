import constants from "../config/constants";
import { internal, responses } from "../config/strings";
import DomainModel, { Domain } from "../models/Domain";
import { SiteInfo } from "../models/SiteInfo";
import StripePayment from "./stripe-payment";

const { paypal, stripe, paytm } = constants;
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
