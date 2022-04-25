import React, { ReactChildren } from "react";
import { styled } from "@mui/system";
import { Grid, useTheme } from "@mui/material";
import { useRouter } from "next/router";
import Section from "./Section";
import { connect } from "react-redux";
import { AppState } from "@courselit/state-management";
import { Layout } from "@courselit/common-models";

const PREFIX = "Template";

const classes = {
  mainContent: `${PREFIX}-mainContent`,
  footerContainer: `${PREFIX}-footerContainer`,
  footer: `${PREFIX}-footer`,
  padding: `${PREFIX}-padding`,
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled("div")(({ theme }: { theme: any }) => ({
  [`& .${classes.mainContent}`]: Object.assign(
    {},
    {
      minHeight: "80vh",
      margin: "0 auto",
    },
    theme.body
  ),

  [`& .${classes.footerContainer}`]: Object.assign(
    {},
    {
      marginTop: theme.spacing(4),
    },
    theme.footerContainer
  ),

  [`& .${classes.footer}`]: Object.assign(
    {},
    {
      margin: "0 auto",
      paddingTop: theme.spacing(4),
      paddingBottom: theme.spacing(4),
    },
    theme.footer
  ),

  [`& .${classes.padding}`]: {
    padding: theme.spacing(2),
  },
}));

interface TemplateProps {
  children: ReactChildren;
  layout: Layout;
}

const Template = (props: TemplateProps) => {
  const { layout } = props;

  const router = useRouter();
  const theme: any = useTheme();

  return (
    <Root>
      <Grid
        container
        className={classes.mainContent}
        direction="column"
        spacing={0}
      >
        {/** Top */}
        {router.pathname === "/" && layout.top.length > 0 && (
          <Grid item className={classes.padding}>
            <Section name="top" />
          </Grid>
        )}

        <Grid item>
          <Grid container direction="row" spacing={0}>
            {/** Main */}
            <Grid
              item
              md={theme.singleColumnLayout ? 12 : theme.mainContentWidth || 8}
              xs={12}
            >
              <Grid container direction="column" spacing={0}>
                {/** Main Content */}
                {props.children &&
                  props.children.props &&
                  props.children.props.children && (
                    <Grid item className={classes.padding}>
                      {props.children}
                    </Grid>
                  )}

                {/** Bottom */}
                {layout.bottom.length > 0 && (
                  <Grid item className={classes.padding}>
                    <Section name="bottom" />
                  </Grid>
                )}
              </Grid>
            </Grid>

            {/** Aside */}
            {!theme.singleColumnLayout && layout.aside.length > 0 && (
              <Grid
                item
                md={theme.asideWidth || 4}
                xs={12}
                className={classes.padding}
              >
                <Section name="aside" />
              </Grid>
            )}
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
              {layout.footerLeft.length > 0 && (
                <Grid container item direction="column" xs={12} md={6}>
                  <Section name="footerLeft" />
                </Grid>
              )}
              {layout.footerRight.length > 0 && (
                <Grid container item direction="column" xs={12} md={6}>
                  <Section name="footerRight" />
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </div>
    </Root>
  );
};

const mapStateToProps = (state: AppState) => ({
  layout: state.layout,
});

export default connect(mapStateToProps)(Template);
