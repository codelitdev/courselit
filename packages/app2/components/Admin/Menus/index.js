import React from "react";
import { Grid, Typography } from "@mui/material";
import { HEADER_NAVIGATION } from "../../../config/strings.js";
import { Section } from "../../ComponentsLibrary";
import dynamic from "next/dynamic";
const NavigationLinks = dynamic(() => import("./Links"));

const Navigation = (props) => {
  return (
    <Section>
      <Grid container direction="column" spacing={2}>
        <Grid item xs>
          <Typography variant="h1">{HEADER_NAVIGATION}</Typography>
        </Grid>

        <NavigationLinks />
      </Grid>
    </Section>
  );
};

export default Navigation;
