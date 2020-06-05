/**
 * This component renders the header of the website
 */

import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { AppBar, Toolbar, Typography, Grid } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import Link from "next/link";
import SessionButton from "./SessionButton.js";
import Img from "./Img.js";

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1
  },
  offset: {
    ...theme.mixins.toolbar,
    flexGrow: 1
  },
  logo: {
    display: "flex"
  },
  logocontainer: {
    width: "3.6em",
    height: "3.6em",
    marginRight: "0.8em",
    display: "flex"
  },
  logoimg: {
    borderRadius: "0.2em"
  }
}));

const Header = props => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <AppBar position="fixed">
        <Toolbar>
          <Grid
            container
            justify="space-between"
            direction="row"
            alignItems="center"
          >
            <Grid item>
              <Grid container direction="row" alignItems="center">
                <Grid item>
                  <Link href="/">
                    <a className={classes.logo}>
                      <div className={classes.logocontainer}>
                        <Img
                          src={props.logoPath}
                          isThumbnail={true}
                          classes={classes.logoimg}
                        />
                      </div>
                    </a>
                  </Link>
                </Grid>
                <Grid item>
                  <Typography variant="h5">{props.title}</Typography>
                  <Typography variant="body2">{props.subtitle}</Typography>
                </Grid>
              </Grid>
            </Grid>
            <Grid item>
              <SessionButton />
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
      <div className={classes.offset}></div>
    </div>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  logoPath: PropTypes.string
};

const mapStateToProps = state => ({
  title: state.siteinfo.title,
  subtitle: state.siteinfo.subtitle,
  logoPath: state.siteinfo.logopath
});

export default connect(mapStateToProps)(Header);
