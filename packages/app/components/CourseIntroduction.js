import React from "react";
import { connect } from "react-redux";
import { publicCourse } from "../types";
import Article from "./Public/Article.js";

const CourseIntroduction = (props) => {
  const { course } = props;
  const options = {
    showEnrollmentArea: true,
  };

  return <>{course && <Article course={course} options={options} />}</>;
};

CourseIntroduction.propTypes = {
  course: publicCourse,
};

const mapStateToProps = (state) => ({});

export default connect(mapStateToProps)(CourseIntroduction);
