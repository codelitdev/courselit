import React from "react";
import { Grid, Typography } from "@material-ui/core";
import { HEADER_NAVIGATION } from "../../../config/strings.js";
import dynamic from "next/dynamic";
const NavigationLinks = dynamic(() => import("./Links"));

const Navigation = (props) => {
  return (
    <Grid container direction="column" spacing={2}>
      <Grid item xs>
        <Typography variant="h1">{HEADER_NAVIGATION}</Typography>
      </Grid>

      <Grid item container xs direction="column">
        <NavigationLinks />
      </Grid>
    </Grid>
  );
};

export default Navigation;
