import * as React from "react";
import Link from "next/link";
import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { PriceTag, Course, Card } from "@courselit/components-library";

const useStyles = () =>
  makeStyles((theme: any) => ({
    link: {
      textDecoration: "none",
      color: "inherit",
      marginBottom: theme.spacing(4),
      display: "block",
    },
    featuredImage: {
      height: "auto",
      width: "100%",
    },
    title: {
      marginTop: theme.spacing(2),
      marginBottom: theme.spacing(0.5),
    },
    card: {
      padding: theme.spacing(2),
      border: "1px solid transparent",
      borderRadius: 1,
      "&:hover": {
        border: "1px solid #cccccc",
        cursor: "pointer",
      },
    },
  }));

interface ItemProps {
  course: Course;
  appUtilities: any;
  appConfig: any;
}

const Item = (props: ItemProps) => {
  const { appUtilities, appConfig } = props;
  const classes = useStyles()();

  return (
    <Grid item xs={12} md={4}>
      <Link
        href={`/${appConfig.URL_EXTENTION_COURSES}/[id]/[slug]`}
        as={`/${appConfig.URL_EXTENTION_COURSES}/${props.course.courseId}/${props.course.slug}`}
      >
        <a className={classes.link}>
          <Card>
            <Grid item container direction="column" component="article">
              {props.course.featuredImage && (
                <Grid item>
                  <img
                    src={appUtilities.formulateMediaUrl(
                      appConfig.BACKEND,
                      props.course.featuredImage
                    )}
                    className={classes.featuredImage}
                  />
                </Grid>
              )}
              <Grid
                item
                container
                className={classes.title}
                justify="space-between"
                alignItems="center"
              >
                <Grid item>
                  <Typography variant="h5">{props.course.title}</Typography>
                </Grid>
                <Grid item>
                  <PriceTag cost={props.course.cost} freeCostCaption="FREE" />
                </Grid>
              </Grid>
            </Grid>
          </Card>
        </a>
      </Link>
    </Grid>
  );
};

export default Item;
