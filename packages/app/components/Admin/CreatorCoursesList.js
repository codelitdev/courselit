import React from "react";
import PropTypes from "prop-types";
import { creatorCourse } from "../../types.js";
import { Button, Card, Typography, CardContent } from "@material-ui/core";
import { LOAD_MORE_TEXT } from "../../config/strings.js";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  courselink: {
    textDecoration: "none",
    display: "block",
    marginTop: "0.8em",
    marginBottom: "1em",
    "&:hover": {
      background: "#eee"
    },
    color: "inherit"
  }
});

const CreatorCoursesList = props => {
  const classes = useStyles();

  return (
    <div>
      {props.courses.map(course => (
        <a key={course.id} href="#" className={classes.courselink}>
          <Card onClick={e => props.onClick(course.id)}>
            <CardContent>
              <Typography variant="h6">{course.title}</Typography>
            </CardContent>
          </Card>
        </a>
      ))}
      <Button onClick={props.onLoadMoreClick}>{LOAD_MORE_TEXT}</Button>
    </div>
  );
};

CreatorCoursesList.propTypes = {
  courses: PropTypes.arrayOf(creatorCourse),
  onClick: PropTypes.func,
  onLoadMoreClick: PropTypes.func
};

export default CreatorCoursesList;
