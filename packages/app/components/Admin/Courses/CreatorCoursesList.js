import React from "react";
import PropTypes from "prop-types";
import { creatorCourse } from "../../../types.js";
import { Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { Card } from "@courselit/components-library";

const useStyles = makeStyles((theme) => ({
  courselink: {
    textDecoration: "none",
    display: "block",
    color: "inherit",
    background: "white",
    paddingTop: theme.spacing(2),
    paddingBottom: theme.spacing(2),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
}));

const CreatorCoursesList = ({ courses, onClick }) => {
  const classes = useStyles();

  return courses.map((course) => (
    <Card key={course.id}>
      <a
        href="#"
        className={classes.courselink}
        onClick={(e) => onClick(course.id)}
      >
        <Typography variant="h5">{course.title}</Typography>
      </a>
    </Card>
  ));
};

CreatorCoursesList.propTypes = {
  courses: PropTypes.arrayOf(creatorCourse).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default CreatorCoursesList;
