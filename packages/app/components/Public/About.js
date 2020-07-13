import React from "react";
import { Typography, Card, CardContent, Grid, CardActionArea } from "@material-ui/core";
import { HEADER_ABOUT_SECTION } from "../../config/strings.js";
import { connect } from "react-redux";
import { siteInfoProps } from "../../types.js";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  justified: {
    textAlign: 'justified'
  }
})

const About = props => {
  const classes = useStyles()

  return props.siteInfo.about ? (
    <Grid container spacing={1}>
      <Grid item xs={12}>
        <Typography variant="h4">{HEADER_ABOUT_SECTION}</Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body1" className={classes.justified}>{props.siteInfo.about}</Typography>
      </Grid>
    </Grid>
  ) : (
    <></>
  );
}

About.propTypes = {
  siteInfo: siteInfoProps
};

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(About);
