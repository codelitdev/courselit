import React from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { URL_EXTENTION_POSTS } from "../../../config/constants.js";
import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { Card } from "@courselit/components-library";
import Img from "../../Img.js";

const useStyles = (featuredImage) =>
  makeStyles((theme) => ({
    container: {
      overflow: "hidden",
    },
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

const Post = (props) => {
  const classes = useStyles(props.featuredImage)();

  return (
    <Grid item xs={12} md={6}>
      <Link
        href={`/${URL_EXTENTION_POSTS}/[id]/[slug]`}
        as={`/${URL_EXTENTION_POSTS}/${props.courseId}/${props.slug}`}
      >
        <a className={classes.link}>
          <Card>
            <Grid
              item
              container
              direction="column"
              component="article"
              className={classes.container}
            >
              {props.featuredImage && (
                <Grid item>
                  <Img
                    src={props.featuredImage}
                    classes={classes.featuredImage}
                  />
                </Grid>
              )}
              <Grid item className={classes.title}>
                <Typography variant="h5">{props.title}</Typography>
              </Grid>
              <Grid item>
                <Typography variant="body1">{props.description}</Typography>
              </Grid>
            </Grid>
          </Card>
        </a>
      </Link>
    </Grid>
  );
};

Post.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  updated: PropTypes.string.isRequired,
  creatorName: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
  featuredImage: PropTypes.string,
  courseId: PropTypes.number.isRequired,
};

export default Post;
