import React from "react";
import { Grid, Typography } from "@mui/material";
import { Section } from "@courselit/components-library";
import dynamic from "next/dynamic";
import { HEADER_NAVIGATION } from "../../../../ui-config/strings";

const NavigationLinks = dynamic(() => import("./links"));

const Navigation = (props: Record<string, unknown>) => {
    return (
        <Grid item xs={12}>
            <Section>
                <Grid container direction="column" spacing={2}>
                    <Grid item>
                        <Typography variant="h4">
                            {HEADER_NAVIGATION}
                        </Typography>
                    </Grid>

                    <NavigationLinks />
                </Grid>
            </Section>
        </Grid>
    );
};

export default Navigation;
