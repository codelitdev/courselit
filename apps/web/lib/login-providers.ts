import { Constants, type LoginProvider } from "@courselit/common-models";
import {
    LOGIN_PROVIDER_EMAIL_LABEL,
    LOGIN_PROVIDER_GOOGLE_BUTTON,
    LOGIN_PROVIDER_GOOGLE_LABEL,
    LOGIN_PROVIDER_SSO_BUTTON,
    LOGIN_PROVIDER_SSO_LABEL,
} from "../ui-config/strings";

export const LOGIN_PROVIDER_AUTH_TYPE = {
    OIDC: "oidc",
    SAML: "saml",
} as const;

export type LoginProviderAuthType =
    (typeof LOGIN_PROVIDER_AUTH_TYPE)[keyof typeof LOGIN_PROVIDER_AUTH_TYPE];

export type RuntimeLoginProvider = {
    key: LoginProvider;
    providerId: string;
    label: string;
    buttonText: string;
    authType: LoginProviderAuthType;
};

export type LoginProviderDefinition = {
    key: LoginProvider;
    label: string;
    providerId?: string;
    buttonText?: string;
    authType?: LoginProviderAuthType;
    settingsRoute?: string;
    featureFlag?: string;
};

export const LOGIN_PROVIDER_REGISTRY: LoginProviderDefinition[] = [
    {
        key: Constants.LoginProvider.EMAIL,
        label: LOGIN_PROVIDER_EMAIL_LABEL,
    },
    {
        key: Constants.LoginProvider.GOOGLE,
        providerId: Constants.LoginProvider.GOOGLE,
        label: LOGIN_PROVIDER_GOOGLE_LABEL,
        buttonText: LOGIN_PROVIDER_GOOGLE_BUTTON,
        authType: LOGIN_PROVIDER_AUTH_TYPE.OIDC,
        settingsRoute: `/dashboard/settings/login-provider/${Constants.LoginProvider.GOOGLE}`,
    },
    {
        key: Constants.LoginProvider.SSO,
        providerId: Constants.LoginProvider.SSO,
        label: LOGIN_PROVIDER_SSO_LABEL,
        buttonText: LOGIN_PROVIDER_SSO_BUTTON,
        authType: LOGIN_PROVIDER_AUTH_TYPE.SAML,
        settingsRoute: `/dashboard/settings/login-provider/${Constants.LoginProvider.SSO}`,
        featureFlag: Constants.Features.SSO,
    },
];

export const getLoginProviderDefinition = (provider: LoginProvider) =>
    LOGIN_PROVIDER_REGISTRY.find((item) => item.key === provider);
