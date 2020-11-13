import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@material-ui/core";
import { useRouter } from "next/router";
import Section from "./Section";
import { makeStyles } from "@material-ui/styles";
import Footer from "./Footer";

const useStyles = makeStyles((theme) => ({
  mainContent: {
    // [theme.breakpoints.up("md")]: {
    minHeight: "80vh",
    // },
  },
}));

const Template = (props) => {
  const classes = useStyles(props);
  const router = useRouter();

  return (
    <>
      <Grid container>
        {/** Top */}
        {router.pathname === "/" && <Section name="top" />}
        
        <Grid container item direction="row" className={classes.mainContent} xs>
          {/** Main */}
          <Grid container item direction="column" xs={12} sm={8} md={9}>
            <Grid container item>
              {props.children}
            </Grid>
            <Grid container item>
              <Section name="bottom" />
            </Grid>
          </Grid>

          {/** Aside */}
          <Grid container item direction="column" xs={12} sm={4} md={3}>
            <Section name="aside" />
          </Grid>
        </Grid>
      </Grid>
      {/** Footer */}
      <Grid container direction="row">
        <Grid container item direction="column" xs={12} md={6}>
          <Section name="footerLeft" />
        </Grid>
        <Grid container item direction="column" xs={12} md={6}>
          <Section name="footerRight" />
        </Grid>
      </Grid>
    </>
  );
};

Template.propTypes = {
  children: PropTypes.object,
};

export default Template;
