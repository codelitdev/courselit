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
import mongoose from "mongoose";

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

/*
export const getSiteInfoAsAdmin = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    const siteinfo: SiteInfo | null = await SiteInfoModel.findOne({
        domain: ctx.subdomain._id,
    });
    return siteinfo;
};
*/

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

export const addSSOProvider = async ({
    providerId,
    idpMetadata,
    entryPoint,
    cert,
    callbackUrl,
    domain,
    context: ctx,
}: {
    providerId: string;
    idpMetadata: string;
    entryPoint: string;
    cert: string;
    callbackUrl: string;
    domain: string;
    context: GQLContext;
}) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        throw new Error(responses.action_not_allowed);
    }

    const existingSSOProvider = await SSOProviderModel.findOne({
        providerId,
        domain: ctx.subdomain._id,
    });

    if (existingSSOProvider) {
        throw new Error(responses.sso_provider_already_exists);
    }

    const ssoProvider = await SSOProviderModel.create({
        id: new mongoose.Types.ObjectId(),
        providerId,
        samlConfig: JSON.stringify({
            entryPoint,
            cert,
            callbackUrl,
            idpMetadata: {
                metadata: idpMetadata,
            },
            spMetadata: {
                // metadata: `<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://localhost:3000/api/auth/sso/saml2/sp/metadata">
                //     <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="true" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
                //         <md:SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:3000/api/auth/sso/saml2/sp/slo"/>
                //         <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
                //         <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:3000/api/auth/sso/saml2/sp/acs" index="1"/>
                //     </md:SPSSODescriptor>
                //     </md:EntityDescriptor>`,
                // binding: "post",
            },
        }),
        domain_string: domain,
        domain: ctx.subdomain._id,
    });

    return ssoProvider;
};

export const getSSOProviders = async ({
    ctx,
    page = 1,
    limit = 10,
}: {
    ctx: GQLContext;
    page?: number;
    limit?: number;
}) => {
    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        return [];
    }

    const skip = (page - 1) * limit;

    const ssoProviders = await SSOProviderModel.find(
        {
            domain: ctx.subdomain._id,
        },
        {
            providerId: 1,
            domain_string: 1,
        },
    )
        .skip(skip)
        .limit(limit);

    return ssoProviders.map((ssoProvider) => ({
        providerId: ssoProvider.providerId,
        domain: ssoProvider.domain_string,
    }));
};

export const removeSSOProvider = async (
    providerId: string,
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        throw new Error(responses.action_not_allowed);
    }

    await SSOProviderModel.deleteOne({ providerId, domain: ctx.subdomain._id });

    return true;
};

export const getFeatures = async (ctx: GQLContext) => {
    await DomainModel.findOne({
        _id: ctx.subdomain._id,
    });

    return ctx.subdomain.features || [];
};

export const getLoginProviders = async (ctx: GQLContext) => {
    return ctx.subdomain.settings.logins?.length
        ? ctx.subdomain.settings.logins
        : [Constants.LoginProvider.EMAIL];
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
            if (
                value &&
                !ctx.subdomain.features?.includes(Constants.Features.SSO)
            ) {
                throw new Error(responses.action_not_allowed);
            }
            await saveLoginProvider({
                ctx,
                value,
                provider: Constants.LoginProvider.SSO,
            });
            break;
    }

    return getLoginProviders(ctx);
};
