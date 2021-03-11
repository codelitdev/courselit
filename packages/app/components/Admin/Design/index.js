import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  Grid,
  Typography,
  IconButton,
  CardActions,
  Button,
  TextField,
  Link,
  CardHeader,
  CardContent,
} from "@material-ui/core";
import {
  CARD_HEADER_PAGE_LAYOUT,
  CARD_HEADER_THEME,
  CARD_DESCRIPTION_PAGE_LAYOUT,
  ADD_COMPONENT_POPUP_HEADER,
  BUTTON_SAVE,
  APP_MESSAGE_CHANGES_SAVED,
  SUBHEADER_THEME_ADD_THEME,
  SUBHEADER_THEME_ADD_THEME_INPUT_LABEL,
  SUBHEADER_THEME_ADD_THEME_INPUT_PLACEHOLDER,
  SUBHEADER_THEME_INSTALLED_THEMES,
  BUTTON_GET_THEMES,
  REMIXED_THEME_PREFIX,
  APP_MESSAGE_THEME_COPIED,
  NO_THEMES_INSTALLED,
  BUTTON_THEME_INSTALL,
  APP_MESSAGE_THEME_INSTALLED,
  ERROR_SNACKBAR_PREFIX,
  APP_MESSAGE_THEME_APPLIED,
  APP_MESSAGE_THEME_UNINSTALLED,
  HEADER_NAVIGATION,
  LAYOUT_SECTION_MAIN_CONTENT,
  LAYOUT_SECTION_FOOTER_RIGHT,
  LAYOUT_SECTION_FOOTER_LEFT,
  LAYOUT_SECTION_TOP,
  LAYOUT_SECTION_FOOTER,
  LAYOUT_SECTION_BOTTOM,
  LAYOUT_SECTION_ASIDE,
  HEADER_DESIGN,
} from "../../../config/strings.js";
import { makeStyles } from "@material-ui/styles";
import { Add } from "@material-ui/icons";
import AddComponentDialog from "./AddComponentDialog.js";
import AddedComponent from "./AddedComponent.js";
import { connect } from "react-redux";
import FetchBuilder from "../../../lib/fetch.js";
import { THEMES_REPO } from "../../../config/constants.js";
import {
  networkAction,
  layoutAvailable,
  setAppMessage,
} from "../../../redux/actions.js";
import AppMessage from "../../../models/app-message.js";
import { addressProps, authProps } from "../../../types.js";
import ThemeItem from "./ThemeItem.js";
import NavigationLinks from "./NavigationLinks/index.js";
import widgets from "../../../config/widgets.js";
import { Card } from "@courselit/components-library";

const useStyles = makeStyles((theme) => ({
  container: {
    borderRadius: theme.spacing(1),
    overflow: "hidden",
    border: "2px solid #eee",
  },
  outline: {
    border: "1px dashed #d2d2d2",
    textAlign: "center",
  },
  box: {
    background: "#fbfbfb",
    padding: theme.spacing(1),
  },
  fixedBox: {
    background: "#efefef",
    textAlign: "center",
  },
  margin: {
    margin: theme.spacing(2),
  },
  pad: {
    padding: theme.spacing(1),
  },
  marginBottom: {
    marginBottom: theme.spacing(2),
  },
  pageLayout: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(1),
  },
  mainContent: {
    height: "12em",
  },
  section: {
    background: "white",
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  sectionHeader: {
    marginBottom: theme.spacing(2),
  },
}));

const PageDesigner = (props) => {
  const [
    componentSelectionDialogOpened,
    setComponentSelectionDialogOpened,
  ] = useState(false);
  const [
    showComponentsCompatibleWith,
    setShowComponentsCompatibleWith,
  ] = useState("");
  const classes = useStyles();
  const [layout, setLayout] = useState(props.layout);
  const [installedThemes, setInstalledThemes] = useState([]);
  const [newThemeText, setNewThemeText] = useState("");
  const [isNewThemeTextValid, setIsNewThemeTextValid] = useState(false);
  const themeInputRef = useRef();
  const fetch = new FetchBuilder()
    .setUrl(`${props.address.backend}/graph`)
    .setIsGraphQLEndpoint(true)
    .setAuthToken(props.auth.token);

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
    try {
      const fetcher = fetch.setPayload(query).build();
      const response = await fetcher.exec();
      if (response.themes) {
        setInstalledThemes(response.themes);
      }
    } catch (e) {}
  };

  const onSelection = (forSection, componentName) => {
    if (componentName) {
      setLayout(
        Object.assign({}, layout, {
          [forSection]: layout[forSection]
            ? [...layout[forSection], componentName]
            : [componentName],
        })
      );
    }

    setComponentSelectionDialogOpened(!componentSelectionDialogOpened);
  };

  const openAddComponentDialog = (showComponentsCompatibleWith) => {
    setShowComponentsCompatibleWith(showComponentsCompatibleWith);
    setComponentSelectionDialogOpened(true);
  };

  const removeComponent = (fromSection, index) => {
    const arrayToRemoveComponentFrom = Array.from(layout[fromSection]);
    arrayToRemoveComponentFrom.splice(index, 1);

    setLayout(
      Object.assign({}, layout, {
        [fromSection]: arrayToRemoveComponentFrom,
      })
    );
  };

  const saveLayout = async () => {
    const mutation = `
      mutation {
        layout: setLayout(layoutData: {
          layout: "${JSON.stringify(layout).replace(/"/g, '\\"')}"
        }) {
          layout
        }
      }
      `;
    const fetcher = fetch.setPayload(mutation).build();

    try {
      props.dispatch(networkAction(true));
      const response = await fetcher.exec();

      if (response.layout) {
        props.dispatch(layoutAvailable(response.layout.layout));
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
      props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED)));
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
        props.dispatch(
          setAppMessage(new AppMessage(APP_MESSAGE_THEME_INSTALLED))
        );
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
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
      props.dispatch(networkAction(true));
      const response = await fetcher.exec();

      if (response.theme) {
        props.dispatch(
          setAppMessage(new AppMessage(APP_MESSAGE_THEME_APPLIED))
        );
        loadInstalledThemes();
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
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
      props.dispatch(networkAction(true));
      const response = await fetcher.exec();

      if (response.removeTheme) {
        props.dispatch(
          setAppMessage(new AppMessage(APP_MESSAGE_THEME_UNINSTALLED))
        );
        loadInstalledThemes();
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const onThemeRemix = (themeId) => {
    const theme = installedThemes.find((theme) => theme.id === themeId);
    if (theme) {
      const themeCopy = Object.assign({}, theme);
      themeCopy.id = themeCopy.id + `_${REMIXED_THEME_PREFIX.toLowerCase()}`;
      themeCopy.name = themeCopy.name + ` ${REMIXED_THEME_PREFIX}`;
      setNewThemeText(JSON.stringify(themeCopy, null, 3));

      props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_THEME_COPIED)));

      themeInputRef.current.focus();
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs>
        <Typography variant="h1">{HEADER_DESIGN}</Typography>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardHeader title={CARD_HEADER_PAGE_LAYOUT} />
          <CardContent className={classes.center}>
            <Typography variant="body1" className={classes.marginBottom}>
              {CARD_DESCRIPTION_PAGE_LAYOUT}
            </Typography>
            <Grid container justify="center" className={classes.pageLayout}>
              <Grid
                container
                item
                direction="column"
                xs={12}
                sm={9}
                className={classes.container}
              >
                <Grid item className={classes.fixedBox}>
                  <Typography variant="caption">Header</Typography>
                </Grid>

                <Grid container item>
                  <Grid
                    container
                    item
                    className={`${classes.outline} ${classes.box} ${classes.margin}`}
                    direction="column"
                  >
                    <Grid
                      container
                      item
                      direction="row"
                      justify="center"
                      alignItems="center"
                      spacing={1}
                    >
                      <Grid item>
                        <Typography variant="h6">
                          {LAYOUT_SECTION_TOP}
                        </Typography>
                      </Grid>
                    </Grid>
                    {layout.top &&
                      layout.top.map((item, index) => (
                        <AddedComponent
                          section="top"
                          title={widgets[item].metadata.displayName}
                          index={index}
                          removeComponent={removeComponent}
                          key={index}
                        />
                      ))}
                    <Grid item>
                      <IconButton
                        color="primary"
                        aria-label="add component to the top section"
                        onClick={() => openAddComponentDialog("top")}
                      >
                        <Add />
                      </IconButton>
                    </Grid>
                  </Grid>

                  <Grid
                    container
                    item
                    direction="row"
                    className={classes.margin}
                  >
                    <Grid
                      container
                      item
                      direction="column"
                      xs={12}
                      sm={12}
                      md={9}
                    >
                      <Grid
                        item
                        container
                        className={`${classes.fixedBox} ${classes.outline} ${classes.mainContent}`}
                        justify="center"
                        alignItems="center"
                      >
                        <Grid item>
                          <Typography variant="h6">
                            {LAYOUT_SECTION_MAIN_CONTENT}
                          </Typography>
                        </Grid>
                      </Grid>
                      <Grid
                        container
                        item
                        direction="column"
                        className={`${classes.box} ${classes.outline}`}
                      >
                        <Grid item>
                          <Typography variant="h6">
                            {LAYOUT_SECTION_BOTTOM}
                          </Typography>
                        </Grid>
                        {layout.bottom &&
                          layout.bottom.map((item, index) => (
                            <AddedComponent
                              section="bottom"
                              title={widgets[item].metadata.displayName}
                              index={index}
                              removeComponent={removeComponent}
                              key={index}
                            />
                          ))}
                        <Grid item>
                          <IconButton
                            color="primary"
                            aria-label="add component to main section"
                            onClick={() => openAddComponentDialog("bottom")}
                          >
                            <Add />
                          </IconButton>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid
                      container
                      item
                      direction="column"
                      xs={12}
                      sm={12}
                      md={3}
                      className={`${classes.box} ${classes.outline}`}
                    >
                      <Grid item>
                        <Typography variant="h6">
                          {LAYOUT_SECTION_ASIDE}
                        </Typography>
                      </Grid>
                      {layout.aside &&
                        layout.aside.map((item, index) => (
                          <AddedComponent
                            section="aside"
                            title={widgets[item].metadata.displayName}
                            index={index}
                            removeComponent={removeComponent}
                            key={index}
                          />
                        ))}
                      <Grid item>
                        <IconButton
                          color="primary"
                          aria-label="add component to main section"
                          onClick={() => openAddComponentDialog("aside")}
                        >
                          <Add />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                <Grid
                  container
                  item
                  className={`${classes.outline} ${classes.box}`}
                  direction="column"
                >
                  <Grid item>
                    <Typography variant="h6">
                      {LAYOUT_SECTION_FOOTER}
                    </Typography>
                  </Grid>
                  <Grid item container direction="row" justify="space-between">
                    <Grid
                      item
                      container
                      className={classes.outline}
                      xs={12}
                      md={6}
                      direction="column"
                    >
                      <Grid item>
                        <Typography variant="h6">
                          {LAYOUT_SECTION_FOOTER_LEFT}
                        </Typography>
                      </Grid>
                      {layout.footerLeft &&
                        layout.footerLeft.map((item, index) => (
                          <AddedComponent
                            section="footerLeft"
                            title={widgets[item].metadata.displayName}
                            index={index}
                            removeComponent={removeComponent}
                            key={index}
                          />
                        ))}
                      <Grid item>
                        <IconButton
                          color="primary"
                          aria-label="add component to the footer's left section"
                          onClick={() => openAddComponentDialog("footerLeft")}
                        >
                          <Add />
                        </IconButton>
                      </Grid>
                    </Grid>
                    <Grid
                      item
                      container
                      className={classes.outline}
                      xs={12}
                      md={6}
                      direction="column"
                    >
                      <Grid item>
                        <Typography variant="h6">
                          {LAYOUT_SECTION_FOOTER_RIGHT}
                        </Typography>
                      </Grid>
                      {layout.footerRight &&
                        layout.footerRight.map((item, index) => (
                          <AddedComponent
                            section="footerRight"
                            title={widgets[item].metadata.displayName}
                            index={index}
                            removeComponent={removeComponent}
                            key={index}
                          />
                        ))}
                      <Grid item>
                        <IconButton
                          color="primary"
                          aria-label="add component to the footer section"
                          onClick={() => openAddComponentDialog("footerRight")}
                        >
                          <Add />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
          <CardActions>
            <Button
              disabled={JSON.stringify(layout) === JSON.stringify(props.layout)}
              onClick={saveLayout}
            >
              {BUTTON_SAVE}
            </Button>
          </CardActions>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <div className={classes.section}>
            <Typography variant="h4" className={classes.sectionHeader}>
              {CARD_HEADER_THEME}
            </Typography>
            <Grid container direction="column" spacing={4}>
              <Grid item>
                <Typography variant="h6">
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
                <Grid
                  item
                  container
                  justify="space-between"
                  alignItems="center"
                >
                  <Typography variant="h6">
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
        </Card>
      </Grid>

      <Grid item container xs direction="column">
        <Card>
          <div className={classes.section}>
            <Typography variant="h4" className={classes.sectionHeader}>
              {HEADER_NAVIGATION}
            </Typography>
            <NavigationLinks />
          </div>
        </Card>
      </Grid>

      <AddComponentDialog
        onClose={onSelection}
        onOpen={componentSelectionDialogOpened}
        title={ADD_COMPONENT_POPUP_HEADER}
        showComponentsCompatibleWith={showComponentsCompatibleWith}
      />
    </Grid>
  );
};

PageDesigner.propTypes = {
  layout: PropTypes.object.isRequired,
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  layout: state.layout,
  auth: state.auth,
  address: state.address,
});

export default connect(mapStateToProps)(PageDesigner);
