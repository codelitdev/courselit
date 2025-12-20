import { checkIfAuthenticated } from "../../lib/graphql";
import { responses } from "../../config/strings";
import constants from "../../config/constants";
import {
    checkForInvalidPaymentSettings,
    checkForInvalidPaymentMethodSettings,
    getPaymentInvalidException,
    saveLoginProvider,
} from "./helpers";
import type GQLContext from "../../models/GQLContext";
import DomainModel, { Domain } from "../../models/Domain";
import { checkPermission } from "@courselit/utils";
import { Constants, LoginProvider, Typeface } from "@courselit/common-models";
import ApikeyModel, { ApiKey } from "@models/ApiKey";
import SSOProviderModel from "@models/SSOProvider";

const { permissions } = constants;

export const getSiteInfo = async (ctx: GQLContext) => {
    const exclusionProjection: Record<string, 0> = {
        email: 0,
        deleted: 0,
        customDomain: 0,
        "settings.stripeSecret": 0,
        "settings.paytmSecret": 0,
        "settings.paypalSecret": 0,
        "settings.razorpaySecret": 0,
        "settings.razorpayWebhookSecret": 0,
    };
    const isSiteEditor =
        ctx.user &&
        checkPermission(ctx.user.permissions, [permissions.manageSite]);
    if (!isSiteEditor) {
        exclusionProjection.draftTypefaces = 0;
        exclusionProjection.lastEditedThemeId = 0;
    }
    const domain: Domain | null = await DomainModel.findById(
        ctx.subdomain._id,
        exclusionProjection,
    );

    return domain;
};

export const updateSiteInfo = async (
    siteData: Record<string, unknown>,
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    const domain: Domain | null = await DomainModel.findById(ctx.subdomain._id);
    if (!domain) {
        return null;
    }

    if (!domain.settings) {
        domain.settings = {};
    }

    for (const key of Object.keys(siteData)) {
        domain.settings[key] = siteData[key];
    }

    validateSiteInfo(domain);

    await (domain as any).save();

    return domain;
};

function validateSiteInfo(domain: Domain) {
    if (!domain.settings.title || !domain.settings.title.trim()) {
        throw new Error(responses.school_title_not_set);
    }

    if (
        domain.settings.mailingAddress &&
        domain.settings.mailingAddress.trim().length <
            constants.minMailingAddressLength
    ) {
        throw new Error(responses.mailing_address_too_short);
    }
}

export const updateDraftTypefaces = async (
    typefaces: Typeface[],
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    const domain: Domain | null = await DomainModel.findById(ctx.subdomain._id);
    if (!domain) {
        return null;
    }

    domain.draftTypefaces = typefaces;

    await (domain as any).save();

    return domain;
};

export const updatePaymentInfo = async (
    siteData: Record<string, unknown>,
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    const domain: Domain | null = await DomainModel.findById(ctx.subdomain._id);
    if (!domain) {
        return null;
    }

    if (!domain.settings || !domain.settings.title) {
        throw new Error(responses.school_title_not_set);
    }

    for (const key of Object.keys(siteData)) {
        domain.settings[key] = siteData[key];
    }

    const invalidPaymentMethod = checkForInvalidPaymentSettings(
        domain.settings,
    );
    if (invalidPaymentMethod) {
        throw invalidPaymentMethod;
    }

    const failedPaymentMethod = checkForInvalidPaymentMethodSettings(
        domain.settings,
    );
    if (failedPaymentMethod) {
        throw getPaymentInvalidException(failedPaymentMethod);
    }

    if (domain.settings.paymentMethod) {
        domain.settings.currencyISOCode =
            domain.settings.currencyISOCode?.toLowerCase();
    }
    await (domain as any).save();

    return domain;
};

export const getApikeys = async (ctx: GQLContext) => {
    if (!ctx.subdomain.features?.includes(Constants.Features.API)) {
        return [];
    }

    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    const apikeys: ApiKey[] = await ApikeyModel.find(
        { domain: ctx.subdomain._id },
        {
            name: 1,
            keyId: 1,
            createdAt: 1,
        },
    );

    return apikeys;
};

export const addApikey = async (name: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.features?.includes(Constants.Features.API)) {
        throw new Error(responses.action_not_allowed);
    }

    const existingApikey = await ApikeyModel.findOne({
        name,
        domain: ctx.subdomain._id,
    });

    if (existingApikey) {
        throw new Error(responses.apikey_already_exists);
    }

    const apikey: ApiKey = await ApikeyModel.create({
        name,
        domain: ctx.subdomain._id,
    });

    return {
        name: apikey.name,
        keyId: apikey.keyId,
        key: apikey.key,
    };
};

export const removeApikey = async (keyId: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.features?.includes(Constants.Features.API)) {
        throw new Error(responses.action_not_allowed);
    }

    await ApikeyModel.deleteOne({ keyId, domain: ctx.subdomain._id });

    return true;
};

export const updateSSOProvider = async ({
    idpMetadata,
    entryPoint,
    cert,
    backend,
    context: ctx,
}: {
    idpMetadata: string;
    entryPoint: string;
    cert: string;
    backend: string;
    context: GQLContext;
}) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        throw new Error(responses.action_not_allowed);
    }

    if (!idpMetadata || !entryPoint || !cert || !backend) {
        throw new Error(responses.provider_invalid_configuration);
    }

    const backendUrl = new URL(backend);

    try {
        const ssoProvider = await SSOProviderModel.findOneAndUpdate(
            {
                domain: ctx.subdomain._id,
            },
            {
                providerId: "sso",
                samlConfig: JSON.stringify({
                    entryPoint,
                    cert,
                    callbackUrl: `${backendUrl.origin}/api/auth/sso/saml2/callback/sso`,
                    idpMetadata: {
                        metadata: idpMetadata,
                    },
                    spMetadata: {},
                }),
                domain_string: backendUrl.hostname,
                domain: ctx.subdomain._id,
            },
            {
                upsert: true,
                new: true,
            },
        );

        if (entryPoint) {
            ctx.subdomain.settings.ssoTrustedDomain = new URL(
                entryPoint,
            ).origin;
            (ctx.subdomain as any).markModified("settings");
            await (ctx.subdomain as any).save();
        }

        return ssoProvider;
    } catch (error: any) {
        throw error;
    }
};

export const getSSOProviderSettings = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        throw new Error(responses.action_not_allowed);
    }

    const ssoProvider = await SSOProviderModel.findOne({
        domain: ctx.subdomain._id,
    });

    if (!ssoProvider) {
        return null;
    }

    const samlConfig = JSON.parse(ssoProvider?.samlConfig || "{}");

    return {
        idpMetadata: samlConfig?.idpMetadata?.metadata,
        entryPoint: samlConfig?.entryPoint,
        cert: samlConfig?.cert,
    };
};

export const getSSOProvider = async (ctx: GQLContext) => {
    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        return null;
    }

    const ssoProvider = await SSOProviderModel.findOne(
        {
            domain: ctx.subdomain._id,
        },
        {
            providerId: 1,
            domain_string: 1,
        },
    );

    if (!ssoProvider) {
        return null;
    }

    return {
        providerId: ssoProvider.providerId,
        domain: ssoProvider.domain_string,
    };
};

export const removeSSOProvider = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        throw new Error(responses.action_not_allowed);
    }

    await SSOProviderModel.deleteMany({ domain: ctx.subdomain._id });

    await toggleLoginProvider({
        provider: Constants.LoginProvider.SSO,
        value: false,
        ctx,
    });

    ctx.subdomain.settings.ssoTrustedDomain = undefined;
    (ctx.subdomain as any).markModified("settings");
    await (ctx.subdomain as any).save();

    return true;
};

export const getFeatures = async (ctx: GQLContext) => {
    await DomainModel.findOne({
        _id: ctx.subdomain._id,
    });

    return ctx.subdomain.features || [];
};

export const toggleLoginProvider = async ({
    provider,
    value,
    ctx,
}: {
    provider: LoginProvider;
    value: boolean;
    ctx: GQLContext;
}) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    switch (provider) {
        case Constants.LoginProvider.EMAIL:
            if (
                !value &&
                (ctx.subdomain.settings.logins?.length === 0 ||
                    (ctx.subdomain.settings.logins?.length === 1 &&
                        ctx.subdomain.settings.logins.includes(
                            Constants.LoginProvider.EMAIL,
                        )))
            ) {
                throw new Error(responses.action_not_allowed);
            }
            await saveLoginProvider({
                ctx,
                value,
                provider: Constants.LoginProvider.EMAIL,
            });
            break;
        case Constants.LoginProvider.SSO:
            if (value) {
                if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
                    throw new Error(responses.action_not_allowed);
                }

                const ssoProviders = await SSOProviderModel.find({
                    domain: ctx.subdomain._id,
                });

                if (ssoProviders.length === 0) {
                    throw new Error(responses.provider_not_configured);
                }
            }
            await saveLoginProvider({
                ctx,
                value,
                provider: Constants.LoginProvider.SSO,
            });
            break;
    }

    return ctx.subdomain.settings.logins || [Constants.LoginProvider.EMAIL];
};
