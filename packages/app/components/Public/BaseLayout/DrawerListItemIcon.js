import React from "react";
import PropTypes from "prop-types";
import { Grid, ListItemIcon } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  rightIcon: {
    minWidth: 0,
  },
});

const DrawerListItemIcon = ({ icon, right = false }) => {
  const classes = useStyles();

  return (
    <Grid item>
      <ListItemIcon className={right ? classes.rightIcon : ""}>
        {icon}
      </ListItemIcon>
    </Grid>
  );
};

DrawerListItemIcon.propTypes = {
  icon: PropTypes.object.isRequired,
  right: PropTypes.bool,
};

export default DrawerListItemIcon;
