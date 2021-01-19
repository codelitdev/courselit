import React from "react";
import PropTypes from "prop-types";
import { Divider, Grid } from "@material-ui/core";
import { useRouter } from "next/router";
import Section from "./Section";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  mainContent: {
    maxWidth: 1240,
    minHeight: "80vh",
    margin: "0 auto",
  },
}));

const Template = (props) => {
  const classes = useStyles(props);
  const router = useRouter();

  return (
    <>
      <Grid container className={classes.mainContent}>
        {/** Top */}
        {router.pathname === "/" && <Section name="top" />}

        <Grid container item direction="row" xs>
          {/** Main */}
          <Grid container item direction="column" xs={12} md={8}>
            <Grid container item>
              {props.children}
            </Grid>
            <Grid container item>
              <Section name="bottom" />
            </Grid>
          </Grid>

          {/** Aside */}
          <Grid container item direction="column" xs={12} md={4}>
            <Section name="aside" />
          </Grid>
        </Grid>
      </Grid>

      {/** Footer */}
      <>
        <Divider light />
        <Grid container direction="row">
          <Grid container item direction="column" xs={12} md={6}>
            <Section name="footerLeft" />
          </Grid>
          <Grid container item direction="column" xs={12} md={6}>
            <Section name="footerRight" />
          </Grid>
        </Grid>
      </>
    </>
  );
};

Template.propTypes = {
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
};

export default Template;
