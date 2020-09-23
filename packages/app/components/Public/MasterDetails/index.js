import React, { useState } from "react";
import PropTypes from "prop-types";
import { Grid, Typography } from "@material-ui/core";
import { WIDGETS_PAGE_HEADER } from "../../../config/strings";
import Master from "./Master";
import Details from "./Details";
import { makeStyles } from "@material-ui/styles";

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
      <Grid item>
        <Typography variant="h3">{WIDGETS_PAGE_HEADER}</Typography>
      </Grid>
      <Grid item className={classes.main}>
        {componentsMap && (
          <>
            {selectedWidgetName && (
              <Details
                name={selectedWidgetName}
                onBackPressed={() => setSelectedWidgetName("")}
                component={componentsMap[selectedWidgetName].component}
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
