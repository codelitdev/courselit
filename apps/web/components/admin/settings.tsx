import React, { useState, useEffect, FormEvent } from "react";
import { styled } from "@mui/system";
import { connect } from "react-redux";
import {
    getGraphQLQueryFields,
    getObjectContainingOnlyChangedFields,
} from "../../ui-lib/utils";
import {
    PAYMENT_METHOD_PAYPAL,
    PAYMENT_METHOD_PAYTM,
    PAYMENT_METHOD_STRIPE,
    PAYMENT_METHOD_NONE,
    MIMETYPE_IMAGE,
} from "../../ui-config/constants";
import {
    TextField,
    Button,
    Typography,
    FormControl,
    Select,
    InputLabel,
    MenuItem,
    Grid,
    capitalize,
} from "@mui/material";
import {
    SITE_SETTINGS_TITLE,
    SITE_SETTINGS_SUBTITLE,
    SITE_SETTINGS_CURRENCY_UNIT,
    SITE_SETTINGS_LOGO,
    SITE_SETTINGS_PAGE_HEADING,
    SITE_SETTINGS_CURRENCY_ISO_CODE_TEXT,
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
    PAYMENT_METHOD_NAME_NONE,
} from "../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import { decode, encode } from "base-64";
import dynamic from "next/dynamic";
import { AppMessage } from "@courselit/common-models";
import { Section } from "@courselit/components-library";
import type { SiteInfo, Address, Auth } from "@courselit/common-models";
import type { AppDispatch, AppState } from "@courselit/state-management";
import { actionCreators } from "@courselit/state-management";

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

const MediaSelector = dynamic(() => import("./media/media-selector"));

interface SettingsProps {
    siteinfo: SiteInfo;
    auth: Auth;
    dispatch: (...args: any[]) => void;
    address: Address;
    networkAction: boolean;
}

const Settings = (props: SettingsProps) => {
    const defaultSettingsState = {
        title: "",
        subtitle: "",
        logopath: {
            file: "",
            thumbnail: "",
        },
        currencyUnit: "",
        currencyISOCode: "",
        paymentMethod: "",
        stripePublishableKey: "",
        codeInjectionHead: "",
        stripeSecret: "",
        paypalSecret: "",
        paytmSecret: "",
    };

    const [settings, setSettings] = useState<SiteInfo>(defaultSettingsState);
    const [newSettings, setNewSettings] =
        useState<SiteInfo>(defaultSettingsState);

    const fetch = new FetchBuilder()
        .setUrl(`${props.address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    useEffect(() => {
        loadAdminSettings();
    }, []);

    const loadAdminSettings = async () => {
        const query = `
    query {
        settings: getSiteInfo {
            settings {
                title,
                subtitle,
                logopath {
                thumbnail
                },
                currencyUnit,
                currencyISOCode,
                paymentMethod,
                stripePublishableKey,
                codeInjectionHead
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
        const settingsResponseWithNullsRemoved = {
            title: settingsResponse.title || "",
            subtitle: settingsResponse.subtitle || "",
            logopath: settingsResponse.logopath,
            currencyUnit: settingsResponse.currencyUnit || "",
            currencyISOCode: settingsResponse.currencyISOCode || "",
            paymentMethod: settingsResponse.paymentMethod || "",
            stripePublishableKey: settingsResponse.stripePublishableKey || "",
            codeInjectionHead: settingsResponse.codeInjectionHead || "",
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
        logopath: ${
            newSettings.logopath && newSettings.logopath.mediaId
                ? '"' + newSettings.logopath.mediaId + '"'
                : null
        },
      }) {
          settings {
            title,
            subtitle,
            logopath {
            thumbnail
            },
            currencyUnit,
            currencyISOCode,
            paymentMethod,
            stripePublishableKey,
            codeInjectionHead
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
                    newSiteInfoAvailable({
                        title: settings.title,
                        subtitle: settings.subtitle,
                        logopath: settings.logopath,
                        currencyUnit: settings.currencyUnit,
                        currencyISOCode: settings.currencyISOCode,
                        paymentMethod: settings.paymentMethod,
                        stripePublishableKey: settings.stripePublishableKey,
                        codeInjectionHead: settings.codeInjectionHead
                            ? encode(settings.codeInjectionHead)
                            : "",
                    })
                );
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

        if (!newSettings.codeInjectionHead) {
            return;
        }

        const query = `
        mutation {
            settings: updateSiteInfo(siteData: {
                codeInjectionHead: "${encode(newSettings.codeInjectionHead)}"
            }) {
                settings {
                    title,
                    subtitle,
                    logopath {
                        thumbnail
                    },
                    currencyUnit,
                    currencyISOCode,
                    paymentMethod,
                    stripePublishableKey,
                    codeInjectionHead
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
                    newSiteInfoAvailable({
                        title: settings.title,
                        subtitle: settings.subtitle,
                        logopath: settings.logopath,
                        currencyUnit: settings.currencyUnit,
                        currencyISOCode: settings.currencyISOCode,
                        paymentMethod: settings.paymentMethod,
                        stripePublishableKey: settings.stripePublishableKey,
                        codeInjectionHead: settings.codeInjectionHead
                            ? encode(settings.codeInjectionHead)
                            : "",
                    })
                );
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
                  logopath: {
                      mediaId: (e as any).mediaId,
                  },
              }
            : { [e.target.name]: e.target.value };
        setNewSettings(Object.assign({}, newSettings, change));
    };

    const handlePaymentSettingsSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        const onlyChangedSettings = getObjectContainingOnlyChangedFields(
            settings,
            newSettings
        );
        const formattedQuery = getGraphQLQueryFields(onlyChangedSettings);
        const query = `
        mutation {
            settings: updatePaymentInfo(siteData: ${formattedQuery}) {
                settings {
                    title,
                    subtitle,
                    logopath {
                        thumbnail
                    },
                    currencyUnit,
                    currencyISOCode,
                    paymentMethod,
                    stripePublishableKey,
                    codeInjectionHead
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
                    newSiteInfoAvailable({
                        title: settings.title,
                        subtitle: settings.subtitle,
                        logopath: settings.logopath,
                        currencyUnit: settings.currencyUnit,
                        currencyISOCode: settings.currencyISOCode,
                        paymentMethod: settings.paymentMethod,
                        stripePublishableKey: settings.stripePublishableKey,
                        codeInjectionHead: settings.codeInjectionHead
                            ? encode(settings.codeInjectionHead)
                            : "",
                    })
                );
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
        currencyUnit: getNewSettings
            ? newSettings.currencyUnit
            : settings.currencyUnit,
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
                <Section>
                    <Typography
                        variant="h1"
                        style={{ wordBreak: "break-word" }}
                    >
                        {SITE_SETTINGS_PAGE_HEADING}
                    </Typography>
                </Section>
            </Grid>
            <Grid item xs={12}>
                <Grid container direction="column" spacing={4}>
                    <Grid item>
                        <Section>
                            <form onSubmit={handleSettingsSubmit}>
                                <Grid container direction="column" spacing={1}>
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
                                            title={SITE_SETTINGS_LOGO}
                                            src={
                                                (newSettings.logopath &&
                                                    newSettings.logopath
                                                        .thumbnail) ||
                                                (props.siteinfo.logopath &&
                                                    props.siteinfo.logopath
                                                        .thumbnail)
                                            }
                                            onSelection={onChangeData}
                                            mimeTypesToShow={[
                                                ...MIMETYPE_IMAGE,
                                            ]}
                                            access="public"
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
                                                    logopath: settings.logopath,
                                                }) ===
                                                    JSON.stringify({
                                                        title: newSettings.title,
                                                        subtitle:
                                                            newSettings.subtitle,
                                                        logopath:
                                                            newSettings.logopath,
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
                        </Section>
                    </Grid>
                    <Grid item>
                        <Section>
                            <form onSubmit={handlePaymentSettingsSubmit}>
                                <Grid container direction="column" spacing={1}>
                                    <Grid item>
                                        <Typography variant="h4">
                                            {SITE_SETTINGS_SECTION_PAYMENT}
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <TextField
                                            variant="outlined"
                                            label={SITE_SETTINGS_CURRENCY_UNIT}
                                            fullWidth
                                            margin="normal"
                                            name="currencyUnit"
                                            value={
                                                newSettings.currencyUnit || ""
                                            }
                                            onChange={onChangeData}
                                        />
                                    </Grid>
                                    <Grid item>
                                        <TextField
                                            variant="outlined"
                                            label={
                                                SITE_SETTINGS_CURRENCY_ISO_CODE_TEXT
                                            }
                                            fullWidth
                                            margin="normal"
                                            name="currencyISOCode"
                                            value={
                                                newSettings.currencyISOCode ||
                                                ""
                                            }
                                            onChange={onChangeData}
                                            maxLength={3}
                                        />
                                    </Grid>
                                    <Grid item>
                                        <FormControl
                                            variant="outlined"
                                            className={classes.formControl}
                                        >
                                            <InputLabel htmlFor="outlined-paymentmethod-simple">
                                                {
                                                    SITE_ADMIN_SETTINGS_PAYMENT_METHOD
                                                }
                                            </InputLabel>
                                            <Select
                                                autoWidth
                                                value={
                                                    newSettings.paymentMethod
                                                }
                                                onChange={onChangeData}
                                                inputProps={{
                                                    name: "paymentMethod",
                                                    id: "outlined-paymentmethod-simple",
                                                }}
                                            >
                                                <MenuItem
                                                    value={PAYMENT_METHOD_NONE}
                                                >
                                                    <Typography color="textSecondary">
                                                        {capitalize(
                                                            PAYMENT_METHOD_NAME_NONE.toLowerCase()
                                                        )}
                                                    </Typography>
                                                </MenuItem>
                                                <MenuItem
                                                    value={
                                                        PAYMENT_METHOD_STRIPE
                                                    }
                                                >
                                                    {capitalize(
                                                        PAYMENT_METHOD_STRIPE.toLowerCase()
                                                    )}
                                                </MenuItem>
                                                {/* <MenuItem value={PAYMENT_METHOD_PAYPAL} disabled={true}>
                          {capitalize(PAYMENT_METHOD_PAYPAL.toLowerCase())}
                        </MenuItem> */}
                                                {/* <MenuItem value={PAYMENT_METHOD_PAYTM} disabled={true}>
                          {capitalize(PAYMENT_METHOD_PAYTM.toLowerCase())}
                        </MenuItem> */}
                                            </Select>
                                        </FormControl>
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
                                                    newSettings.stripeSecret ||
                                                    ""
                                                }
                                                onChange={onChangeData}
                                            />
                                            <Grid
                                                container
                                                direction="column"
                                                spacing={1}
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
                                                            href={`${props.address.backend}/payment/webhook`}
                                                        >
                                                            {`${props.address.backend}/payment/webhook`}
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
                                                    newSettings.paypalSecret ||
                                                    ""
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
                                                    newSettings.paytmSecret ||
                                                    ""
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
                        </Section>
                    </Grid>
                    <Grid item>
                        <Section>
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
                                                newSettings.codeInjectionHead ||
                                                ""
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
                                                settings.codeInjectionHead ===
                                                    newSettings.codeInjectionHead ||
                                                props.networkAction
                                            }
                                        >
                                            {BUTTON_SAVE}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </Section>
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
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
