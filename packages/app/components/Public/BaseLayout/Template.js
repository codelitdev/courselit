import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@material-ui/core";
import { useRouter } from "next/router";
import Section from "./Section";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  mainContent: Object.assign(
    {},
    {
      // maxWidth: 1240,
      minHeight: "80vh",
      margin: "0 auto",
    },
    theme.body
  ),
  footerContainer: Object.assign(
    {},
    {
      marginTop: theme.spacing(4),
    },
    theme.footerContainer
  ),
  footer: Object.assign(
    {},
    {
      // maxWidth: 1280,
      margin: "0 auto",
      paddingTop: theme.spacing(4),
      paddingBottom: theme.spacing(4),
    },
    theme.footer
  ),
  padding: {
    padding: theme.spacing(2),
  },
}));

const Template = (props) => {
  const classes = useStyles(props);
  const router = useRouter();

  return (
    <>
      <Grid
        container
        className={classes.mainContent}
        direction="column"
        spacing={0}
      >
        {/** Top */}
        {router.pathname === "/" && (
          <Grid item>
            <Section name="top" />
          </Grid>
        )}

        <Grid item>
          <Grid container direction="row" spacing={0}>
            {/** Main */}
            <Grid item md={8} xs={12}>
              <Grid container direction="column" spacing={0}>
                {/** Main Content */}
                <Grid item className={classes.padding}>
                  {props.children}
                </Grid>

                {/** Bottom */}
                <Grid item className={classes.padding}>
                  <Section name="bottom" />
                </Grid>
              </Grid>
            </Grid>

            {/** Aside */}
            <Grid item md={4} xs={12} className={classes.padding}>
              <Section name="aside" />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/** Footer */}
      <div className={classes.footerContainer}>
        <Grid container spacing={0}>
          <Grid item xs={12} className={classes.padding}>
            <Grid
              container
              direction="row"
              className={classes.footer}
              spacing={0}
            >
              <Grid container item direction="column" xs={12} md={6}>
                <Section name="footerLeft" />
              </Grid>
              <Grid container item direction="column" xs={12} md={6}>
                <Section name="footerRight" />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </div>
    </>
  );
};

Template.propTypes = {
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
};

export default Template;
