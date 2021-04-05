import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Grid, Typography, Link, TextField, Button } from "@material-ui/core";
import FetchBuilder from "../../../../lib/fetch";
import { addressProps, authProps } from "../../../../types";
import { networkAction, setAppMessage } from "../../../../redux/actions";
import AppMessage from "../../../../models/app-message";
import {
  APP_MESSAGE_THEME_APPLIED,
  APP_MESSAGE_THEME_COPIED,
  APP_MESSAGE_THEME_INSTALLED,
  APP_MESSAGE_THEME_UNINSTALLED,
  BUTTON_GET_THEMES,
  BUTTON_THEME_INSTALL,
  CARD_HEADER_THEME,
  ERROR_SNACKBAR_PREFIX,
  NO_THEMES_INSTALLED,
  REMIXED_THEME_PREFIX,
  SUBHEADER_THEME_ADD_THEME,
  SUBHEADER_THEME_ADD_THEME_INPUT_LABEL,
  SUBHEADER_THEME_ADD_THEME_INPUT_PLACEHOLDER,
  SUBHEADER_THEME_INSTALLED_THEMES,
} from "../../../../config/strings";
import { THEMES_REPO } from "../../../../config/constants";
import { makeStyles } from "@material-ui/styles";
import { Section } from "@courselit/components-library";
import ThemeItem from "./ThemeItem.js";

const useStyles = makeStyles((theme) => ({
  section: {
    marginBottom: theme.spacing(2),
  },
  sectionHeader: {
    marginBottom: theme.spacing(2),
  },
}));

const ThemesManager = ({ address, auth, dispatch }) => {
  const [installedThemes, setInstalledThemes] = useState([]);
  const [newThemeText, setNewThemeText] = useState("");
  const [isNewThemeTextValid, setIsNewThemeTextValid] = useState(false);
  const themeInputRef = useRef();
  const classes = useStyles();
  const fetch = new FetchBuilder()
    .setUrl(`${address.backend}/graph`)
    .setIsGraphQLEndpoint(true)
    .setAuthToken(auth.token);

  useEffect(() => {
    loadInstalledThemes();
  }, []);

  const loadInstalledThemes = async () => {
    const query = `
    query {
      themes: getAllThemes {
        id,
        name,
        active,
        styles,
        url
      }
    }`;

    const fetcher = fetch.setPayload(query).build();

    try {
      dispatch(networkAction(true));
      const response = await fetcher.exec();
      if (response.themes) {
        setInstalledThemes(response.themes);
      }
    } finally {
      dispatch(networkAction(false));
    }
  };

  const addTheme = async () => {
    try {
      const parsedTheme = JSON.parse(newThemeText);

      const mutation = `
          mutation {
            theme: addTheme(theme: {
              id: "${parsedTheme.id}",
              name: "${parsedTheme.name}",
              styles: ${JSON.stringify(parsedTheme.styles)},
              url: "${parsedTheme.url}"
            }) {
              id
            }
          }
          `;
      const fetcher = fetch.setPayload(mutation).build();

      const response = await fetcher.exec();
      if (response.errors) {
        throw new Error(
          `${ERROR_SNACKBAR_PREFIX}: ${response.errors[0].message}`
        );
      }

      if (response.theme) {
        setNewThemeText("");
        setIsNewThemeTextValid(false);
        loadInstalledThemes();
        dispatch(setAppMessage(new AppMessage(APP_MESSAGE_THEME_INSTALLED)));
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const validateNewThemeText = (text) => {
    if (!text) {
      return false;
    }

    try {
      const parsedTheme = JSON.parse(text);

      if (!parsedTheme.id || (!parsedTheme.name && !parsedTheme.styles)) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  };

  const onNewThemeTextChanged = (e) => {
    setNewThemeText(e.target.value);

    if (validateNewThemeText(e.target.value)) {
      setIsNewThemeTextValid(true);
    } else {
      setIsNewThemeTextValid(false);
    }
  };

  const onThemeApply = async (themeId) => {
    const mutation = `
          mutation {
            theme: setTheme(id: "${themeId}") {
              id
            }
          }
        `;

    const fetcher = fetch.setPayload(mutation).build();

    try {
      dispatch(networkAction(true));
      const response = await fetcher.exec();

      if (response.theme) {
        dispatch(setAppMessage(new AppMessage(APP_MESSAGE_THEME_APPLIED)));
        loadInstalledThemes();
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const onThemeUninstall = async (themeId) => {
    const mutation = `
          mutation c {
            removeTheme(id: "${themeId}")
          }
        `;

    const fetcher = fetch.setPayload(mutation).build();

    try {
      dispatch(networkAction(true));
      const response = await fetcher.exec();

      if (response.removeTheme) {
        dispatch(setAppMessage(new AppMessage(APP_MESSAGE_THEME_UNINSTALLED)));
        loadInstalledThemes();
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
    }
  };

  const onThemeRemix = (themeId) => {
    const theme = installedThemes.find((theme) => theme.id === themeId);
    if (theme) {
      const themeCopy = Object.assign({}, theme);
      themeCopy.id = themeCopy.id + `_${REMIXED_THEME_PREFIX.toLowerCase()}`;
      themeCopy.name = themeCopy.name + ` ${REMIXED_THEME_PREFIX}`;
      setNewThemeText(JSON.stringify(themeCopy, null, 3));

      dispatch(setAppMessage(new AppMessage(APP_MESSAGE_THEME_COPIED)));

      themeInputRef.current.focus();
    }
  };

  return (
    <Grid item xs={12}>
      <Section>
        <div className={classes.section}>
          <Typography variant="h4" className={classes.sectionHeader}>
            {CARD_HEADER_THEME}
          </Typography>
          <Grid container direction="column" spacing={4}>
            <Grid item>
              <Typography variant="h5">
                {SUBHEADER_THEME_INSTALLED_THEMES}
              </Typography>
            </Grid>
            {installedThemes.length !== 0 && (
              <Grid item container direction="column" spacing={2}>
                {installedThemes.map((theme) => (
                  <ThemeItem
                    theme={theme}
                    key={theme.id}
                    onApply={onThemeApply}
                    onRemix={onThemeRemix}
                    onUninstall={onThemeUninstall}
                  />
                ))}
              </Grid>
            )}
            {installedThemes.length === 0 && (
              <Grid item>
                <Typography variant="body1" color="textSecondary">
                  {NO_THEMES_INSTALLED}
                </Typography>
              </Grid>
            )}
            <Grid item>
              <Link href={THEMES_REPO} target="_blank" rel="noopener">
                {BUTTON_GET_THEMES}
              </Link>
            </Grid>
            <Grid item container direction="column" spacing={2}>
              <Grid item container justify="space-between" alignItems="center">
                <Typography variant="h5">
                  {SUBHEADER_THEME_ADD_THEME}
                </Typography>
              </Grid>
              <Grid item>
                <form>
                  <TextField
                    required
                    variant="outlined"
                    label={SUBHEADER_THEME_ADD_THEME_INPUT_LABEL}
                    fullWidth
                    value={newThemeText}
                    onChange={onNewThemeTextChanged}
                    placeholder={SUBHEADER_THEME_ADD_THEME_INPUT_PLACEHOLDER}
                    multiline
                    rows={10}
                    inputRef={themeInputRef}
                  />
                </form>
              </Grid>
              <Grid item>
                <Button disabled={!isNewThemeTextValid} onClick={addTheme}>
                  {BUTTON_THEME_INSTALL}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </div>
      </Section>
    </Grid>
  );
};

ThemesManager.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(ThemesManager);
