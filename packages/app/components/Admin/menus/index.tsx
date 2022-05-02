import React from "react";
import { Grid, Typography } from "@mui/material";
import { HEADER_NAVIGATION } from "../../../ui-config/strings";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";

const NavigationLinks = dynamic(() => import("./links"));

const Navigation = (props: Record<string, unknown>) => {
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
