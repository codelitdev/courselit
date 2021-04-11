/**
 * A component that shows site's logo and name.
 */

import React from "react";
import PropTypes from "prop-types";
import { Link, Grid, Typography } from "@material-ui/core";
import dynamic from "next/dynamic";
import { connect } from "react-redux";
import { withStyles } from "@material-ui/styles";
import { siteInfoProps } from "../../../types";
import { constructThumbnailUrlFromFileUrl } from "../../../lib/utils";

const Img = dynamic(() => import("../../Img"));

const styles = (theme) => ({
  toolbar: theme.mixins.toolbar,
  logoAdjustment: {},
  logocontainer: Object.assign(
    {},
    {
      width: "2.4em",
      height: "2.4em",
      display: "flex",
      marginRight: theme.spacing(1),
    },
    theme.logo
  ),
  logoimg: {
    borderRadius: "0.2em",
  },
  siteName: Object.assign(
    {},
    {
      display: "none",
    },
    theme.siteName
  ),
});

const Branding = ({ classes, siteinfo }) => {
  return (
    <Link href="/" color="inherit" style={{ textDecoration: "none" }}>
      <Grid
        container
        alignItems="center"
        className={`${classes.toolbar} ${classes.logoAdjustment}`}
      >
        <Grid item className={classes.logocontainer}>
          <Img src={constructThumbnailUrlFromFileUrl(siteinfo.logopath)} />
        </Grid>
        <Grid item className={classes.siteName}>
          <Typography variant="h5">{siteinfo.title}</Typography>
        </Grid>
      </Grid>
    </Link>
  );
};

Branding.propTypes = {
  siteinfo: siteInfoProps,
  classes: PropTypes.object,
};

const mapStateToProps = (state) => ({
  siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(withStyles(styles)(Branding));
