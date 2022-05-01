import * as React from "react";
import { WidgetProps } from "@courselit/common-models";
import { Grid, Theme, Typography } from "@mui/material";

export interface FooterBrandingWidgetProps extends WidgetProps {
  siteInfo: any;
}

const Widget = (props: FooterBrandingWidgetProps) => {
  const { siteInfo, section } = props;

  return (
    <Grid
      item
      xs
      sx={{
        textAlign: {
          xs: "start",
          md: section === "footerRight" ? "end" : "start",
        },
      }}
    >
      <Typography variant="h5">{siteInfo.title}</Typography>
      <Typography variant="subtitle1">{siteInfo.subtitle}</Typography>
    </Grid>
  );
};

export default Widget;
