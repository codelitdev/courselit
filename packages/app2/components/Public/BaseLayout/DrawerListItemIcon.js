import React from "react";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import { Grid, ListItemIcon } from "@mui/material";
const PREFIX = "DrawerListItemIcon";

const classes = {
  rightIcon: `${PREFIX}-rightIcon`,
};

const StyledGrid = styled(Grid)({
  [`& .${classes.rightIcon}`]: {
    minWidth: 0,
  },
});

const DrawerListItemIcon = ({ icon, right = false }) => {
  return (
    <StyledGrid item>
      <ListItemIcon className={right ? classes.rightIcon : ""}>
        {icon}
      </ListItemIcon>
    </StyledGrid>
  );
};

DrawerListItemIcon.propTypes = {
  icon: PropTypes.object.isRequired,
  right: PropTypes.bool,
};

export default DrawerListItemIcon;
