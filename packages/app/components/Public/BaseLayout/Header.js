import React from "react";
import { Grid } from "@material-ui/core";
import SessionButton from "../SessionButton";

const Header = (props) => {
  return (
    <Grid container justify="space-between" direction="row" alignItems="center">
      <Grid item></Grid>
      <Grid item>
        <SessionButton />
      </Grid>
    </Grid>
  );
};

export default Header;
