import * as React from "react";
import { connect } from "react-redux";
import { WidgetProps, AppState } from "@courselit/components-library";
import { Grid, Theme, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";

const useStyles = (sectionName: string) =>
  makeStyles((theme: Theme) => ({
    container: {
      padding: theme.spacing(2),
      textAlign: sectionName === "footerRight" ? "end" : "start",
      [theme.breakpoints.down("sm")]: {
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

const mapStateToProps = (state: AppState) => ({
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(Widget);
