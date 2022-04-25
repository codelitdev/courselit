import React from "react";
import { styled } from "@mui/system";
import Link from "next/link";
import { URL_EXTENTION_POSTS } from "../../../ui-config/constants";
import { Grid, Typography } from "@mui/material";
import Img from "../../Img";
import { Course } from "@courselit/common-models";

const PREFIX = "Post";

const classes = {
  container: `${PREFIX}-container`,
  link: `${PREFIX}-link`,
  featuredImage: `${PREFIX}-featuredImage`,
  title: `${PREFIX}-title`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
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

const Post = (props: Course) => {
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

export default Post;
