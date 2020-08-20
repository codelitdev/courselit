import React from "react";
import PropTypes from "prop-types";
import { Grid, ListItemIcon } from "@material-ui/core";

const DrawerListItemIcon = (props) => (
  <Grid item>
    <ListItemIcon>{props.icon}</ListItemIcon>
  </Grid>
);

DrawerListItemIcon.propTypes = {
  icon: PropTypes.object,
};

export default DrawerListItemIcon;
