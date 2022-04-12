import * as React from "react";
import { WidgetProps } from "@courselit/common-models";
import { Grid, Theme, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";

const useStyles = (sectionName: string) =>
  makeStyles((theme: Theme) => ({
    container: {
      textAlign: sectionName === "footerRight" ? "end" : "start",
      [theme.breakpoints.down("md")]: {
        textAlign: "start",
      },
    },
  }));

export interface FooterBrandingWidgetProps extends WidgetProps {
  siteInfo: any;
}

const Widget = (props: FooterBrandingWidgetProps) => {
  const { siteInfo, section } = props;
  const classes = useStyles(section)();

  return (
    <Grid item xs className={classes.container}>
      <Typography variant="h5">{siteInfo.title}</Typography>
      <Typography variant="subtitle1">{siteInfo.subtitle}</Typography>
    </Grid>
  );
};

export default Widget;
