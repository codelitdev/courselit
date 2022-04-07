import React from "react";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import Link from "next/link";
import { URL_EXTENTION_POSTS } from "../../../config/constants.js";
import { Grid, Typography } from "@mui/material";
import Img from "../../Img.js";

const PREFIX = "Post";

const classes = {
  container: `${PREFIX}-container`,
  link: `${PREFIX}-link`,
  featuredImage: `${PREFIX}-featuredImage`,
  title: `${PREFIX}-title`,
};

const StyledGrid = styled(Grid)(({ theme }) => ({
  [`& .${classes.container}`]: {
    overflow: "hidden",
  },

  [`& .${classes.link}`]: {
    textDecoration: "none",
    color: "inherit",
    marginBottom: theme.spacing(4),
    display: "block",
  },

  [`& .${classes.featuredImage}`]: {
    height: "auto",
    width: "100%",
  },

  [`& .${classes.title}`]: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(0.5),
  },
}));

const Post = (props) => {
  return (
    <StyledGrid item xs={12} md={6}>
      <Link
        href={`/${URL_EXTENTION_POSTS}/[id]/[slug]`}
        as={`/${URL_EXTENTION_POSTS}/${props.courseId}/${props.slug}`}
      >
        <a className={classes.link}>
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
                  src={props.featuredImage.file}
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
        </a>
      </Link>
    </StyledGrid>
  );
};

Post.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  updated: PropTypes.string.isRequired,
  creatorName: PropTypes.string,
  slug: PropTypes.string.isRequired,
  featuredImage: PropTypes.object,
  courseId: PropTypes.number.isRequired,
};

export default Post;
