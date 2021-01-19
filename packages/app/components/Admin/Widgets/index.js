import React, { useState } from "react";
import PropTypes from "prop-types";
import { Grid, IconButton, Typography } from "@material-ui/core";
import { WIDGETS_PAGE_HEADER } from "../../../config/strings";
import Master from "./Master";
import Details from "./Details";
import { makeStyles } from "@material-ui/styles";
import { ArrowBack } from "@material-ui/icons";

const useStyles = makeStyles((theme) => ({
  main: {
    marginTop: theme.spacing(2),
  },
}));

const MasterDetails = (props) => {
  const [selectedWidgetName, setSelectedWidgetName] = useState("");
  const { componentsMap } = props;
  const classes = useStyles();

  return (
    <Grid container direction="column">
      <Grid item xs={12}>
        {selectedWidgetName && (
          <Grid item xs>
            <Grid container alignItems="center">
              <Grid item>
                <IconButton onClick={() => setSelectedWidgetName("")}>
                  <ArrowBack />
                </IconButton>
              </Grid>
              <Grid item>
                <Typography variant="h3">
                  {componentsMap[selectedWidgetName].caption}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        )}
        {!selectedWidgetName && (
          <Typography variant="h1">{WIDGETS_PAGE_HEADER}</Typography>
        )}
      </Grid>
      <Grid item className={classes.main} xs={12}>
        {componentsMap && (
          <>
            {selectedWidgetName && (
              <Details
                name={selectedWidgetName}
                component={componentsMap[selectedWidgetName]}
              />
            )}
            {!selectedWidgetName && (
              <Master
                componentsMap={componentsMap}
                onWidgetSelect={(name) => setSelectedWidgetName(name)}
              />
            )}
          </>
        )}
      </Grid>
    </Grid>
  );
};

MasterDetails.propTypes = {
  componentsMap: PropTypes.object.isRequired,
};

export default MasterDetails;
