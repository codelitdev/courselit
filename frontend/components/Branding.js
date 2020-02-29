import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import Link from "next/link";
import Img from "./Img";
import { Grid } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  logo: {
    height: 98,
    width: 98
  },
  title: {
    fontWeight: "bold",
    fontSize: 30,
    margin: 2
  },
  subtitle: {
    fontSize: 18,
    color: "#6f6f6f"
  }
});

const Branding = props => {
  const classes = useStyles();
  return (
    <Grid container spacing={1}>
      <Grid item>
        <Link href="/">
          <a>
            <Img src={props.logoPath} isThumbnail={true} />
          </a>
        </Link>
      </Grid>
      <Grid item>
        <Grid container direction="column">
          <Grid item xs>
            <p className={classes.title}>{props.title}</p>
          </Grid>
          <Grid item xs>
            <p className={classes.subtitle}>{props.subtitle}</p>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

Branding.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  logoPath: PropTypes.string
};

const mapStateToProps = state => ({
  title: state.siteinfo.title,
  subtitle: state.siteinfo.subtitle,
  logoPath: state.siteinfo.logopath
});

export default connect(mapStateToProps)(Branding);
