import React, { useState, useEffect } from "react";
import { styled } from "@mui/system";
import { connect } from "react-redux";
import {
    PAYMENT_METHOD_PAYPAL,
    PAYMENT_METHOD_PAYTM,
    PAYMENT_METHOD_STRIPE,
    PAYMENT_METHOD_NONE,
    MIMETYPE_IMAGE,
} from "../../ui-config/constants";
import { TextField, Button, Typography, Grid, capitalize } from "@mui/material";
import {
    SITE_SETTINGS_TITLE,
    SITE_SETTINGS_SUBTITLE,
    SITE_SETTINGS_LOGO,
    SITE_SETTINGS_PAGE_HEADING,
    SITE_SETTINGS_CURRENCY,
    SITE_ADMIN_SETTINGS_STRIPE_SECRET,
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
} from "../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { decode, encode } from "base-64";
import { AppMessage, Profile } from "@courselit/common-models";
import type { SiteInfo, Address, Auth } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";
import currencies from "../../data/iso4217.json";
import {
    Select as SingleSelect,
    MediaSelector,
} from "@courselit/components-library";

const { networkAction, newSiteInfoAvailable, setAppMessage } = actionCreators;

const PREFIX = "Settings";

const classes = {
    formControl: `${PREFIX}-formControl`,
    section: `${PREFIX}-section`,
    header: `${PREFIX}-header`,
    sectionContent: `${PREFIX}-sectionContent`,
    saveButton: `${PREFIX}-saveButton`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
    [`& .${classes.formControl}`]: {
        minWidth: "100%",
        margin: "1em 0em",
    },

    [`& .${classes.section}`]: {
        marginBottom: theme.spacing(4),
    },

    [`& .${classes.header}`]: {
        marginBottom: theme.spacing(2),
    },

    [`& .${classes.sectionContent}`]: {},

    [`& .${classes.saveButton}`]: {
        marginTop: theme.spacing(4),
    },
}));

interface SettingsProps {
    siteinfo: SiteInfo;
    auth: Auth;
    profile: Profile;
    dispatch: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
}

const Settings = (props: SettingsProps) => {
    const [settings, setSettings] = useState<Partial<SiteInfo>>({});
    const [newSettings, setNewSettings] = useState<Partial<SiteInfo>>({});

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
                stripePublishableKey: settings.stripePublishableKey,
                codeInjectionHead: settings.codeInjectionHead
                    ? encode(settings.codeInjectionHead)
                    : "",
                codeInjectionBody: settings.codeInjectionBody
                    ? encode(settings.codeInjectionBody)
                    : "",
            })
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
                        stripePublishableKey,
                        codeInjectionHead,
                        codeInjectionBody
                    }
                }
            }`;
        try {
            const fetchRequest = fetch.setPayload(query).build();
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
            }
        } catch (e) {}
    };

    const setSettingsState = (settingsResponse: SiteInfo) => {
        if (settingsResponse.codeInjectionHead) {
            settingsResponse.codeInjectionHead = decode(
                settingsResponse.codeInjectionHead
            );
        }
        if (settingsResponse.codeInjectionBody) {
            settingsResponse.codeInjectionBody = decode(
                settingsResponse.codeInjectionBody
            );
        }
        const settingsResponseWithNullsRemoved = {
            title: settingsResponse.title || "",
            subtitle: settingsResponse.subtitle || "",
            logo: settingsResponse.logo,
            currencyISOCode: settingsResponse.currencyISOCode || "",
            paymentMethod: settingsResponse.paymentMethod || "",
            stripePublishableKey: settingsResponse.stripePublishableKey || "",
            codeInjectionHead: settingsResponse.codeInjectionHead || "",
            codeInjectionBody: settingsResponse.codeInjectionBody || "",
        };
        setSettings(
            Object.assign({}, settings, settingsResponseWithNullsRemoved)
        );
        setNewSettings(
            Object.assign({}, newSettings, settingsResponseWithNullsRemoved)
        );
    };

    const handleSettingsSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const query = `
            mutation {
                settings: updateSiteInfo(siteData: {
                    title: "${newSettings.title}",
                    subtitle: "${newSettings.subtitle}",
                    logo: ${
                        newSettings.logo && newSettings.logo.mediaId
                            ? `{
                                mediaId: "${newSettings.logo.mediaId}",
                                originalFileName: "${
                                    newSettings.logo.originalFileName
                                }",
                                mimeType: "${newSettings.logo.mimeType}",
                                size: ${newSettings.logo.size},
                                access: "${newSettings.logo.access}",
                                file: ${
                                    newSettings.logo.access === "public"
                                        ? `"${newSettings.logo.file}"`
                                        : null
                                },
                                thumbnail: "${newSettings.logo.thumbnail}",
                                caption: "${newSettings.logo.caption}"
                            }`
                            : null
                    } 
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
                        stripePublishableKey,
                        codeInjectionHead,
                        codeInjectionBody
                    }
                }
            }`;

        try {
            const fetchRequest = fetch.setPayload(query).build();
            props.dispatch(networkAction(true));
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
                props.dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_SETTINGS_SAVED))
                );
            }
        } catch (e: any) {
            props.dispatch(setAppMessage(new AppMessage(e.message)));
        } finally {
            props.dispatch(networkAction(false));
        }
    };

    const handleCodeInjectionSettingsSubmit = async (
        event: React.FormEvent<HTMLFormElement>
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
                    stripePublishableKey,
                    codeInjectionHead,
                    codeInjectionBody
                }
            }
        }`;

        try {
            const fetchRequest = fetch.setPayload(query).build();
            props.dispatch(networkAction(true));
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
                props.dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_SETTINGS_SAVED))
                );
            }
        } catch (e: any) {
            props.dispatch(setAppMessage(new AppMessage(e.message)));
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
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const query = `
            mutation {
                settings: updatePaymentInfo(siteData: {
                    currencyISOCode: "${newSettings.currencyISOCode}",
                    paymentMethod: "${newSettings.paymentMethod}",
                    stripePublishableKey: "${newSettings.stripePublishableKey}"
                    ${
                        newSettings.stripeSecret
                            ? `, stripeSecret: "${newSettings.stripeSecret}"`
                            : ""
                    }
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
                        stripePublishableKey,
                        codeInjectionHead,
                        codeInjectionBody
                    }
                }
            }`;

        try {
            const fetchRequest = fetch.setPayload(query).build();
            props.dispatch(networkAction(true));
            const response = await fetchRequest.exec();
            if (response.settings.settings) {
                setSettingsState(response.settings.settings);
                props.dispatch(
                    setAppMessage(new AppMessage(APP_MESSAGE_SETTINGS_SAVED))
                );
            }
        } catch (e: any) {
            props.dispatch(setAppMessage(new AppMessage(e.message)));
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
        stripePublishableKey: getNewSettings
            ? newSettings.stripePublishableKey
            : settings.stripePublishableKey,
        stripeSecret: getNewSettings
            ? newSettings.stripeSecret
            : settings.stripeSecret,
        paypalSecret: getNewSettings
            ? newSettings.paypalSecret
            : settings.paypalSecret,
        paytmSecret: getNewSettings
            ? newSettings.paytmSecret
            : settings.paytmSecret,
    });

    return (
        <StyledGrid container spacing={2}>
            <Grid item xs={12}>
                <Typography variant="h1" style={{ wordBreak: "break-word" }}>
                    {SITE_SETTINGS_PAGE_HEADING}
                </Typography>
            </Grid>
            <Grid item xs={12}>
                <Grid container direction="column">
                    <Grid item sx={{ mb: 4 }}>
                        <form onSubmit={handleSettingsSubmit}>
                            <Grid container direction="column">
                                <Grid item>
                                    <Typography variant="h4">
                                        {SITE_SETTINGS_SECTION_GENERAL}
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <TextField
                                        variant="outlined"
                                        label={SITE_SETTINGS_TITLE}
                                        fullWidth
                                        margin="normal"
                                        name="title"
                                        value={newSettings.title || ""}
                                        onChange={onChangeData}
                                        required
                                    />
                                </Grid>
                                <Grid item>
                                    <TextField
                                        variant="outlined"
                                        label={SITE_SETTINGS_SUBTITLE}
                                        fullWidth
                                        margin="normal"
                                        name="subtitle"
                                        value={newSettings.subtitle || ""}
                                        onChange={onChangeData}
                                    />
                                </Grid>
                                <Grid item>
                                    <MediaSelector
                                        auth={props.auth}
                                        profile={props.profile}
                                        dispatch={props.dispatch}
                                        address={props.address}
                                        title={SITE_SETTINGS_LOGO}
                                        src={
                                            (newSettings.logo &&
                                                newSettings.logo.thumbnail) ||
                                            (props.siteinfo.logo &&
                                                props.siteinfo.logo.thumbnail)
                                        }
                                        srcTitle={
                                            (newSettings.logo &&
                                                newSettings.logo
                                                    .originalFileName) ||
                                            (props.siteinfo.logo &&
                                                props.siteinfo.logo
                                                    .originalFileName)
                                        }
                                        onSelection={onChangeData}
                                        mimeTypesToShow={[...MIMETYPE_IMAGE]}
                                        access="public"
                                        strings={{}}
                                    />
                                </Grid>
                                <Grid item>
                                    <Button
                                        type="submit"
                                        value={BUTTON_SAVE}
                                        color="primary"
                                        variant="outlined"
                                        disabled={
                                            JSON.stringify({
                                                title: settings.title,
                                                subtitle: settings.subtitle,
                                                logo: settings.logo,
                                            }) ===
                                                JSON.stringify({
                                                    title: newSettings.title,
                                                    subtitle:
                                                        newSettings.subtitle,
                                                    logo: newSettings.logo,
                                                }) ||
                                            !newSettings.title ||
                                            props.networkAction
                                        }
                                    >
                                        {BUTTON_SAVE}
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Grid>
                    <Grid item sx={{ mb: 4 }}>
                        <form onSubmit={handlePaymentSettingsSubmit}>
                            <Grid container direction="column" spacing={1}>
                                <Grid item sx={{ mb: 2 }}>
                                    <Typography variant="h4">
                                        {SITE_SETTINGS_SECTION_PAYMENT}
                                    </Typography>
                                </Grid>
                                <Grid item sx={{ mb: 2 }}>
                                    <SingleSelect
                                        title={SITE_SETTINGS_CURRENCY}
                                        options={currencies.map((currency) => ({
                                            label: currency.Currency,
                                            value:
                                                currency.AlphabeticCode || "",
                                        }))}
                                        value={
                                            newSettings.currencyISOCode?.toUpperCase() ||
                                            ""
                                        }
                                        onChange={(value) =>
                                            setNewSettings(
                                                Object.assign({}, newSettings, {
                                                    currencyISOCode: value,
                                                })
                                            )
                                        }
                                    />
                                </Grid>
                                <Grid item>
                                    <SingleSelect
                                        title={
                                            SITE_ADMIN_SETTINGS_PAYMENT_METHOD
                                        }
                                        value={
                                            newSettings.paymentMethod ||
                                            PAYMENT_METHOD_NONE
                                        }
                                        options={[
                                            {
                                                label: SITE_SETTINGS_PAYMENT_METHOD_NONE_LABEL,
                                                value: PAYMENT_METHOD_NONE,
                                            },
                                            {
                                                label: capitalize(
                                                    PAYMENT_METHOD_STRIPE.toLowerCase()
                                                ),
                                                value: PAYMENT_METHOD_STRIPE,
                                            },
                                        ]}
                                        onChange={(value) =>
                                            setNewSettings(
                                                Object.assign({}, newSettings, {
                                                    paymentMethod: value,
                                                })
                                            )
                                        }
                                    />
                                </Grid>

                                {newSettings.paymentMethod ===
                                    PAYMENT_METHOD_STRIPE && (
                                    <Grid item>
                                        <TextField
                                            variant="outlined"
                                            label={
                                                SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT
                                            }
                                            fullWidth
                                            margin="normal"
                                            name="stripePublishableKey"
                                            value={
                                                newSettings.stripePublishableKey ||
                                                ""
                                            }
                                            onChange={onChangeData}
                                        />
                                        <TextField
                                            variant="outlined"
                                            label={
                                                SITE_ADMIN_SETTINGS_STRIPE_SECRET
                                            }
                                            fullWidth
                                            margin="normal"
                                            name="stripeSecret"
                                            type="password"
                                            value={
                                                newSettings.stripeSecret || ""
                                            }
                                            onChange={onChangeData}
                                            sx={{ mb: 2 }}
                                            autoComplete="off"
                                        />
                                        <Grid
                                            container
                                            direction="column"
                                            spacing={1}
                                            sx={{ mb: 2 }}
                                        >
                                            <Grid item>
                                                <Typography variant="subtitle2">
                                                    {
                                                        HEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK
                                                    }
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Typography
                                                    variant="body2"
                                                    color="textSecondary"
                                                >
                                                    {
                                                        SUBHEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK
                                                    }
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Typography>
                                                    <a
                                                        href={`${props.address.backend}/api/payment/webhook`}
                                                    >
                                                        {`${props.address.backend}/api/payment/webhook`}
                                                    </a>
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                )}
                                {newSettings.paymentMethod ===
                                    PAYMENT_METHOD_PAYPAL && (
                                    <Grid item>
                                        <TextField
                                            variant="outlined"
                                            label={
                                                SITE_ADMIN_SETTINGS_PAYPAL_SECRET
                                            }
                                            fullWidth
                                            margin="normal"
                                            name="paypalSecret"
                                            type="password"
                                            value={
                                                newSettings.paypalSecret || ""
                                            }
                                            onChange={onChangeData}
                                            disabled={true}
                                        />
                                    </Grid>
                                )}
                                {newSettings.paymentMethod ===
                                    PAYMENT_METHOD_PAYTM && (
                                    <Grid item>
                                        <TextField
                                            variant="outlined"
                                            label={
                                                SITE_ADMIN_SETTINGS_PAYTM_SECRET
                                            }
                                            fullWidth
                                            margin="normal"
                                            name="paytmSecret"
                                            type="password"
                                            value={
                                                newSettings.paytmSecret || ""
                                            }
                                            onChange={onChangeData}
                                            disabled={true}
                                        />
                                    </Grid>
                                )}
                                <Grid item>
                                    <Button
                                        type="submit"
                                        value={BUTTON_SAVE}
                                        color="primary"
                                        variant="outlined"
                                        disabled={
                                            JSON.stringify(
                                                getPaymentSettings()
                                            ) ===
                                            JSON.stringify(
                                                getPaymentSettings(true)
                                            )
                                        }
                                    >
                                        {BUTTON_SAVE}
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Grid>
                    <Grid item>
                        <form onSubmit={handleCodeInjectionSettingsSubmit}>
                            <Grid container direction="column">
                                <Grid item>
                                    <Typography variant="h4">
                                        {SITE_CUSTOMISATIONS_SETTING_HEADER}
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <TextField
                                        variant="outlined"
                                        label={
                                            SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_HEAD
                                        }
                                        fullWidth
                                        margin="normal"
                                        name="codeInjectionHead"
                                        value={
                                            newSettings.codeInjectionHead || ""
                                        }
                                        onChange={onChangeData}
                                        multiline
                                        rows={10}
                                    />
                                </Grid>
                                <Grid item>
                                    <TextField
                                        variant="outlined"
                                        label={
                                            SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_BODY
                                        }
                                        fullWidth
                                        margin="normal"
                                        name="codeInjectionBody"
                                        value={
                                            newSettings.codeInjectionBody || ""
                                        }
                                        onChange={onChangeData}
                                        multiline
                                        rows={10}
                                    />
                                </Grid>
                                <Grid item>
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
                                </Grid>
                            </Grid>
                        </form>
                    </Grid>
                </Grid>
            </Grid>
        </StyledGrid>
    );
};

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
    auth: state.auth,
    address: state.address,
    networkAction: state.networkAction,
    profile: state.profile,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
