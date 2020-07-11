import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  IconButton,
  CardActions,
  Button
} from "@material-ui/core";
import {
  CARD_HEADER_PAGE_LAYOUT,
  CARD_HEADER_THEME,
  CARD_DESCRIPTION_PAGE_LAYOUT,
  ADD_COMPONENT_POPUP_HEADER,
  BUTTON_SAVE,
  APP_MESSAGE_CHANGES_SAVED
} from "../../config/strings.js";
import { makeStyles } from "@material-ui/styles";
import { AddCircle } from "@material-ui/icons";

import AddComponentDialog from "./AddComponentDialog.js";
import AddedComponent from "./AddedComponent.js";
import { connect } from "react-redux";
import FetchBuilder from "../../lib/fetch.js";
import { BACKEND } from "../../config/constants.js";
import {
  networkAction,
  layoutAvailable,
  setAppMessage
} from "../../redux/actions.js";
import AppMessage from "../../models/app-message.js";
import { authProps } from "../../types.js";

const useStyles = makeStyles(theme => ({
  container: {
    borderRadius: theme.spacing(1),
    overflow: "hidden",
    border: "5px solid black"
  },
  outline: {
    border: "1px solid #eaeaea",
    textAlign: "center"
  },
  box: {
    background: "#fbfbfb",
    padding: theme.spacing(1)
  },
  fixedBox: {
    background: "#aaa"
  },
  margin: {
    margin: theme.spacing(2)
  },
  pad: {
    padding: theme.spacing(1)
  },
  marginBottom: {
    marginBottom: theme.spacing(2)
  },
  pageLayout: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(1)
  },
  mainContent: {
    height: "12em"
  }
}));

const PageDesigner = props => {
  const [
    componentSelectionDialogOpened,
    setComponentSelectionDialogOpened
  ] = useState(false);
  const [
    showComponentsCompatibleWith,
    setShowComponentsCompatibleWith
  ] = useState("");
  const classes = useStyles();
  const [layout, setLayout] = useState(props.layout);

  const onSelection = (forSection, componentName) => {
    if (componentName) {
      setLayout(
        Object.assign({}, layout, {
          [forSection]: layout[forSection]
            ? [...layout[forSection], componentName]
            : [componentName]
        })
      );
    }

    setComponentSelectionDialogOpened(!componentSelectionDialogOpened);
  };

  const openAddComponentDialog = showComponentsCompatibleWith => {
    setShowComponentsCompatibleWith(showComponentsCompatibleWith);
    setComponentSelectionDialogOpened(true);
  };

  const removeComponent = (fromSection, index) => {
    const arrayToRemoveComponentFrom = Array.from(layout[fromSection]);
    arrayToRemoveComponentFrom.splice(index, 1);

    setLayout(
      Object.assign({}, layout, {
        [fromSection]: arrayToRemoveComponentFrom
      })
    );
  };

  const saveLayout = async () => {
    const query = `
      mutation {
        layout: setLayout(layoutData: {
          layout: "${JSON.stringify(layout).replace(/"/g, '\\"')}"
        }) {
          layout
        }
      }
      `;
    console.log(query);
    const fetch = new FetchBuilder()
      .setUrl(`${BACKEND}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();

    try {
      props.dispatch(networkAction(true));
      const response = await fetch.exec();
      console.log(response);

      if (response.layout) {
        props.dispatch(layoutAvailable(response.layout.layout));
      }
    } catch (err) {
      console.log(err);
      props.dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      props.dispatch(networkAction(false));
      props.dispatch(setAppMessage(new AppMessage(APP_MESSAGE_CHANGES_SAVED)));
    }
  };

  return (
    <Grid container spacing={2}>
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
                className={[classes.container, classes.outline]}
              >
                <Grid item className={[classes.outline, classes.fixedBox]}>
                  <Typography variant="caption">Header</Typography>
                </Grid>
                <Grid container item>
                  <Grid
                    container
                    item
                    className={[classes.outline, classes.box, classes.margin]}
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
                        <Typography variant="h6">Top</Typography>
                      </Grid>
                      <Grid item>
                        <Typography variant="body2">
                          (Only visible on the homepage)
                        </Typography>
                      </Grid>
                    </Grid>
                    {layout.top &&
                      layout.top.map((item, index) => (
                        <AddedComponent
                          section="top"
                          title={item}
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
                        <AddCircle />
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
                        className={[
                          classes.fixedBox,
                          classes.outline,
                          classes.mainContent
                        ]}
                      >
                        <Typography variant="h6">Main Content</Typography>
                      </Grid>
                      <Grid
                        container
                        item
                        direction="column"
                        className={[classes.box, classes.outline]}
                      >
                        <Grid item>
                          <Typography variant="h6">Bottom</Typography>
                        </Grid>
                        {layout.bottom &&
                          layout.bottom.map((item, index) => (
                            <AddedComponent
                              section="bottom"
                              title={item}
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
                            <AddCircle />
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
                      className={[classes.box, classes.outline]}
                    >
                      <Grid item>
                        <Typography variant="h6">Aside</Typography>
                      </Grid>
                      {layout.aside &&
                        layout.aside.map((item, index) => (
                          <AddedComponent
                            section="aside"
                            title={item}
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
                          <AddCircle />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item className={[classes.outline, classes.fixedBox]}>
                  <Typography variant="caption">Footer</Typography>
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
          <CardHeader title={CARD_HEADER_THEME} />
          <CardContent>hHi</CardContent>
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
  dispatch: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
  layout: state.layout,
  auth: state.auth
});

export default connect(mapStateToProps)(PageDesigner);
