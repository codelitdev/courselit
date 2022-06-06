import * as React from "react";
import { WidgetProps } from "@courselit/common-models";
import { Grid, Theme, Typography } from "@mui/material";

export interface FooterBrandingWidgetProps extends WidgetProps {
    siteInfo: any;
}

const Widget = (props: FooterBrandingWidgetProps) => {
    const { state, section } = props;
    const { title, subtitle } = state.siteinfo;

    return (
        <Grid
            item
            xs
            sx={{
                textAlign: {
                    xs: "start",
                    md: section === "footerRight" ? "end" : "start",
                },
                padding: 2,
            }}
        >
            <Typography variant="h5">{title}</Typography>
            <Typography variant="subtitle1">{subtitle}</Typography>
        </Grid>
    );
};

export default Widget;
