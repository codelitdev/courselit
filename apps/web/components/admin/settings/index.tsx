"use client";

import React, { useState, useEffect } from "react";
import {
    SITE_SETTINGS_TITLE,
    SITE_SETTINGS_SUBTITLE,
    SITE_SETTINGS_LOGO,
    SITE_SETTINGS_PAGE_HEADING,
    SITE_SETTINGS_CURRENCY,
    SITE_ADMIN_SETTINGS_STRIPE_SECRET,
    SITE_ADMIN_SETTINGS_RAZORPAY_SECRET,
    SITE_ADMIN_SETTINGS_PAYPAL_SECRET,
    SITE_ADMIN_SETTINGS_PAYTM_SECRET,
    SITE_SETTINGS_SECTION_GENERAL,
    SITE_SETTINGS_SECTION_PAYMENT,
    SITE_ADMIN_SETTINGS_PAYMENT_METHOD,
    SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT,
    APP_MESSAGE_SETTINGS_SAVED,
    SITE_CUSTOMISATIONS_SETTING_HEADER,
    SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_HEAD,
    HEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK,
    SUBHEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK,
    BUTTON_SAVE,
    SITE_SETTINGS_PAYMENT_METHOD_NONE_LABEL,
    SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_BODY,
    SITE_APIKEYS_SETTING_HEADER,
    APIKEY_NEW_BUTTON,
    APIKEY_EXISTING_HEADER,
    APIKEY_EXISTING_TABLE_HEADER_CREATED,
    APIKEY_EXISTING_TABLE_HEADER_NAME,
    APIKEY_REMOVE_BTN,
    APIKEY_REMOVE_DIALOG_HEADER,
    APIKYE_REMOVE_DIALOG_DESC,
    SITE_MAILS_HEADER,
    SITE_MAILING_ADDRESS_SETTING_HEADER,
    SITE_MAILING_ADDRESS_SETTING_EXPLANATION,
    SITE_SETTINGS_COURSELIT_BRANDING_CAPTION,
    SITE_SETTINGS_COURSELIT_BRANDING_SUB_CAPTION,
    SITE_SETTINGS_RAZORPAY_KEY_TEXT,
    MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
    MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
    DOCUMENTATION_LINK_LABEL,
    SITE_SETTINGS_LEMONSQUEEZY_KEY_TEXT,
    SITE_SETTINGS_LEMONSQUEEZY_STOREID_TEXT,
    SITE_SETTINGS_LEMONSQUEEZY_ONETIME_TEXT,
    SITE_SETTINGS_LEMONSQUEEZY_SUB_MONTHLY_TEXT,
    SITE_SETTINGS_LEMONSQUEEZY_SUB_YEARLY_TEXT,
    SETTINGS_RESOURCE_PAYMENT,
    SETTINGS_RESOURCE_API,
} from "@/ui-config/strings";
import { FetchBuilder, capitalize } from "@courselit/utils";
import { decode, encode } from "base-64";
import { Profile, UIConstants } from "@courselit/common-models";
import type { SiteInfo, Address, Media } from "@courselit/common-models";
import { actionCreators } from "@courselit/state-management";
import currencies from "@/data/currencies.json";
import {
    Select,
    MediaSelector,
    Tabbs,
    Form,
    FormField,
    Button,
    Link,
    Table,
    TableHead,
    TableBody,
    TableRow,
    Dialog2,
    PageBuilderPropertyHeader,
    Checkbox,
    useToast,
} from "@courselit/components-library";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@components/ui/card";
import { Copy, Info } from "lucide-react";
import { Label } from "@components/ui/label";
import { Input } from "@components/ui/input";
import Resources from "@components/resources";
import { PAYMENT_METHOD_MERCADOPAGO } from "@courselit/common-models/dist/ui-constants";

const {
    PAYMENT_METHOD_PAYPAL,
    PAYMENT_METHOD_PAYTM,
    PAYMENT_METHOD_RAZORPAY,
    PAYMENT_METHOD_STRIPE,
    PAYMENT_METHOD_LEMONSQUEEZY,
    PAYMENT_METHOD_NONE,
    MIMETYPE_IMAGE,
} = UIConstants;

const { networkAction, newSiteInfoAvailable } = actionCreators;

interface SettingsProps {
    siteinfo: SiteInfo;
    profile: Profile;
    dispatch: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
    loading: boolean;
    selectedTab:
        | typeof SITE_SETTINGS_SECTION_GENERAL
        | typeof SITE_SETTINGS_SECTION_PAYMENT
        | typeof SITE_MAILS_HEADER
        | typeof SITE_CUSTOMISATIONS_SETTING_HEADER
        | typeof SITE_APIKEYS_SETTING_HEADER;
}

const Settings = (props: SettingsProps) => {
    const [settings, setSettings] = useState<Partial<SiteInfo>>({});
    const [newSettings, setNewSettings] = useState<Partial<SiteInfo>>({});
    const [apikeyPage, setApikeyPage] = useState(1);
    const [apikeys, setApikeys] = useState([]);
    const selectedTab = [
        SITE_SETTINGS_SECTION_GENERAL,
        SITE_SETTINGS_SECTION_PAYMENT,
        SITE_MAILS_HEADER,
        SITE_CUSTOMISATIONS_SETTING_HEADER,
        SITE_APIKEYS_SETTING_HEADER,
    ].includes(props.selectedTab)
        ? props.selectedTab
        : SITE_SETTINGS_SECTION_GENERAL;
    const router = useRouter();
    const { toast } = useToast();

    const fetch = new FetchBuilder()
        .setUrl(`${props.address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadAdminSettings();
    }, []);

    useEffect(() => {
        props.dispatch(
            newSiteInfoAvailable({
                title: settings.title || "",
                subtitle: settings.subtitle || "",
                logo: settings.logo,
                currencyISOCode: settings.currencyISOCode,
                paymentMethod: settings.paymentMethod,
                stripeKey: settings.stripeKey,
                codeInjectionHead: settings.codeInjectionHead
                    ? encode(settings.codeInjectionHead)
                    : "",
                codeInjectionBody: settings.codeInjectionBody
                    ? encode(settings.codeInjectionBody)
                    : "",
                mailingAddress: settings.mailingAddress || "",
                hideCourseLitBranding: settings.hideCourseLitBranding ?? false,
                razorpayKey: settings.razorpayKey,
                lemonsqueezyStoreId: settings.lemonsqueezyStoreId,
                lemonsqueezyOneTimeVariantId:
                    settings.lemonsqueezyOneTimeVariantId,
                lemonsqueezySubscriptionMonthlyVariantId:
                    settings.lemonsqueezySubscriptionMonthlyVariantId,
                lemonsqueezySubscriptionYearlyVariantId:
                    settings.lemonsqueezySubscriptionYearlyVariantId,
                mercadopagoAccessToken: settings.mercadopagoAccessToken,
            }),
        );
    }, [settings]);

    const loadAdminSettings = async () => {
        const query = `
            query {
                settings: getSiteInfo {
                    settings {
                        title,
                        subtitle,
                        logo {
                            mediaId,
                            originalFileName,
                            mimeType,
                            size,
                            access,
                            file,
                            thumbnail,
                            caption
                        },
                        currencyISOCode,
                        paymentMethod,
                        stripeKey,
                        razorpayKey,
                        lemonsqueezyStoreId,
                        lemonsqueezyOneTimeVariantId,
                        lemonsqueezySubscriptionMonthlyVariantId,
                        lemonsqueezySubscriptionYearlyVariantId,
                        codeInjectionHead,
                        codeInjectionBody,
                        mailingAddress,
                        hideCourseLitBranding,
                        mercadopagoAccessToken
                    }
                },
                apikeys: getApikeys {
                    name,
                    keyId,
                    createdAt
                }
            }`;
        try {
            const fetchRequest = fetch.setPayload(query).build();
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
            }
            if (response.apikeys) {
                setApikeys(response.apikeys);
            }
        } catch (e) {}
    };

    const setSettingsState = (settingsResponse: SiteInfo) => {
        if (settingsResponse.codeInjectionHead) {
            settingsResponse.codeInjectionHead = decode(
                settingsResponse.codeInjectionHead,
            );
        }
        if (settingsResponse.codeInjectionBody) {
            settingsResponse.codeInjectionBody = decode(
                settingsResponse.codeInjectionBody,
            );
        }
        const settingsResponseWithNullsRemoved = {
            title: settingsResponse.title || "",
            subtitle: settingsResponse.subtitle || "",
            logo: settingsResponse.logo,
            currencyISOCode: settingsResponse.currencyISOCode || "",
            paymentMethod: settingsResponse.paymentMethod || "",
            stripeKey: settingsResponse.stripeKey || "",
            razorpayKey: settingsResponse.razorpayKey || "",
            lemonsqueezyStoreId: settingsResponse.lemonsqueezyStoreId || "",
            codeInjectionHead: settingsResponse.codeInjectionHead || "",
            codeInjectionBody: settingsResponse.codeInjectionBody || "",
            mailingAddress: settingsResponse.mailingAddress || "",
            hideCourseLitBranding:
                settingsResponse.hideCourseLitBranding ?? false,
            lemonsqueezyOneTimeVariantId:
                settingsResponse.lemonsqueezyOneTimeVariantId || "",
            lemonsqueezySubscriptionMonthlyVariantId:
                settingsResponse.lemonsqueezySubscriptionMonthlyVariantId || "",
            lemonsqueezySubscriptionYearlyVariantId:
                settingsResponse.lemonsqueezySubscriptionYearlyVariantId || "",
            mercadopagoAccessToken: settingsResponse.mercadopagoAccessToken,
        };
        setSettings(
            Object.assign({}, settings, settingsResponseWithNullsRemoved),
        );
        setNewSettings(
            Object.assign({}, newSettings, settingsResponseWithNullsRemoved),
        );
    };

    const handleSettingsSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        const query = `
            mutation UpdateSiteInfo($title: String, $subtitle: String, $hideCourseLitBranding: Boolean){
                settings: updateSiteInfo(siteData: {
                    title: $title,
                    subtitle: $subtitle,
                    hideCourseLitBranding: $hideCourseLitBranding
                }) {
                    settings {
                        title,
                        subtitle,
                        logo {
                            mediaId,
                            originalFileName,
                            mimeType,
                            size,
                            access,
                            file,
                            thumbnail,
                            caption
                        },
                        currencyISOCode,
                        paymentMethod,
                        stripeKey,
                        razorpayKey,
                        lemonsqueezyStoreId,
                        lemonsqueezyOneTimeVariantId,
                        lemonsqueezySubscriptionMonthlyVariantId,
                        lemonsqueezySubscriptionYearlyVariantId,
                        codeInjectionHead,
                        codeInjectionBody,
                        mailingAddress,
                        hideCourseLitBranding,
                        mercadopagoAccessToken
                    }
                }
            }`;

        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        title: newSettings.title,
                        subtitle: newSettings.subtitle,
                        hideCourseLitBranding:
                            newSettings.hideCourseLitBranding,
                    },
                })
                .build();
            props.dispatch(networkAction(true));
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_SETTINGS_SAVED,
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const saveLogo = async (media?: Media) => {
        const query = `
            mutation ($logo: MediaInput) {
                settings: updateSiteInfo(siteData: {
                    logo: $logo 
                }) {
                    settings {
                        title,
                        subtitle,
                        logo {
                            mediaId,
                            originalFileName,
                            mimeType,
                            size,
                            access,
                            file,
                            thumbnail,
                            caption
                        },
                        currencyISOCode,
                        paymentMethod,
                        stripeKey,
                        razorpayKey,
                        lemonsqueezyStoreId,
                        lemonsqueezyOneTimeVariantId,
                        lemonsqueezySubscriptionMonthlyVariantId,
                        lemonsqueezySubscriptionYearlyVariantId,
                        codeInjectionHead,
                        codeInjectionBody,
                        mailingAddress,
                        hideCourseLitBranding,
                        mercadopagoAccessToken
                    }
                }
            }`;

        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        logo: media || null,
                    },
                })
                .build();
            props.dispatch(networkAction(true));
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_SETTINGS_SAVED,
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const handleCodeInjectionSettingsSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!newSettings.codeInjectionHead && !newSettings.codeInjectionBody) {
            return;
        }

        const query = `
        mutation {
            settings: updateSiteInfo(siteData: {
                codeInjectionHead: "${encode(newSettings.codeInjectionHead)}",
                codeInjectionBody: "${encode(newSettings.codeInjectionBody)}"
            }) {
                settings {
                    title,
                    subtitle,
                    logo {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    currencyISOCode,
                    paymentMethod,
                    stripeKey,
                    razorpayKey,
                    lemonsqueezyStoreId,
                    lemonsqueezyOneTimeVariantId,
                    lemonsqueezySubscriptionMonthlyVariantId,
                    lemonsqueezySubscriptionYearlyVariantId,
                    codeInjectionHead,
                    codeInjectionBody,
                    mailingAddress,
                    hideCourseLitBranding,
                    mercadopagoAccessToken
                }
            }
        }`;

        try {
            const fetchRequest = fetch.setPayload(query).build();
            props.dispatch(networkAction(true));
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_SETTINGS_SAVED,
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const handleMailsSettingsSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!newSettings.mailingAddress) {
            return;
        }

        const query = `
        mutation {
            settings: updateSiteInfo(siteData: {
                mailingAddress: "${newSettings.mailingAddress}"
            }) {
                settings {
                    title,
                    subtitle,
                    logo {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                    currencyISOCode,
                    paymentMethod,
                    stripeKey,
                    razorpayKey,
                    lemonsqueezyStoreId,
                    lemonsqueezyOneTimeVariantId,
                    lemonsqueezySubscriptionMonthlyVariantId,
                    lemonsqueezySubscriptionYearlyVariantId,
                    codeInjectionHead,
                    codeInjectionBody,
                    mailingAddress,
                    hideCourseLitBranding,
                    mercadopagoAccessToken
                }
            }
        }`;

        try {
            const fetchRequest = fetch.setPayload(query).build();
            props.dispatch(networkAction(true));
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_SETTINGS_SAVED,
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const onChangeData = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e) {
            return;
        }

        const change = Object.prototype.hasOwnProperty.call(e, "mediaId")
            ? {
                  logo: e,
              }
            : { [e.target.name]: e.target.value };
        setNewSettings(Object.assign({}, newSettings, change));
    };

    const handlePaymentSettingsSubmit = async (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        const query = `
            mutation (
                $currencyISOCode: String, 
                $paymentMethod: String, 
                $stripeKey: String,
                $stripeSecret: String,
                $razorpayKey: String,
                $razorpaySecret: String,
                $razorpayWebhookSecret: String,
                $lemonsqueezyKey: String,
                $lemonsqueezyStoreId: String,
                $lemonsqueezyWebhookSecret: String
                $lemonsqueezyOneTimeVariantId: String,
                $lemonsqueezySubscriptionMonthlyVariantId: String,
                $lemonsqueezySubscriptionYearlyVariantId: String,
                $mercadopagoAccessToken: String
            ) {
                settings: updatePaymentInfo(siteData: {
                    currencyISOCode: $currencyISOCode,
                    paymentMethod: $paymentMethod,
                    stripeKey: $stripeKey,
                    stripeSecret: $stripeSecret,
                    razorpayKey: $razorpayKey,
                    razorpaySecret: $razorpaySecret,
                    razorpayWebhookSecret: $razorpayWebhookSecret,
                    lemonsqueezyKey: $lemonsqueezyKey,
                    lemonsqueezyStoreId: $lemonsqueezyStoreId,
                    lemonsqueezyWebhookSecret: $lemonsqueezyWebhookSecret,
                    lemonsqueezyOneTimeVariantId: $lemonsqueezyOneTimeVariantId,
                    lemonsqueezySubscriptionMonthlyVariantId: $lemonsqueezySubscriptionMonthlyVariantId,
                    lemonsqueezySubscriptionYearlyVariantId: $lemonsqueezySubscriptionYearlyVariantId,
                    mercadopagoAccessToken: $mercadopagoAccessToken
                }) {
                    settings {
                        title,
                        subtitle,
                        logo {
                            mediaId,
                            originalFileName,
                            mimeType,
                            size,
                            access,
                            file,
                            thumbnail,
                            caption
                        },
                        currencyISOCode,
                        paymentMethod,
                        stripeKey,
                        razorpayKey,
                        lemonsqueezyStoreId,
                        lemonsqueezyOneTimeVariantId,
                        lemonsqueezySubscriptionMonthlyVariantId,
                        lemonsqueezySubscriptionYearlyVariantId,
                        codeInjectionHead,
                        codeInjectionBody,
                        mailingAddress,
                        hideCourseLitBranding,
                        mercadopagoAccessToken
                    }
                }
            }`;

        console.log("Mutation para guardar configuración:", query);
        console.log(
            "Token de Mercado Pago:",
            newSettings.mercadopagoAccessToken,
        );

        try {
            const fetchRequest = fetch
                .setPayload({
                    query,
                    variables: {
                        currencyISOCode: newSettings.currencyISOCode,
                        paymentMethod: newSettings.paymentMethod,
                        stripeKey: newSettings.stripeKey,
                        stripeSecret: newSettings.stripeSecret,
                        razorpayKey: newSettings.razorpayKey,
                        razorpaySecret: newSettings.razorpaySecret,
                        razorpayWebhookSecret:
                            newSettings.razorpayWebhookSecret,
                        lemonsqueezyKey: newSettings.lemonsqueezyKey,
                        lemonsqueezyStoreId: newSettings.lemonsqueezyStoreId,
                        lemonsqueezyWebhookSecret:
                            newSettings.lemonsqueezyWebhookSecret,
                        lemonsqueezyOneTimeVariantId:
                            newSettings.lemonsqueezyOneTimeVariantId,
                        lemonsqueezySubscriptionMonthlyVariantId:
                            newSettings.lemonsqueezySubscriptionMonthlyVariantId,
                        lemonsqueezySubscriptionYearlyVariantId:
                            newSettings.lemonsqueezySubscriptionYearlyVariantId,
                        mercadopagoAccessToken:
                            newSettings.mercadopagoAccessToken,
                    },
                })
                .build();
            props.dispatch(networkAction(true));
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_SETTINGS_SAVED,
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const getPaymentSettings = (getNewSettings = false) => ({
        currencyISOCode: getNewSettings
            ? newSettings.currencyISOCode
            : settings.currencyISOCode,
        paymentMethod: getNewSettings
            ? newSettings.paymentMethod
            : settings.paymentMethod,
        stripeKey: getNewSettings ? newSettings.stripeKey : settings.stripeKey,
        stripeSecret: getNewSettings
            ? newSettings.stripeSecret
            : settings.stripeSecret,
        paypalSecret: getNewSettings
            ? newSettings.paypalSecret
            : settings.paypalSecret,
        paytmSecret: getNewSettings
            ? newSettings.paytmSecret
            : settings.paytmSecret,
        razorpayKey: getNewSettings
            ? newSettings.razorpayKey
            : settings.razorpayKey,
        razorpaySecret: getNewSettings
            ? newSettings.razorpaySecret
            : settings.razorpaySecret,
        razorpayWebhookSecret: getNewSettings
            ? newSettings.razorpayWebhookSecret
            : settings.razorpayWebhookSecret,
        lemonsqueezyKey: getNewSettings
            ? newSettings.lemonsqueezyKey
            : settings.lemonsqueezyKey,
        lemonsqueezyStoreId: getNewSettings
            ? newSettings.lemonsqueezyStoreId
            : settings.lemonsqueezyStoreId,
        lemonsqueezyWebhookSecret: getNewSettings
            ? newSettings.lemonsqueezyWebhookSecret
            : settings.lemonsqueezyWebhookSecret,
        lemonsqueezyOneTimeVariantId: getNewSettings
            ? newSettings.lemonsqueezyOneTimeVariantId
            : settings.lemonsqueezyOneTimeVariantId,
        lemonsqueezySubscriptionMonthlyVariantId: getNewSettings
            ? newSettings.lemonsqueezySubscriptionMonthlyVariantId
            : settings.lemonsqueezySubscriptionMonthlyVariantId,
        lemonsqueezySubscriptionYearlyVariantId: getNewSettings
            ? newSettings.lemonsqueezySubscriptionYearlyVariantId
            : settings.lemonsqueezySubscriptionYearlyVariantId,
        mercadopagoAccessToken: getNewSettings
            ? newSettings.mercadopagoAccessToken
            : settings.mercadopagoAccessToken,
    });

    const removeApikey = async (keyId: string) => {
        const query = `
            mutation {
                removed: removeApikey(keyId: "${keyId}")
            }
        `;
        try {
            const fetchRequest = fetch.setPayload(query).build();
            props.dispatch(networkAction(true));
            await fetchRequest.exec();
            setApikeys(
                apikeys.filter(
                    (item: Record<string, unknown>) => item.keyId !== keyId,
                ),
            );
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const items = [
        SITE_SETTINGS_SECTION_GENERAL,
        SITE_SETTINGS_SECTION_PAYMENT,
        SITE_MAILS_HEADER,
        SITE_CUSTOMISATIONS_SETTING_HEADER,
        SITE_APIKEYS_SETTING_HEADER,
    ];

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: TOAST_TITLE_SUCCESS,
            description: "Webhook URL copied to clipboard",
        });
    };

    return (
        <div>
            <div className="flex justify-between items-baseline">
                <h1 className="text-4xl font-semibold mb-4">
                    {SITE_SETTINGS_PAGE_HEADING}
                </h1>
            </div>
            <Tabbs
                items={items}
                value={selectedTab}
                onChange={(tab: string) => {
                    router.replace(`/dashboard/settings?tab=${tab}`);
                }}
            >
                <div className="flex flex-col gap-8">
                    <Form
                        onSubmit={handleSettingsSubmit}
                        className="flex flex-col gap-4 pt-4"
                    >
                        <FormField
                            label={SITE_SETTINGS_TITLE}
                            name="title"
                            value={newSettings.title || ""}
                            onChange={onChangeData}
                            required
                        />
                        <FormField
                            label={SITE_SETTINGS_SUBTITLE}
                            name="subtitle"
                            value={newSettings.subtitle || ""}
                            onChange={onChangeData}
                        />

                        <div>
                            <PageBuilderPropertyHeader
                                label={SITE_SETTINGS_COURSELIT_BRANDING_CAPTION}
                            />
                            <div className="flex justify-between text-[#8D8D8D]">
                                <p className="text-sm">
                                    {
                                        SITE_SETTINGS_COURSELIT_BRANDING_SUB_CAPTION
                                    }
                                </p>
                                <Checkbox
                                    disabled={props.networkAction}
                                    checked={newSettings.hideCourseLitBranding}
                                    onChange={(value: boolean) => {
                                        setNewSettings(
                                            Object.assign({}, newSettings, {
                                                hideCourseLitBranding: value,
                                            }),
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                value={BUTTON_SAVE}
                                color="primary"
                                disabled={
                                    JSON.stringify({
                                        title: settings.title,
                                        subtitle: settings.subtitle,
                                        hideCourseLitBranding:
                                            settings.hideCourseLitBranding,
                                    }) ===
                                        JSON.stringify({
                                            title: newSettings.title,
                                            subtitle: newSettings.subtitle,
                                            hideCourseLitBranding:
                                                newSettings.hideCourseLitBranding,
                                        }) ||
                                    !newSettings.title ||
                                    props.networkAction
                                }
                            >
                                {BUTTON_SAVE}
                            </Button>
                        </div>
                    </Form>

                    <div>
                        <PageBuilderPropertyHeader label={SITE_SETTINGS_LOGO} />
                        <MediaSelector
                            profile={props.profile}
                            address={props.address}
                            title=""
                            src={newSettings.logo?.thumbnail || ""}
                            srcTitle={newSettings.logo?.originalFileName || ""}
                            onSelection={(media: Media) => {
                                if (media) {
                                    saveLogo(media);
                                }
                            }}
                            mimeTypesToShow={[...MIMETYPE_IMAGE]}
                            access="public"
                            strings={{
                                buttonCaption:
                                    MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
                                removeButtonCaption:
                                    MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
                            }}
                            mediaId={newSettings.logo?.mediaId}
                            onRemove={() => saveLogo()}
                            type="domain"
                        />
                    </div>
                </div>
                <div>
                    <Form
                        onSubmit={handlePaymentSettingsSubmit}
                        className="flex flex-col gap-4 pt-4 mb-8"
                    >
                        <div className="flex flex-col gap-2">
                            <Select
                                title={SITE_SETTINGS_CURRENCY}
                                options={currencies.map((currency) => ({
                                    label: currency.name,
                                    value: currency.isoCode,
                                }))}
                                value={
                                    newSettings.currencyISOCode?.toUpperCase() ||
                                    ""
                                }
                                onChange={(value) =>
                                    setNewSettings(
                                        Object.assign({}, newSettings, {
                                            currencyISOCode: value,
                                        }),
                                    )
                                }
                            />
                            {newSettings.paymentMethod ===
                                PAYMENT_METHOD_LEMONSQUEEZY && (
                                <p className="text-xs text-red-500">
                                    The currency selected will not be applied
                                    during checkout. Set your desired currency
                                    in your LemonSqueezy dashboard.
                                </p>
                            )}
                        </div>
                        <Select
                            title={SITE_ADMIN_SETTINGS_PAYMENT_METHOD}
                            value={
                                newSettings.paymentMethod || PAYMENT_METHOD_NONE
                            }
                            options={[
                                {
                                    label: capitalize(
                                        PAYMENT_METHOD_STRIPE.toLowerCase(),
                                    ),
                                    value: PAYMENT_METHOD_STRIPE,
                                    disabled: currencies.some(
                                        (x) =>
                                            x.isoCode ===
                                                newSettings.currencyISOCode?.toUpperCase() &&
                                            !x.stripe,
                                    ),
                                },
                                {
                                    label: capitalize(
                                        PAYMENT_METHOD_RAZORPAY.toLowerCase(),
                                    ),
                                    value: PAYMENT_METHOD_RAZORPAY,
                                    disabled: currencies.some(
                                        (x) =>
                                            x.isoCode ===
                                                newSettings.currencyISOCode?.toUpperCase() &&
                                            !x.razorpay,
                                    ),
                                },
                                {
                                    label: capitalize(
                                        PAYMENT_METHOD_LEMONSQUEEZY.toLowerCase(),
                                    ),
                                    value: PAYMENT_METHOD_LEMONSQUEEZY,
                                    disabled: currencies.some(
                                        (x) =>
                                            x.isoCode ===
                                                newSettings.currencyISOCode?.toUpperCase() &&
                                            !x.lemonsqueezy,
                                    ),
                                },
                                {
                                    label: capitalize(
                                        PAYMENT_METHOD_MERCADOPAGO.toLowerCase(),
                                    ),
                                    value: PAYMENT_METHOD_MERCADOPAGO,
                                },
                            ]}
                            onChange={(value) =>
                                setNewSettings(
                                    Object.assign({}, newSettings, {
                                        paymentMethod: value,
                                    }),
                                )
                            }
                            placeholderMessage={
                                SITE_SETTINGS_PAYMENT_METHOD_NONE_LABEL
                            }
                            disabled={!newSettings.currencyISOCode}
                        />

                        {newSettings.paymentMethod ===
                            PAYMENT_METHOD_STRIPE && (
                            <>
                                <FormField
                                    label={
                                        SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT
                                    }
                                    name="stripeKey"
                                    value={newSettings.stripeKey || ""}
                                    onChange={onChangeData}
                                />
                                <FormField
                                    label={SITE_ADMIN_SETTINGS_STRIPE_SECRET}
                                    name="stripeSecret"
                                    type="password"
                                    value={newSettings.stripeSecret || ""}
                                    onChange={onChangeData}
                                    sx={{ mb: 2 }}
                                    autoComplete="off"
                                />
                            </>
                        )}
                        {newSettings.paymentMethod ===
                            PAYMENT_METHOD_RAZORPAY && (
                            <>
                                <FormField
                                    label={SITE_SETTINGS_RAZORPAY_KEY_TEXT}
                                    name="razorpayKey"
                                    value={newSettings.razorpayKey || ""}
                                    onChange={onChangeData}
                                />
                                <FormField
                                    label={SITE_ADMIN_SETTINGS_RAZORPAY_SECRET}
                                    name="razorpaySecret"
                                    type="password"
                                    value={newSettings.razorpaySecret || ""}
                                    onChange={onChangeData}
                                    sx={{ mb: 2 }}
                                    autoComplete="off"
                                />
                                {/* <FormField
                                label={SITE_ADMIN_SETTINGS_RAZORPAY_WEBHOOK_SECRET}
                                name="razorpayWebhookSecret"
                                type="password"
                                value={newSettings.razorpayWebhookSecret || ""}
                                onChange={onChangeData}
                                sx={{ mb: 2 }}
                                autoComplete="off"
                            /> */}
                            </>
                        )}
                        {newSettings.paymentMethod ===
                            PAYMENT_METHOD_LEMONSQUEEZY && (
                            <>
                                <FormField
                                    label={
                                        SITE_SETTINGS_LEMONSQUEEZY_STOREID_TEXT
                                    }
                                    name="lemonsqueezyStoreId"
                                    value={
                                        newSettings.lemonsqueezyStoreId || ""
                                    }
                                    onChange={onChangeData}
                                />
                                <FormField
                                    label={
                                        SITE_SETTINGS_LEMONSQUEEZY_ONETIME_TEXT
                                    }
                                    name="lemonsqueezyOneTimeVariantId"
                                    value={
                                        newSettings.lemonsqueezyOneTimeVariantId ||
                                        ""
                                    }
                                    onChange={onChangeData}
                                />
                                <FormField
                                    label={
                                        SITE_SETTINGS_LEMONSQUEEZY_SUB_MONTHLY_TEXT
                                    }
                                    name="lemonsqueezySubscriptionMonthlyVariantId"
                                    value={
                                        newSettings.lemonsqueezySubscriptionMonthlyVariantId ||
                                        ""
                                    }
                                    onChange={onChangeData}
                                />
                                <FormField
                                    label={
                                        SITE_SETTINGS_LEMONSQUEEZY_SUB_YEARLY_TEXT
                                    }
                                    name="lemonsqueezySubscriptionYearlyVariantId"
                                    value={
                                        newSettings.lemonsqueezySubscriptionYearlyVariantId ||
                                        ""
                                    }
                                    onChange={onChangeData}
                                />
                                <FormField
                                    label={SITE_SETTINGS_LEMONSQUEEZY_KEY_TEXT}
                                    name="lemonsqueezyKey"
                                    type="password"
                                    value={newSettings.lemonsqueezyKey || ""}
                                    onChange={onChangeData}
                                    sx={{ mb: 2 }}
                                    autoComplete="off"
                                />
                            </>
                        )}
                        {newSettings.paymentMethod ===
                            PAYMENT_METHOD_MERCADOPAGO && (
                            <>
                                <FormField
                                    label={"Mercado Pago Access Token"}
                                    name="mercadopagoAccessToken"
                                    type="password"
                                    value={
                                        newSettings.mercadopagoAccessToken || ""
                                    }
                                    onChange={onChangeData}
                                    sx={{ mb: 2 }}
                                    autoComplete="off"
                                />
                            </>
                        )}
                        {newSettings.paymentMethod ===
                            PAYMENT_METHOD_PAYPAL && (
                            <FormField
                                label={SITE_ADMIN_SETTINGS_PAYPAL_SECRET}
                                name="paypalSecret"
                                type="password"
                                value={newSettings.paypalSecret || ""}
                                onChange={onChangeData}
                                disabled={true}
                            />
                        )}
                        {newSettings.paymentMethod === PAYMENT_METHOD_PAYTM && (
                            <FormField
                                label={SITE_ADMIN_SETTINGS_PAYTM_SECRET}
                                name="paytmSecret"
                                type="password"
                                value={newSettings.paytmSecret || ""}
                                onChange={onChangeData}
                                disabled={true}
                            />
                        )}
                        <div>
                            <Button
                                type="submit"
                                value={BUTTON_SAVE}
                                disabled={
                                    JSON.stringify(getPaymentSettings()) ===
                                    JSON.stringify(getPaymentSettings(true))
                                }
                            >
                                {BUTTON_SAVE}
                            </Button>
                        </div>
                    </Form>
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {HEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                <span>
                                    {
                                        SUBHEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK
                                    }{" "}
                                    <a
                                        className="underline"
                                        href="https://docs.courselit.app/en/schools/set-up-payments"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {DOCUMENTATION_LINK_LABEL}
                                    </a>
                                    .
                                </span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>New Payment Plans Webhook</Label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={`${props.address.backend}/api/payment/webhook`}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                            copyToClipboard(
                                                `${props.address.backend}/api/payment/webhook`,
                                            )
                                        }
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>
                                    Old Payment Webhook (Required for products
                                    but will be phased out soon)
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={`${props.address.backend}/api/payment/webhook-old`}
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                            copyToClipboard(
                                                `${props.address.backend}/api/payment/webhook-old`,
                                            )
                                        }
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Resources
                        links={[
                            {
                                href: "https://docs.courselit.app/en/schools/set-up-payments/",
                                text: SETTINGS_RESOURCE_PAYMENT,
                            },
                        ]}
                    />
                </div>
                <Form
                    onSubmit={handleMailsSettingsSubmit}
                    className="flex flex-col gap-4 pt-4"
                >
                    <FormField
                        component="textarea"
                        label={SITE_MAILING_ADDRESS_SETTING_HEADER}
                        name="mailingAddress"
                        value={newSettings.mailingAddress || ""}
                        onChange={onChangeData}
                        multiline
                        rows={5}
                    />
                    <p className="text-xs text-slate-500">
                        {SITE_MAILING_ADDRESS_SETTING_EXPLANATION}
                    </p>
                    <div>
                        <Button
                            type="submit"
                            value={BUTTON_SAVE}
                            color="primary"
                            variant="outlined"
                            disabled={
                                settings.mailingAddress ===
                                    newSettings.mailingAddress ||
                                props.networkAction
                            }
                        >
                            {BUTTON_SAVE}
                        </Button>
                    </div>
                </Form>
                <Form
                    onSubmit={handleCodeInjectionSettingsSubmit}
                    className="flex flex-col gap-4 pt-4"
                >
                    <FormField
                        component="textarea"
                        label={SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_HEAD}
                        name="codeInjectionHead"
                        value={newSettings.codeInjectionHead || ""}
                        onChange={onChangeData}
                        multiline
                        rows={10}
                    />
                    <FormField
                        component="textarea"
                        label={SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_BODY}
                        name="codeInjectionBody"
                        value={newSettings.codeInjectionBody || ""}
                        onChange={onChangeData}
                        multiline
                        rows={10}
                    />
                    <div>
                        <Button
                            type="submit"
                            value={BUTTON_SAVE}
                            color="primary"
                            variant="outlined"
                            disabled={
                                (settings.codeInjectionHead ===
                                    newSettings.codeInjectionHead &&
                                    settings.codeInjectionBody ===
                                        newSettings.codeInjectionBody) ||
                                props.networkAction
                            }
                        >
                            {BUTTON_SAVE}
                        </Button>
                    </div>
                </Form>
                <div className="flex flex-col gap-4 pt-4">
                    <div className="flex justify-between">
                        <h2 className="text-lg font-semibold">
                            {APIKEY_EXISTING_HEADER}
                        </h2>
                        <Link href={`/dashboard/settings/apikeys/new`}>
                            <Button>{APIKEY_NEW_BUTTON}</Button>
                        </Link>
                    </div>
                    <Table aria-label="API keys" className="mb-4">
                        <TableHead className="border-0 border-b border-slate-200">
                            <td>{APIKEY_EXISTING_TABLE_HEADER_NAME}</td>
                            <td>{APIKEY_EXISTING_TABLE_HEADER_CREATED}</td>
                            <td align="right"> </td>
                        </TableHead>
                        <TableBody
                            loading={props.loading}
                            endReached={true}
                            page={apikeyPage}
                            onPageChange={(value: number) => {
                                setApikeyPage(value);
                            }}
                        >
                            {apikeys.map(
                                (
                                    item: Record<string, unknown>,
                                    index: number,
                                ) => (
                                    <TableRow key={item.name as string}>
                                        <td className="py-4">{item.name}</td>
                                        <td>
                                            {new Date(
                                                item.createdAt as number,
                                            ).toLocaleDateString()}
                                        </td>
                                        <td align="right">
                                            <Dialog2
                                                title={
                                                    APIKEY_REMOVE_DIALOG_HEADER
                                                }
                                                trigger={
                                                    <Button variant="soft">
                                                        {APIKEY_REMOVE_BTN}
                                                    </Button>
                                                }
                                                okButton={
                                                    <Button
                                                        onClick={() =>
                                                            removeApikey(
                                                                item.keyId,
                                                            )
                                                        }
                                                    >
                                                        {APIKEY_REMOVE_BTN}
                                                    </Button>
                                                }
                                            >
                                                {APIKYE_REMOVE_DIALOG_DESC}
                                            </Dialog2>
                                        </td>
                                    </TableRow>
                                ),
                            )}
                        </TableBody>
                    </Table>
                    <Resources
                        links={[
                            {
                                href: "https://docs.courselit.app/en/developers/introduction",
                                text: SETTINGS_RESOURCE_API,
                            },
                        ]}
                    />
                </div>
            </Tabbs>
        </div>
    );
};

export default Settings;
