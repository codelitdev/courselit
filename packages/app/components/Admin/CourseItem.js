import React from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { creatorCourse } from "../../types";
import TextEditor from "../Public/RichText.js";
import { URL_EXTENTION_COURSES } from "../../config/constants.js";
import { CardContent, Card, Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import PriceTag from "../PriceTag.js";
import { COURSE_CREATOR_PREFIX } from "../../config/strings.js";
import Img from "../Img";

const useStyles = makeStyles({
  featuredimagecontainer: {
    display: "flex",
  },
  courselink: {
    textDecoration: "none",
    display: "block",
    marginTop: "0.8em",
    marginBottom: "1em",
    "&:hover": {
      background: "#eee",
    },
    color: "inherit",
  },
});

const CourseItem = (props) => {
  const { course } = props;
  const classes = useStyles();

  let description;
  try {
    description = (
      <TextEditor
        initialContentState={TextEditor.hydrate(course.description)}
        readOnly={true}
      />
    );
  } catch (e) {
    description = <p>Unable to display description</p>;
  }

  return (
    <Link href={`/${URL_EXTENTION_COURSES}/${course.id}/${course.slug}`}>
      <a className={classes.courselink}>
        <Card>
          <CardContent>
            <article>
              <Grid container direction="row" spacing={2}>
                {course.featuredImage && (
                  <Grid
                    item
                    className={classes.featuredimagecontainer}
                    sm={12}
                    md={3}
                  >
                    <Img src={course.featuredImage} />
                  </Grid>
                )}
                <Grid item sm={12} md={9}>
                  <Grid container direction="column">
                    <Grid item>
                      <Typography variant="h6" className="title">
                        {course.title}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Typography variant="body1" component="div">
                        {description}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <PriceTag cost={course.cost}></PriceTag>
                    </Grid>
                    <Grid item>
                      <Typography variant="subtitle1" color="textSecondary">
                        {COURSE_CREATOR_PREFIX} {course.creatorName}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </article>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
};

CourseItem.propTypes = {
  course: creatorCourse,
  isPublicView: PropTypes.bool.isRequired,
};

export default CourseItem;
