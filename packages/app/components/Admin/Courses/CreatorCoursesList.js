import React from "react";
import PropTypes from "prop-types";
import { creatorCourse } from "../../../types.js";
import { GridList, GridListTile, GridListTileBar } from "@material-ui/core";
import Img from "../../Img.js";
import {
  COURSE_TYPE_BLOG,
  COURSE_TYPE_COURSE,
} from "../../../config/strings.js";

const CreatorCoursesList = ({ courses, onClick }) => {
  return (
    <GridList cols={3}>
      {courses.map((course) => (
        <GridListTile
          key={course.id}
          cols={1}
          onClick={(e) => onClick(course.id)}
        >
          <Img src={course.featuredImage} isThumbnail={true} />
          <GridListTileBar
            title={course.title}
            subtitle={course.isBlog ? COURSE_TYPE_BLOG : COURSE_TYPE_COURSE}
          />
        </GridListTile>
      ))}
    </GridList>
  );
};

CreatorCoursesList.propTypes = {
  courses: PropTypes.arrayOf(creatorCourse).isRequired,
  onClick: PropTypes.func.isRequired,
};

export default CreatorCoursesList;
