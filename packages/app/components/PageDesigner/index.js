import React, { useState } from "react";
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  IconButton
} from "@material-ui/core";
import {
  CARD_HEADER_PAGE_LAYOUT,
  CARD_HEADER_THEME,
  CARD_DESCRIPTION_PAGE_LAYOUT,
  ADD_COMPONENT_POPUP_HEADER
} from "../../config/strings.js";
import { makeStyles } from "@material-ui/styles";
import { Add } from "@material-ui/icons";

import AddComponentDialog from "./AddComponentDialog.js";

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
    background: "#fbfbfb"
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

  const onSelection = componentName => {
    if (componentName) {
    }

    setComponentSelectionDialogOpened(!componentSelectionDialogOpened);
  };

  const openAddComponentDialog = showComponentsCompatibleWith => {
    setShowComponentsCompatibleWith(showComponentsCompatibleWith);
    setComponentSelectionDialogOpened(true);
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
                sm={8}
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
                    <Grid>
                      <IconButton
                        color="primary"
                        aria-label="add component to main section"
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
                      className={[classes.box, classes.outline]}
                    >
                      <Grid item>
                        <Typography variant="h6">Aside</Typography>
                      </Grid>
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
                <Grid item className={[classes.outline, classes.fixedBox]}>
                  <Typography variant="caption">Footer</Typography>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
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

export default PageDesigner;
