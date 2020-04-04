import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { siteInfoProps, authProps } from "../types";
import MediaManager from "./MediaManager";
import {
  makeGraphQLQueryStringFromJSObject,
  getGraphQLQueryFields,
  getObjectContainingOnlyChangedFields,
  areObjectsDifferent,
  capitalize
} from "../lib/utils.js";
import {
  BACKEND,
  PAYMENT_METHOD_PAYPAL,
  PAYMENT_METHOD_PAYTM,
  PAYMENT_METHOD_STRIPE
} from "../config/constants.js";
import { newSiteInfoAvailable, setAppMessage } from "../redux/actions.js";
import MediaSelector from "./MediaSelector.js";
import {
  TextField,
  Button,
  Typography,
  FormControl,
  Select,
  InputLabel,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import {
  SITE_SETTINGS_TITLE,
  SITE_SETTINGS_SUBTITLE,
  SITE_SETTINGS_CURRENCY_UNIT,
  SITE_SETTINGS_LOGO,
  SITE_SETTINGS_COPYRIGHT_TEXT,
  SITE_SETTINGS_ABOUT_TEXT,
  SITE_SETTINGS_PAGE_HEADING,
  SITE_SETTINGS_CURRENCY_ISO_CODE_TEXT,
  SITE_ADMIN_SETTINGS_STRIPE_SECRET,
  SITE_ADMIN_SETTINGS_PAYPAL_SECRET,
  SITE_ADMIN_SETTINGS_PAYTM_SECRET,
  SITE_SETTINGS_SECTION_GENERAL,
  SITE_SETTINGS_SECTION_PAYMENT,
  SITE_ADMIN_SETTINGS_PAYMENT_METHOD,
  SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT,
  APP_MESSAGE_SETTINGS_SAVED
} from "../config/strings.js";
import AppMessage from "../models/app-message.js";
import FetchBuilder from "../lib/fetch";

const useStyles = makeStyles(theme => ({
  formControl: {
    minWidth: "100%",
    margin: "1em 0em"
  },
  general: {
    marginBottom: theme.spacing(4)
  }
}));

const SiteSettings = props => {
  const [settings, setSettings] = useState({
    title: props.siteinfo.title,
    subtitle: props.siteinfo.subtitle,
    logopath: props.siteinfo.logopath,
    currencyUnit: props.siteinfo.currencyUnit,
    copyrightText: props.siteinfo.copyrightText,
    currencyISOCode: props.siteinfo.currencyISOCode,
    about: props.siteinfo.about,
    paymentMethod: props.siteinfo.paymentMethod,
    stripePublishableKey: props.siteinfo.stripePublishableKey
  });
  const defaultAdminState = {
    stripeSecret: "",
    paypalSecret: "",
    paytmSecret: ""
  };
  const [adminSettings, setAdminSettings] = useState(defaultAdminState);
  const [newAdminSettings, setNewAdminSettings] = useState(defaultAdminState);
  const [mediaManagerVisibility, setMediaManagerVisibility] = useState(false);
  const classes = useStyles();
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setIsGraphQLEndpoint(true)
    .setAuthToken(props.auth.token);

  useEffect(() => {
    loadAdminSettings();
  }, []);

  const loadAdminSettings = async () => {
    const query = `
    query {
      adminSettings: getSettings {
        stripeSecret,
        paypalSecret,
        paytmSecret
      }
    }`;
    try {
      const fetchRequest = fetch.setPayload(query).build();
      const response = await fetchRequest.exec();
      if (response.adminSettings) {
        setAdminSettings(
          Object.assign({}, adminSettings, response.adminSettings)
        );
        setNewAdminSettings(
          Object.assign({}, newAdminSettings, response.adminSettings)
        );
      }
    } catch (e) {}
  };

  const handleGeneralSettingsSubmit = async event => {
    event.preventDefault();
    const onlyChangedSettings = getObjectContainingOnlyChangedFields(
      props.siteinfo,
      settings
    );
    const formattedQuery = getGraphQLQueryFields(onlyChangedSettings, [
      "paymentMethod"
    ]);
    const query = `
    mutation {
      site: updateSiteInfo(siteData: ${formattedQuery}) {
        title,
        subtitle,
        logopath,
        currencyUnit,
        currencyISOCode,
        copyrightText,
        about,
        paymentMethod,
        stripePublishableKey
      }
    }`;
    try {
      const fetchRequest = fetch.setPayload(query).build();
      const response = await fetchRequest.exec();
      props.dispatch(newSiteInfoAvailable(response.site));
      props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_SETTINGS_SAVED)));
    } catch (e) {
      props.dispatch(setAppMessage(new AppMessage(e.message)));
    }
  };

  const onChangeData = e => {
    const change =
      typeof e === "string"
        ? { logopath: e }
        : { [e.target.name]: e.target.value };
    setSettings(Object.assign({}, settings, change));
  };

  const toggleMediaManagerVisibility = () =>
    setMediaManagerVisibility(!mediaManagerVisibility);

  const onAdminSettingsChanged = e => {
    const change = { [e.target.name]: e.target.value };
    setNewAdminSettings(Object.assign({}, newAdminSettings, change));
  };

  const handleAdminSettingsSubmit = async event => {
    event.preventDefault();
    const query = `
    mutation {
      adminSettings: updateSettings(settingsData: ${
        makeGraphQLQueryStringFromJSObject(adminSettings)
        // getGraphQLQueryFields(removeEmptyProperties(adminSettings), ['paymentMethod'])
      }) {
        stripeSecret,
        paypalSecret,
        paytmSecret
      }
    }`;
    try {
      const fetchRequest = fetch.setPayload(query).build();
      const response = await fetchRequest.exec();
      setAdminSettings(
        Object.assign({}, adminSettings, response.adminSettings)
      );
      setNewAdminSettings(
        Object.assign({}, newAdminSettings, response.adminSettings)
      );
      props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_SETTINGS_SAVED)));
    } catch (e) {
      props.dispatch(setAppMessage(new AppMessage(e.message)));
    }
  };

  return (
    <Grid container>
      <Grid item>
        <Typography variant="h3">{SITE_SETTINGS_PAGE_HEADING}</Typography>
      </Grid>

      <Grid item xs={12} className={classes.general}>
        <Card>
          <form onSubmit={handleGeneralSettingsSubmit}>
            <CardContent>
              <Typography variant="h6">
                {SITE_SETTINGS_SECTION_GENERAL}
              </Typography>
              <TextField
                variant="outlined"
                label={SITE_SETTINGS_TITLE}
                fullWidth
                margin="normal"
                name="title"
                value={settings.title || ""}
                onChange={onChangeData}
              />
              <TextField
                variant="outlined"
                label={SITE_SETTINGS_SUBTITLE}
                fullWidth
                margin="normal"
                name="subtitle"
                value={settings.subtitle || ""}
                onChange={onChangeData}
              />
              <TextField
                variant="outlined"
                label={SITE_SETTINGS_CURRENCY_UNIT}
                fullWidth
                margin="normal"
                name="currencyUnit"
                value={settings.currencyUnit || ""}
                onChange={onChangeData}
              />
              <TextField
                variant="outlined"
                label={SITE_SETTINGS_CURRENCY_ISO_CODE_TEXT}
                fullWidth
                margin="normal"
                name="currencyISOCode"
                value={settings.currencyISOCode || ""}
                onChange={onChangeData}
                maxLength={3}
              />
              <TextField
                variant="outlined"
                label={SITE_SETTINGS_COPYRIGHT_TEXT}
                fullWidth
                margin="normal"
                name="copyrightText"
                value={settings.copyrightText || ""}
                onChange={onChangeData}
              />
              <TextField
                variant="outlined"
                label={SITE_SETTINGS_ABOUT_TEXT}
                fullWidth
                margin="normal"
                name="about"
                value={settings.about || ""}
                onChange={onChangeData}
              />
              <FormControl variant="outlined" className={classes.formControl}>
                <InputLabel htmlFor="outlined-paymentmethod-simple">
                  {SITE_ADMIN_SETTINGS_PAYMENT_METHOD}
                </InputLabel>
                <Select
                  autoWidth
                  value={settings.paymentMethod}
                  onChange={onChangeData}
                  inputProps={{
                    name: "paymentMethod",
                    id: "outlined-paymentmethod-simple"
                  }}
                >
                  <MenuItem value={PAYMENT_METHOD_STRIPE}>
                    {capitalize(PAYMENT_METHOD_STRIPE.toLowerCase())}
                  </MenuItem>
                  <MenuItem value={PAYMENT_METHOD_PAYPAL} disabled={true}>
                    {capitalize(PAYMENT_METHOD_PAYPAL.toLowerCase())}
                  </MenuItem>
                  <MenuItem value={PAYMENT_METHOD_PAYTM} disabled={true}>
                    {capitalize(PAYMENT_METHOD_PAYTM.toLowerCase())}
                  </MenuItem>
                </Select>
              </FormControl>
              {settings.paymentMethod === PAYMENT_METHOD_STRIPE && (
                <TextField
                  variant="outlined"
                  label={SITE_SETTINGS_STRIPE_PUBLISHABLE_KEY_TEXT}
                  fullWidth
                  margin="normal"
                  name="stripePublishableKey"
                  value={settings.stripePublishableKey || ""}
                  onChange={onChangeData}
                />
              )}
              <MediaSelector
                title={SITE_SETTINGS_LOGO}
                src={settings.logopath || props.siteinfo.logopath}
                onSelection={onChangeData}
              />
            </CardContent>
            <CardActions>
              <Button
                type="submit"
                value="Save"
                disabled={
                  !areObjectsDifferent(props.siteinfo, settings) ||
                  !settings.title ||
                  !settings.subtitle
                }
              >
                Save
              </Button>
            </CardActions>
          </form>
        </Card>

        {/* <Grid container direction='column'>
          <Grid item>
            <Typography variant='h5'>
              {SITE_SETTINGS_SECTION_GENERAL}
            </Typography>
          </Grid>
          <Grid item>
            <form onSubmit={handleGeneralSettingsSubmit}>

              <Button
                variant='contained'
                color='default'
                type='submit'
                value='Save'
                disabled={!!((!settings.title && !settings.subtitle && !settings.logopath))}>
                  Save
              </Button>
            </form>
          </Grid>
        </Grid> */}
      </Grid>

      <Grid item xs={12}>
        <Card>
          <form onSubmit={handleAdminSettingsSubmit}>
            <CardContent>
              <Typography variant="h6">
                {SITE_SETTINGS_SECTION_PAYMENT}
              </Typography>
              <TextField
                variant="outlined"
                label={SITE_ADMIN_SETTINGS_STRIPE_SECRET}
                fullWidth
                margin="normal"
                name="stripeSecret"
                type="password"
                value={adminSettings.stripeSecret || ""}
                onChange={onAdminSettingsChanged}
              />
              <TextField
                variant="outlined"
                label={SITE_ADMIN_SETTINGS_PAYPAL_SECRET}
                fullWidth
                margin="normal"
                name="paypalSecret"
                type="password"
                value={adminSettings.paypalSecret || ""}
                onChange={onAdminSettingsChanged}
                disabled={true}
              />
              <TextField
                variant="outlined"
                label={SITE_ADMIN_SETTINGS_PAYTM_SECRET}
                fullWidth
                margin="normal"
                name="paytmSecret"
                type="password"
                value={adminSettings.paytmSecret || ""}
                onChange={onAdminSettingsChanged}
                disabled={true}
              />
            </CardContent>
            <CardActions>
              <Button
                type="submit"
                value="Save"
                disabled={!areObjectsDifferent(adminSettings, newAdminSettings)}
              >
                Save
              </Button>
            </CardActions>
          </form>
        </Card>

        {/* <Grid container direction='column'>
          <Grid item>
            <Typography variant='h5'>
              {SITE_SETTINGS_SECTION_PAYMENT}
            </Typography>
          </Grid>
          <Grid item>
            <form onSubmit={handleAdminSettingsSubmit}>

            </form>
          </Grid>
        </Grid> */}
      </Grid>

      {mediaManagerVisibility && (
        <MediaManager
          toggleVisibility={toggleMediaManagerVisibility}
          onMediaSelected={onChangeData}
        />
      )}
    </Grid>
  );
};

SiteSettings.propTypes = {
  siteinfo: siteInfoProps,
  auth: authProps,
  dispatch: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
  siteinfo: state.siteinfo,
  auth: state.auth
});

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
});

export default connect(mapStateToProps, mapDispatchToProps)(SiteSettings);
