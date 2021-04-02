import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Grid,
  Typography,
  IconButton,
  CardActions,
  Button,
  CardHeader,
  CardContent,
} from "@material-ui/core";
import {
  CARD_HEADER_PAGE_LAYOUT,
  CARD_DESCRIPTION_PAGE_LAYOUT,
  ADD_COMPONENT_POPUP_HEADER,
  BUTTON_SAVE,
  APP_MESSAGE_CHANGES_SAVED,
  LAYOUT_SECTION_MAIN_CONTENT,
  LAYOUT_SECTION_FOOTER_RIGHT,
  LAYOUT_SECTION_FOOTER_LEFT,
  LAYOUT_SECTION_TOP,
  LAYOUT_SECTION_FOOTER,
  LAYOUT_SECTION_BOTTOM,
  LAYOUT_SECTION_ASIDE,
} from "../../../../config/strings";
import { makeStyles } from "@material-ui/styles";
import { Add } from "@material-ui/icons";
import { connect } from "react-redux";
import {
  networkAction,
  layoutAvailable,
  setAppMessage,
} from "../../../../redux/actions.js";
import AppMessage from "../../../../models/app-message";
import { addressProps, authProps, profileProps } from "../../../../types";
import widgets from "../../../../config/widgets.js";
import { Card } from "@courselit/components-library";
import FetchBuilder from "../../../../lib/fetch";
import dynamic from "next/dynamic";
const AddComponentDialog = dynamic(() => import("./AddComponentDialog.js"));
const AddedComponent = dynamic(() => import("./AddedComponent.js"));

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
    marginBottom: theme.spacing(2),
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

  const fetch = new FetchBuilder()
    .setUrl(`${props.address.backend}/graph`)
    .setIsGraphQLEndpoint(true)
    .setAuthToken(props.auth.token);

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    const query = `
    {
      layout: getLayout {
        layout
      }
    }
    `;

    const fetcher = fetch.setPayload(query).build();

    try {
      props.dispatch(networkAction(true));
      const response = await fetcher.exec();

      if (response.layout && response.layout.layout) {
        setLayout(JSON.parse(response.layout.layout));
        props.dispatch(
          layoutAvailable(response.layout && response.layout.layout)
        );
      }
    } finally {
      props.dispatch(networkAction(false));
    }
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
        props.dispatch(
          setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED))
        );
      } else {
        props.dispatch(setAppMessage(new AppMessage(response.message)));
      }
    } catch (err) {
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  return (
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
                      <Typography variant="h6">{LAYOUT_SECTION_TOP}</Typography>
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

                <Grid container item direction="row" className={classes.margin}>
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
                  <Typography variant="h6">{LAYOUT_SECTION_FOOTER}</Typography>
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
  profile: profileProps,
};

const mapStateToProps = (state) => ({
  layout: state.layout,
  auth: state.auth,
  address: state.address,
  profile: state.profile,
});

export default connect(mapStateToProps)(PageDesigner);
