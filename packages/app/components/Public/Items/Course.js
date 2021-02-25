import React from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { URL_EXTENTION_COURSES } from "../../../config/constants.js";
import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { PriceTag, Card } from "@courselit/components-library";
import { FREE_COST } from "../../../config/strings.js";
import Img from "../../Img.js";

const useStyles = (featuredImage) =>
  makeStyles((theme) => ({
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
  }));

const Course = (props) => {
  const classes = useStyles(props.featuredImage)();

  return (
    <Grid item xs={12} md={6}>
      <Link
        href={`/${URL_EXTENTION_COURSES}/[id]/[slug]`}
        as={`/${URL_EXTENTION_COURSES}/${props.courseId}/${props.slug}`}
      >
        <a className={classes.link}>
          <Card>
            <Grid item container direction="column" component="article">
              {props.featuredImage && (
                <Grid item>
                  <Img
                    src={props.featuredImage}
                    classes={classes.featuredImage}
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
                  <Typography variant="h5">{props.title}</Typography>
                </Grid>
                <Grid item>
                  <PriceTag cost={props.cost} freeCostCaption={FREE_COST} />
                </Grid>
              </Grid>
            </Grid>
          </Card>
        </a>
      </Link>
    </Grid>
  );
};

Course.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  updated: PropTypes.string.isRequired,
  creatorName: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
  featuredImage: PropTypes.string,
  cost: PropTypes.number.isRequired,
  courseId: PropTypes.number.isRequired,
};

export default Course;
