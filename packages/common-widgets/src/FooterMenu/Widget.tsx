import * as React from "react";
import { connect } from "react-redux";
import { WidgetProps, AppState } from "@courselit/components-library";
import { Grid, Theme, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import Link from "next/link";

const useStyles = (sectionName: string) =>
  makeStyles((theme: Theme) => ({
    container: {
      padding: theme.spacing(2),
    },
    list: {
      listStyle: "none",
      margin: 0,
      paddingInlineStart: 0,
    },
    linkContainer: {
      textAlign: sectionName === "footerRight" ? "end" : "start",
      [theme.breakpoints.down("sm")]: {
        marginBottom: theme.spacing(1),
        textAlign: "start",
      },
    },
    link: {
      color: theme.palette.text.primary,
    },
  }));

export interface FooterMenuWidgetProps extends WidgetProps {
  navigation: any[];
}

const Widget = (props: FooterMenuWidgetProps) => {
  const { section } = props;
  const classes = useStyles(section)();

  return (
    <Grid item xs className={classes.container}>
      <nav>
        <Grid
          container
          direction="row"
          justify="space-between"
          component="ul"
          className={classes.list}
        >
          {props.navigation.map((link: any) => (
            <Grid
              item
              component="li"
              xs={12}
              sm={2}
              key={link.text}
              className={classes.linkContainer}
            >
              <Link href={link.destination} key={link.text}>
                <a className={classes.link}>
                  <Typography variant="body2">{link.text}</Typography>
                </a>
              </Link>
            </Grid>
          ))}
        </Grid>
      </nav>
    </Grid>
  );
};

const mapStateToProps = (state: AppState) => ({
  navigation: state.navigation.filter((link) => link.category === "footer"),
});

export default connect(mapStateToProps)(Widget);
