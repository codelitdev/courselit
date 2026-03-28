import { capitalize } from "../../lib/utils";
import { responses } from "../../config/strings";
import currencies from "@/data/currencies.json";
import {
    Constants,
    LoginProvider,
    PaymentMethod,
    SiteInfo,
    UIConstants,
} from "@courselit/common-models";
import GQLContext from "@models/GQLContext";

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

    if (
        siteInfo.paymentMethod === UIConstants.PAYMENT_METHOD_LEMONSQUEEZY &&
        !(
            siteInfo.lemonsqueezyKey &&
            siteInfo.lemonsqueezyStoreId &&
            siteInfo.lemonsqueezyOneTimeVariantId &&
            siteInfo.lemonsqueezySubscriptionMonthlyVariantId &&
            siteInfo.lemonsqueezySubscriptionYearlyVariantId
        )
    ) {
        failedPaymentMethod = UIConstants.PAYMENT_METHOD_LEMONSQUEEZY;
    }

    return failedPaymentMethod;
};

export const getPaymentInvalidException = (paymentMethod: string) =>
    new Error(
        `${capitalize(paymentMethod)} ${
            responses.payment_settings_invalid_suffix
        }`,
    );

export async function saveLoginProvider({
    ctx,
    value,
    provider,
}: {
    ctx: GQLContext;
    value: boolean;
    provider: LoginProvider;
}) {
    const loginsSet = new Set(ctx.subdomain.settings.logins || []);
    if (value) {
        loginsSet.add(provider);
    } else {
        loginsSet.delete(provider);
    }
    const logins = Array.from(loginsSet);
    if (!logins.length) {
        logins.push(Constants.LoginProvider.EMAIL);
    }
    ctx.subdomain.settings.logins = logins;
    await (ctx.subdomain as any).save();
}
