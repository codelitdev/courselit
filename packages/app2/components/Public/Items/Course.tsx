import React from "react";
import { styled } from "@mui/material/styles";
import PropTypes from "prop-types";
import Link from "next/link";
import { URL_EXTENTION_COURSES } from "../../../ui-config/constants";
import { Grid, Typography } from "@mui/material";
import { PriceTag } from "@courselit/components-library";
import { FREE_COST } from "../../../ui-config/strings";
import Img from "../../Img";

const PREFIX = "Course";

const classes = {
  link: `${PREFIX}-link`,
  featuredImage: `${PREFIX}-featuredImage`,
  title: `${PREFIX}-title`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
  [`& .${classes.link}`]: {
    textDecoration: "none",
    color: "inherit",
    marginBottom: theme.spacing(2),
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

const Course = (props) => {
  return (
    <StyledGrid item xs={12} md={6}>
      <Link
        href={`/${URL_EXTENTION_COURSES}/[id]/[slug]`}
        as={`/${URL_EXTENTION_COURSES}/${props.courseId}/${props.slug}`}
      >
        <a className={classes.link}>
          <Grid item container direction="column" component="article">
            {props.featuredImage && (
              <Grid item>
                <Img
                  src={props.featuredImage.file}
                  classes={classes.featuredImage}
                />
              </Grid>
            )}
            <Grid
              item
              container
              className={classes.title}
              justifyContent="space-between"
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
        </a>
      </Link>
    </StyledGrid>
  );
};

Course.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  updated: PropTypes.string.isRequired,
  creatorName: PropTypes.string,
  slug: PropTypes.string.isRequired,
  featuredImage: PropTypes.string,
  cost: PropTypes.number.isRequired,
  courseId: PropTypes.number.isRequired,
};

export default Course;
