import React from "react";
import { Typography, Grid } from "@material-ui/core";
import { HEADER_ABOUT_SECTION } from "../config/strings.js";
import { connect } from "react-redux";
import { siteInfoProps } from "../types.js";

const About = props => (
  <Grid container direction="column">
    <Grid item>
      <Typography variant="h5">{HEADER_ABOUT_SECTION}</Typography>
    </Grid>
    <Grid item>
      <Typography variant="body1">{props.siteInfo.about}</Typography>
    </Grid>
  </Grid>
);

About.propTypes = {
  siteInfo: siteInfoProps
};

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(About);
