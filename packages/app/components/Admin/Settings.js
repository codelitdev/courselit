import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { siteInfoProps, authProps, addressProps } from "../../types";
import {
  getGraphQLQueryFields,
  getObjectContainingOnlyChangedFields,
  areObjectsDifferent,
} from "../../lib/utils.js";
import {
  PAYMENT_METHOD_PAYPAL,
  PAYMENT_METHOD_PAYTM,
  PAYMENT_METHOD_STRIPE,
  PAYMENT_METHOD_NONE,
  MIMETYPE_IMAGE,
} from "../../config/constants.js";
import { newSiteInfoAvailable, setAppMessage } from "../../redux/actions.js";
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
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
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
} from "../../config/strings.js";
import FetchBuilder from "../../lib/fetch";
import { decode, encode } from "base-64";
import dynamic from "next/dynamic";
import AppMessage from "../../models/app-message.js";
import { Section } from "@courselit/components-library";

const MediaSelector = dynamic(() => import("./Media/MediaSelector"));

const useStyles = makeStyles((theme) => ({
  formControl: {
    minWidth: "100%",
    margin: "1em 0em",
  },
  section: {
    marginBottom: theme.spacing(4),
  },
  header: {
    marginBottom: theme.spacing(2),
  },
  sectionContent: {},
  saveButton: {
    marginTop: theme.spacing(4),
  },
}));

const Settings = (props) => {
  const defaultSettingsState = {
    title: "",
    subtitle: "",
    logopath: "",
    currencyUnit: "",
    currencyISOCode: "",
    paymentMethod: "",
    stripePublishableKey: "",
    themePrimaryColor: "",
    themeSecondaryColor: "",
    codeInjectionHead: "",
    stripeSecret: "",
    paypalSecret: "",
    paytmSecret: "",
  };

  const [settings, setSettings] = useState(defaultSettingsState);
  const [newSettings, setNewSettings] = useState(defaultSettingsState);

  const classes = useStyles();
  const fetch = new FetchBuilder()
    .setUrl(`${props.address.backend}/graph`)
    .setIsGraphQLEndpoint(true)
    .setAuthToken(props.auth.token);

  useEffect(() => {
    loadAdminSettings();
  }, []);

  const loadAdminSettings = async () => {
    const query = `
    query {
      settings: getSiteInfoAsAdmin {
        title,
        subtitle,
        logopath,
        currencyUnit,
        currencyISOCode,
        paymentMethod,
        stripePublishableKey,
        themePrimaryColor,
        themeSecondaryColor,
        codeInjectionHead,
        stripeSecret,
        paypalSecret,
        paytmSecret
      }
    }`;
    try {
      const fetchRequest = fetch.setPayload(query).build();
      const response = await fetchRequest.exec();
      if (response.settings) {
        setSettingsState(response.settings);
      }
    } catch (e) {}
  };

  const setSettingsState = (settingsResponse) => {
    if (settingsResponse.codeInjectionHead) {
      settingsResponse.codeInjectionHead = decode(
        settingsResponse.codeInjectionHead
      );
    }
    setSettings(Object.assign({}, settings, settingsResponse));
    setNewSettings(Object.assign({}, newSettings, settingsResponse));
  };

  const handleSettingsSubmit = async (event) => {
    event.preventDefault();
    const onlyChangedSettings = getObjectContainingOnlyChangedFields(
      settings,
      newSettings
    );
    if (onlyChangedSettings.codeInjectionHead) {
      onlyChangedSettings.codeInjectionHead = encode(
        onlyChangedSettings.codeInjectionHead
      );
    }
    const formattedQuery = getGraphQLQueryFields(onlyChangedSettings);
    const query = `
    mutation {
      settings: updateSiteInfo(siteData: ${formattedQuery}) {
        title,
        subtitle,
        logopath,
        currencyUnit,
        currencyISOCode,
        paymentMethod,
        stripePublishableKey,
        themePrimaryColor,
        themeSecondaryColor,
        codeInjectionHead,
        stripeSecret,
        paypalSecret,
        paytmSecret
      }
    }`;

    try {
      const fetchRequest = fetch.setPayload(query).build();
      const response = await fetchRequest.exec();
      if (response.settings) {
        setSettingsState(response.settings);
        props.dispatch(
          newSiteInfoAvailable({
            title: settings.title,
            subtitle: settings.subtitle,
            logopath: settings.logopath,
            currencyUnit: settings.currencyUnit,
            currencyISOCode: settings.currencyISOCode,
            paymentMethod: settings.paymentMethod,
            stripePublishableKey: settings.stripePublishableKey,
            themePrimaryColor: settings.themePrimaryColor,
            themeSecondaryColor: settings.themeSecondaryColor,
            codeInjectionHead: encode(settings.codeInjectionHead),
          })
        );
        props.dispatch(
          setAppMessage(new AppMessage(APP_MESSAGE_SETTINGS_SAVED))
        );
      }
    } catch (e) {
      props.dispatch(setAppMessage(new AppMessage(e.message)));
    }
  };

  const onChangeData = (e) => {
    if (!e) {
      return;
    }

    const change = Object.prototype.hasOwnProperty.call(e, "file")
      ? { logopath: e.file }
      : { [e.target.name]: e.target.value };
    setNewSettings(Object.assign({}, newSettings, change));
  };

  return (
    <Section>
      <Grid container>
        <Grid item className={classes.header}>
          <Typography variant="h1">{SITE_SETTINGS_PAGE_HEADING}</Typography>
        </Grid>

        <Grid item xs={12}>
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
                  required
                />
              </Grid>
              <Grid item>
                <MediaSelector
                  title={SITE_SETTINGS_LOGO}
                  src={newSettings.logopath || props.siteinfo.logopath}
                  onSelection={onChangeData}
                  mimeTypesToShow={[...MIMETYPE_IMAGE]}
                />
              </Grid>
            </Grid>

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
                  value={newSettings.currencyUnit || ""}
                  onChange={onChangeData}
                />
              </Grid>
              <Grid item>
                <TextField
                  variant="outlined"
                  label={SITE_SETTINGS_CURRENCY_ISO_CODE_TEXT}
                  fullWidth
                  margin="normal"
                  name="currencyISOCode"
                  value={newSettings.currencyISOCode || ""}
                  onChange={onChangeData}
                  maxLength={3}
                />
              </Grid>
              <Grid item>
                <FormControl variant="outlined" className={classes.formControl}>
                  <InputLabel htmlFor="outlined-paymentmethod-simple">
                    {SITE_ADMIN_SETTINGS_PAYMENT_METHOD}
                  </InputLabel>
                  <Select
                    autoWidth
                    value={newSettings.paymentMethod}
                    onChange={onChangeData}
                    inputProps={{
                      name: "paymentMethod",
                      id: "outlined-paymentmethod-simple",
                    }}
                  >
                    <MenuItem value={PAYMENT_METHOD_NONE}>&nbsp;</MenuItem>
                    <MenuItem value={PAYMENT_METHOD_STRIPE}>
                      {capitalize(PAYMENT_METHOD_STRIPE.toLowerCase())}
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

              {newSettings.paymentMethod === PAYMENT_METHOD_STRIPE && (
                <Grid item>
                  <TextField
                    variant="outlined"
                    label={SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT}
                    fullWidth
                    margin="normal"
                    name="stripePublishableKey"
                    value={newSettings.stripePublishableKey || ""}
                    onChange={onChangeData}
                  />
                  <TextField
                    variant="outlined"
                    label={SITE_ADMIN_SETTINGS_STRIPE_SECRET}
                    fullWidth
                    margin="normal"
                    name="stripeSecret"
                    type="password"
                    value={newSettings.stripeSecret || ""}
                    onChange={onChangeData}
                  />
                  <Grid container direction="column" spacing={1}>
                    <Grid item>
                      <Typography variant="subtitle2">
                        {HEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="body2" color="textSecondary">
                        {SUBHEADER_SECTION_PAYMENT_CONFIRMATION_WEBHOOK}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography>
                        <a href={`${props.address.backend}/payment/webhook`}>
                          {`${props.address.backend}/payment/webhook`}
                        </a>
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              )}
              {newSettings.paymentMethod === PAYMENT_METHOD_PAYPAL && (
                <Grid item>
                  <TextField
                    variant="outlined"
                    label={SITE_ADMIN_SETTINGS_PAYPAL_SECRET}
                    fullWidth
                    margin="normal"
                    name="paypalSecret"
                    type="password"
                    value={newSettings.paypalSecret || ""}
                    onChange={onChangeData}
                    disabled={true}
                  />
                </Grid>
              )}
              {newSettings.paymentMethod === PAYMENT_METHOD_PAYTM && (
                <Grid item>
                  <TextField
                    variant="outlined"
                    label={SITE_ADMIN_SETTINGS_PAYTM_SECRET}
                    fullWidth
                    margin="normal"
                    name="paytmSecret"
                    type="password"
                    value={newSettings.paytmSecret || ""}
                    onChange={onChangeData}
                    disabled={true}
                  />
                </Grid>
              )}
            </Grid>
            <Grid container direction="column">
              <Grid item>
                <Typography variant="h4">
                  {SITE_CUSTOMISATIONS_SETTING_HEADER}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  variant="outlined"
                  label={SITE_CUSTOMISATIONS_SETTING_CODEINJECTION_HEAD}
                  fullWidth
                  margin="normal"
                  name="codeInjectionHead"
                  value={newSettings.codeInjectionHead || ""}
                  onChange={onChangeData}
                  multiline
                  rows={10}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              value="Save"
              color="primary"
              className={classes.saveButton}
              disabled={
                !areObjectsDifferent(settings, newSettings) ||
                !newSettings.title ||
                !newSettings.subtitle
              }
            >
              {BUTTON_SAVE}
            </Button>
          </form>
        </Grid>
      </Grid>
    </Section>
  );
};

Settings.propTypes = {
  siteinfo: siteInfoProps,
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  siteinfo: state.siteinfo,
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Settings);
