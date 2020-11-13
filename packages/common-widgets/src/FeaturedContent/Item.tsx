import * as React from "react";
import Link from "next/link";
import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { PriceTag, Course, Card } from "@courselit/components-library";

interface Styles {
  featuredImage: string;
  utilities: any;
  config: any;
}
const useStyles = ({ featuredImage, utilities, config }: Styles) =>
  makeStyles((theme: any) => ({
    link: {
      textDecoration: "none",
      color: "inherit",
      marginBottom: theme.spacing(4),
      display: "block",
    },
    featuredImage: {
      height: "8rem",
      width: "100%",
      background: `url('${utilities.formulateMediaUrl(
        config.MEDIA_BACKEND,
        featuredImage
      )}') no-repeat center center`,
      backgroundSize: "cover",
      [theme.breakpoints.up("sm")]: {
        height: "12rem",
      },
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
  const classes = useStyles({
    featuredImage: props.course.featuredImage,
    utilities: appUtilities,
    config: appConfig,
  })();

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
                <Grid item className={classes.featuredImage} />
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
                  <Typography variant="h6">
                    <PriceTag
                      cost={props.course.cost}
                      freeCostCaption="FREE"
                    ></PriceTag>
                  </Typography>
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
