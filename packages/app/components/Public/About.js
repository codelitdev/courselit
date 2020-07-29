import React from "react";
import { Typography, Grid } from "@material-ui/core";
import { HEADER_ABOUT_SECTION } from "../../config/strings.js";
import { connect } from "react-redux";
import { siteInfoProps } from "../../types.js";
import { makeStyles } from "@material-ui/styles";
import Header from "./Header.js";

const useStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing(4),
    paddingTop: theme.spacing(8),
  }
}));

const About = props => {
  const classes = useStyles();

  return props.siteInfo.about ? (
    <Grid container direction='column' className={classes.container}>
      <Grid item xs={12}>
        <Header text={HEADER_ABOUT_SECTION} />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body1" className={classes.justified}>
          {props.siteInfo.about}
        </Typography>
      </Grid>
    </Grid>
  ) : (
    <></>
  );
};

About.propTypes = {
  siteInfo: siteInfoProps
};

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
});

export default connect(mapStateToProps)(About);
