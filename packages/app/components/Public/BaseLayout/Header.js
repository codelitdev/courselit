import React from "react";
import { Grid } from "@material-ui/core";
import SessionButton from "../SessionButton";
import { useTheme } from "@material-ui/styles";

const Header = (props) => {
  const theme = useTheme();

  return (
    <Grid container justify="space-between" direction="row" alignItems="center">
      <Grid item></Grid>
      {!theme.hideLoginButton && (
        <Grid item>
          <SessionButton />
        </Grid>
      )}
    </Grid>
  );
};

export default Header;
