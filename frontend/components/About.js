import React from "react";
import { Typography, Card, CardContent } from "@material-ui/core";
import { HEADER_ABOUT_SECTION } from "../config/strings.js";
import { connect } from "react-redux";
import { siteInfoProps } from "../types.js";

const About = props =>
  props.siteInfo.about ? (
    <Card>
      <CardContent>
        <Typography variant="h6" color="textSecondary">
          {HEADER_ABOUT_SECTION}
        </Typography>
        <Typography variant="body1">{props.siteInfo.about}</Typography>
      </CardContent>
    </Card>
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
