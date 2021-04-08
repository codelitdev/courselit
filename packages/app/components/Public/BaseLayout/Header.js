import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@material-ui/core";
import SessionButton from "../SessionButton";
import { useTheme, withStyles } from "@material-ui/styles";
import dynamic from "next/dynamic";

const Branding = dynamic(() => import("./Branding"));

const styles = (theme) => ({
  branding: {
    [theme.breakpoints.up("sm")]: {
      display: "none",
    },
  },
});

const Header = ({ classes }) => {
  const theme = useTheme();

  return (
    <Grid container justify="space-between" direction="row" alignItems="center">
      <Grid item>
        <div className={classes.branding}>
          <Branding />
        </div>
      </Grid>
      {!theme.hideLoginButton && (
        <Grid item>
          <SessionButton />
        </Grid>
      )}
    </Grid>
  );
};

Header.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Header);
