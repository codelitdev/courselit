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
import {
    Constants,
    Features,
    LoginProvider,
    Media,
    Typeface,
} from "@courselit/common-models";
import ApikeyModel, { ApiKey } from "@models/ApiKey";
import SSOProviderModel from "@models/SSOProvider";
import { sealMedia } from "@/services/medialit";
import {
    getLoginProviderDefinition,
    LOGIN_PROVIDER_REGISTRY,
    RuntimeLoginProvider,
} from "@/lib/login-providers";
import { invalidateDomainCache } from "@/lib/domain-cache";

const { permissions } = constants;

const GOOGLE_PROVIDER_ID = getLoginProviderDefinition(
    Constants.LoginProvider.GOOGLE,
)?.providerId;
const SAML_PROVIDER_ID = getLoginProviderDefinition(
    Constants.LoginProvider.SSO,
)?.providerId;

if (!GOOGLE_PROVIDER_ID || !SAML_PROVIDER_ID) {
    throw new Error("Login provider registry is missing required provider IDs");
}

type StoredOIDCConfig = {
    clientId?: string;
    clientSecret?: string;
    scopes?: string[];
    pkce?: boolean;
    mapping?: Record<string, unknown>;
};

const buildGoogleOIDCConfig = ({
    clientId,
    clientSecret,
}: {
    clientId: string;
    clientSecret: string;
}) => ({
    clientId,
    clientSecret,
    scopes: ["openid", "email", "profile"],
    pkce: true,
    mapping: {
        id: "sub",
        email: "email",
        emailVerified: "email_verified",
        name: "name",
        image: "picture",
    },
});

const parseOIDCConfig = (oidcConfig?: string): StoredOIDCConfig => {
    if (!oidcConfig) {
        return {};
    }

    return JSON.parse(oidcConfig) as StoredOIDCConfig;
};

const isSAMLProviderConfigured = (samlConfig?: string) => {
    const parsed = JSON.parse(samlConfig || "{}");
    return !!(parsed.entryPoint && parsed.cert && parsed.idpMetadata?.metadata);
};

const isGoogleProviderConfigured = (oidcConfig?: string) => {
    const parsed = parseOIDCConfig(oidcConfig);
    return !!(parsed.clientId && parsed.clientSecret);
};

const isExternalProviderConfigured = ({
    provider,
    oidcConfig,
    samlConfig,
}: {
    provider: LoginProvider;
    oidcConfig?: string;
    samlConfig?: string;
}) => {
    switch (provider) {
        case Constants.LoginProvider.GOOGLE:
            return isGoogleProviderConfigured(oidcConfig);
        case Constants.LoginProvider.SSO:
            return isSAMLProviderConfigured(samlConfig);
        default:
            return false;
    }
};

const assertCanManageSettings = (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageSettings])) {
        throw new Error(responses.action_not_allowed);
    }
};

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

    if (Object.prototype.hasOwnProperty.call(siteData, "logo")) {
        domain.settings.logo = (siteData.logo as Media)?.mediaId
            ? await sealMedia((siteData.logo as Media).mediaId)
            : undefined;
    }

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

export const resetPaymentMethod = async (ctx: GQLContext) => {
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

    domain.settings.paymentMethod = "";
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
    assertCanManageSettings(ctx);

    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        throw new Error(responses.action_not_allowed);
    }

    if (!idpMetadata || !entryPoint || !cert || !backend) {
        throw new Error(responses.provider_invalid_configuration);
    }

    const backendUrl = new URL(backend);
    const spEntityId = `${backendUrl.origin}/api/auth/sso/saml2/sp/metadata?providerId=${SAML_PROVIDER_ID}`;

    try {
        const ssoProvider = await SSOProviderModel.findOneAndUpdate(
            {
                domain: ctx.subdomain._id,
                providerId: SAML_PROVIDER_ID,
            },
            {
                providerId: SAML_PROVIDER_ID,
                issuer: spEntityId,
                samlConfig: JSON.stringify({
                    issuer: spEntityId,
                    entryPoint,
                    cert,
                    callbackUrl: `${backendUrl.origin}/api/auth/sso/saml2/sp/acs/${SAML_PROVIDER_ID}`,
                    idpMetadata: {
                        metadata: idpMetadata,
                    },
                    spMetadata: {
                        entityID: spEntityId,
                    },
                }),
                domain_string: backendUrl.hostname,
                domain: ctx.subdomain._id,
            },
            {
                upsert: true,
                new: true,
            },
        );

        ctx.subdomain.settings.ssoTrustedDomain = new URL(entryPoint).origin;
        (ctx.subdomain as any).markModified("settings");
        await (ctx.subdomain as any).save();
        invalidateDomainCache(ctx.subdomain.name);

        return ssoProvider;
    } catch (error: any) {
        throw error;
    }
};

export const getSSOProviderSettings = async (ctx: GQLContext) => {
    assertCanManageSettings(ctx);

    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        throw new Error(responses.action_not_allowed);
    }

    const ssoProvider = await SSOProviderModel.findOne({
        domain: ctx.subdomain._id,
        providerId: SAML_PROVIDER_ID,
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
            providerId: SAML_PROVIDER_ID,
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

export const getGoogleProviderSettings = async (ctx: GQLContext) => {
    assertCanManageSettings(ctx);

    const googleProvider = await SSOProviderModel.findOne({
        domain: ctx.subdomain._id,
        providerId: GOOGLE_PROVIDER_ID,
    });

    if (!googleProvider) {
        return null;
    }

    const oidcConfig = parseOIDCConfig(googleProvider.oidcConfig);

    return {
        clientId: oidcConfig.clientId || "",
        hasClientSecret: !!oidcConfig.clientSecret,
    };
};

export const updateGoogleProvider = async ({
    clientId,
    clientSecret,
    backend,
    context: ctx,
}: {
    clientId: string;
    clientSecret?: string;
    backend: string;
    context: GQLContext;
}) => {
    assertCanManageSettings(ctx);

    if (!clientId || !backend) {
        throw new Error(responses.provider_invalid_configuration);
    }

    const existingProvider = await SSOProviderModel.findOne({
        domain: ctx.subdomain._id,
        providerId: GOOGLE_PROVIDER_ID,
    });
    const existingConfig = parseOIDCConfig(existingProvider?.oidcConfig);
    const resolvedClientSecret = clientSecret || existingConfig.clientSecret;

    if (!resolvedClientSecret) {
        throw new Error(responses.provider_invalid_configuration);
    }

    const backendUrl = new URL(backend);

    const googleProvider = await SSOProviderModel.findOneAndUpdate(
        {
            domain: ctx.subdomain._id,
            providerId: GOOGLE_PROVIDER_ID,
        },
        {
            providerId: GOOGLE_PROVIDER_ID,
            issuer: "https://accounts.google.com",
            oidcConfig: JSON.stringify(
                buildGoogleOIDCConfig({
                    clientId,
                    clientSecret: resolvedClientSecret,
                }),
            ),
            domain_string: backendUrl.hostname,
            domain: ctx.subdomain._id,
        },
        {
            upsert: true,
            new: true,
        },
    );

    invalidateDomainCache(ctx.subdomain.name);

    return googleProvider;
};

export const getExternalLoginProviders = async (ctx: GQLContext) => {
    const enabledProviders = new Set(
        ctx.subdomain.settings.logins || [Constants.LoginProvider.EMAIL],
    );
    const externalDefinitions = LOGIN_PROVIDER_REGISTRY.filter(
        (item) => !!item.providerId,
    );

    const configuredProviders = await SSOProviderModel.find({
        domain: ctx.subdomain._id,
        providerId: {
            $in: externalDefinitions
                .map((item) => item.providerId)
                .filter(Boolean),
        },
    }).lean();
    const providerMap = new Map(
        configuredProviders.map((provider) => [provider.providerId, provider]),
    );

    return externalDefinitions
        .filter((definition) => enabledProviders.has(definition.key))
        .filter(
            (definition) =>
                !definition.featureFlag ||
                ctx.subdomain.features?.includes(
                    definition.featureFlag as Features,
                ),
        )
        .filter((definition) => {
            const provider = providerMap.get(definition.providerId!);

            return (
                !!provider &&
                isExternalProviderConfigured({
                    provider: definition.key,
                    oidcConfig: provider.oidcConfig,
                    samlConfig: provider.samlConfig,
                })
            );
        })
        .map(
            (definition): RuntimeLoginProvider => ({
                key: definition.key,
                providerId: definition.providerId!,
                label: definition.label,
                buttonText: definition.buttonText!,
                authType: definition.authType!,
            }),
        );
};

export const removeSSOProvider = async (ctx: GQLContext) => {
    assertCanManageSettings(ctx);

    if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
        throw new Error(responses.action_not_allowed);
    }

    await SSOProviderModel.deleteOne({
        domain: ctx.subdomain._id,
        providerId: SAML_PROVIDER_ID,
    });

    await toggleLoginProvider({
        provider: Constants.LoginProvider.SSO,
        value: false,
        ctx,
    });

    ctx.subdomain.settings.ssoTrustedDomain = undefined;
    (ctx.subdomain as any).markModified("settings");
    await (ctx.subdomain as any).save();
    invalidateDomainCache(ctx.subdomain.name);

    return true;
};

export const removeGoogleProvider = async (ctx: GQLContext) => {
    assertCanManageSettings(ctx);

    await SSOProviderModel.deleteOne({
        domain: ctx.subdomain._id,
        providerId: GOOGLE_PROVIDER_ID,
    });

    await toggleLoginProvider({
        provider: Constants.LoginProvider.GOOGLE,
        value: false,
        ctx,
    });

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
    assertCanManageSettings(ctx);

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
        case Constants.LoginProvider.GOOGLE:
            if (value) {
                const googleProvider = await SSOProviderModel.findOne({
                    domain: ctx.subdomain._id,
                    providerId: GOOGLE_PROVIDER_ID,
                });

                if (
                    !googleProvider ||
                    !isExternalProviderConfigured({
                        provider,
                        oidcConfig: googleProvider.oidcConfig,
                    })
                ) {
                    throw new Error(responses.provider_not_configured);
                }
            }
            await saveLoginProvider({
                ctx,
                value,
                provider: Constants.LoginProvider.GOOGLE,
            });
            break;
        case Constants.LoginProvider.SSO:
            if (value) {
                if (!ctx.subdomain.features?.includes(Constants.Features.SSO)) {
                    throw new Error(responses.action_not_allowed);
                }

                const ssoProvider = await SSOProviderModel.findOne({
                    domain: ctx.subdomain._id,
                    providerId: SAML_PROVIDER_ID,
                });

                if (
                    !ssoProvider ||
                    !isExternalProviderConfigured({
                        provider,
                        samlConfig: ssoProvider.samlConfig,
                    })
                ) {
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
