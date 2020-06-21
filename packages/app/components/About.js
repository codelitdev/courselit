import React from "react";
import { Typography, Card, CardContent, Grid } from "@material-ui/core";
import { HEADER_ABOUT_SECTION } from "../config/strings.js";
import { connect } from "react-redux";
import { siteInfoProps } from "../types.js";

const About = props =>
  props.siteInfo.about ? (
    <Grid container spacing={2}>
      <Grid item>
        <Typography variant="h2">{HEADER_ABOUT_SECTION}</Typography>
      </Grid>
      <Grid item>
        <Card>
          <CardContent>
            <Typography variant="body1">{props.siteInfo.about}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  ) : (
    <></>
  );

About.propTypes = {
  siteInfo: siteInfoProps
};

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(About);
