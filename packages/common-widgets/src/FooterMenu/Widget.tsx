import * as React from "react";
import { WidgetProps } from "@courselit/common-models";
import { Grid, Theme, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import Link from "next/link";

const useStyles = (sectionName: string) =>
  makeStyles((theme: Theme) => ({
    list: {
      listStyle: "none",
      margin: 0,
      paddingInlineStart: 0,
    },
    linkContainer: {
      textAlign: sectionName === "footerRight" ? "end" : "start",
      [theme.breakpoints.down("md")]: {
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
    <Grid item>
      <nav>
        <Grid
          container
          direction="row"
          justifyContent="space-between"
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

export default Widget;
