import React from "react";
import { connect } from "react-redux";
import { siteInfoProps } from "../../../types.js";
import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { GENERIC_COPYRIGHT_TEXT } from "../../../config/strings.js";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(2),
    borderTop: "1px solid #ccc",
  },
}));

const Footer = (props) => {
  const classes = useStyles();

  return (
    <Grid
      container
      direction="row"
      justify="space-between"
      className={classes.container}
    >
      <Grid item>
        <Typography variant="h5">{props.siteInfo.title}</Typography>
        <Typography variant="subtitle2">{props.siteInfo.subtitle}</Typography>
      </Grid>
      <Grid item>
        <Typography variant="body2">
          {props.siteInfo.copyrightText || GENERIC_COPYRIGHT_TEXT}
        </Typography>
      </Grid>
    </Grid>
  );
};

Footer.propTypes = {
  siteInfo: siteInfoProps,
};

const mapStateToProps = (state) => ({
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(Footer);
