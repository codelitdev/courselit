import { capitalize } from "../../lib/utils";
import { responses } from "../../config/strings";
import currencies from "@/data/currencies.json";
import {
    Constants,
    PaymentMethod,
    SiteInfo,
    UIConstants,
} from "@courselit/common-models";

const currencyISOCodes = currencies.map((currency) =>
    currency.isoCode?.toLowerCase(),
);

const verifyCurrencyISOCode = (isoCode: string) => {
    if (!currencyISOCodes.includes(isoCode.toLowerCase())) {
        throw new Error(responses.unrecognised_currency_code);
    }
};

const verifyCurrencyISOCodeBasedOnSiteInfo = (siteInfo: SiteInfo) => {
    if (!siteInfo.paymentMethod) {
        if (siteInfo.currencyISOCode) {
            verifyCurrencyISOCode(siteInfo.currencyISOCode);
        }
    } else {
        if (!siteInfo.currencyISOCode) {
            throw new Error(responses.currency_iso_code_required);
        }

        verifyCurrencyISOCode(siteInfo.currencyISOCode);
    }
};

export const checkForInvalidPaymentSettings = (
    siteInfo: SiteInfo,
): undefined | Error => {
    verifyCurrencyISOCodeBasedOnSiteInfo(siteInfo);

    if (!siteInfo.paymentMethod) {
        return;
    }

    if (!Constants.paymentMethods.includes(siteInfo.paymentMethod)) {
        return new Error(responses.invalid_payment_method);
    }
};

export const checkForInvalidPaymentMethodSettings = (
    siteInfo: SiteInfo,
): string | undefined => {
    if (!siteInfo.paymentMethod) {
        return;
    }

    let failedPaymentMethod: PaymentMethod | undefined = undefined;

    if (
        siteInfo.paymentMethod === UIConstants.PAYMENT_METHOD_PAYTM &&
        !siteInfo.paytmSecret
    ) {
        failedPaymentMethod = UIConstants.PAYMENT_METHOD_PAYTM;
    }

    if (
        siteInfo.paymentMethod === UIConstants.PAYMENT_METHOD_PAYPAL &&
        !siteInfo.paypalSecret
    ) {
        failedPaymentMethod = UIConstants.PAYMENT_METHOD_PAYPAL;
    }

    if (
        siteInfo.paymentMethod === UIConstants.PAYMENT_METHOD_STRIPE &&
        !(siteInfo.stripeSecret && siteInfo.stripeKey)
    ) {
        failedPaymentMethod = UIConstants.PAYMENT_METHOD_STRIPE;
    }

    if (
        siteInfo.paymentMethod === UIConstants.PAYMENT_METHOD_RAZORPAY &&
        !(siteInfo.razorpayKey && siteInfo.razorpaySecret)
    ) {
        failedPaymentMethod = UIConstants.PAYMENT_METHOD_RAZORPAY;
    }

    return failedPaymentMethod;
};

export const getPaymentInvalidException = (paymentMethod: string) =>
    new Error(
        `${capitalize(paymentMethod)} ${
            responses.payment_settings_invalid_suffix
        }`,
    );
