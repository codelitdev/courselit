import { capitalize } from "../../lib/utils";
import constants from "../../config/constants";
import { responses } from "../../config/strings";
import { SiteInfo } from "../../models/SiteInfo";
const { paypal, stripe, paytm, none, currencyISOCodes } = constants;

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
    siteInfo: SiteInfo
): undefined | Error => {
    verifyCurrencyISOCodeBasedOnSiteInfo(siteInfo);

    if (!siteInfo.paymentMethod) {
        return;
    }

    if (!siteInfo.currencyUnit) {
        return new Error(responses.currency_unit_required);
    }

    if (![paypal, stripe, paytm, none].includes(siteInfo.paymentMethod)) {
        return new Error(responses.invalid_payment_method);
    }
};

export const checkForInvalidPaymentMethodSettings = (
    siteInfo: SiteInfo
): string | undefined => {
    if (!siteInfo.paymentMethod) {
        return;
    }

    let failedPaymentMethod = undefined;

    if (siteInfo.paymentMethod === paytm && !siteInfo.paytmSecret) {
        failedPaymentMethod = paytm;
    }

    if (siteInfo.paymentMethod === paypal && !siteInfo.paypalSecret) {
        failedPaymentMethod = paypal;
    }

    if (
        siteInfo.paymentMethod === stripe &&
        !(siteInfo.stripeSecret && siteInfo.stripePublishableKey)
    ) {
        failedPaymentMethod = stripe;
    }

    return failedPaymentMethod;
};

export const getPaymentInvalidException = (paymentMethod: string) =>
    new Error(
        `${capitalize(paymentMethod)} ${
            responses.payment_settings_invalid_suffix
        }`
    );
