import React from "react";
import PropTypes from "prop-types";
import { Grid, Divider } from "@material-ui/core";
import { useRouter } from "next/router";
import Section from "./Section";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  mainContent: Object.assign(
    {},
    {
      maxWidth: 1240,
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
      maxWidth: 1280,
      margin: "0 auto",
      paddingTop: theme.spacing(4),
      paddingBottom: theme.spacing(4),
    },
    theme.footer
  ),
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
        spacing={2}
      >
        {/** Top */}
        {router.pathname === "/" && (
          <Grid item>
            <Section name="top" />
          </Grid>
        )}

        <Grid item>
          <Grid container direction="row" spacing={2}>
            {/** Main */}
            <Grid item md={8} xs={12}>
              <Grid container direction="column" spacing={2}>
                {/** Main Content */}
                <Grid item>{props.children}</Grid>

                {/** Bottom */}
                <Grid item>
                  <Section name="bottom" />
                </Grid>
              </Grid>
            </Grid>

            {/** Aside */}
            <Grid item md={4} xs={12}>
              <Section name="aside" />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/** Footer */}
      <Grid container className={classes.footerContainer}>
        <Grid item xs={12}>
          <Divider></Divider>
        </Grid>
        <Grid item xs={12}>
          <Grid
            container
            direction="row"
            className={classes.footer}
            spacing={2}
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
    </>
  );
};

Template.propTypes = {
  children: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
};

export default Template;
