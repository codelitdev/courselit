import { useState } from "react";
import PropTypes from "prop-types";
import { publicCourse } from "../types.js";
import CourseItem from "../components/CourseItem.js";
import { queryGraphQL } from "../lib/utils.js";
import { BACKEND } from "../config/constants.js";
import { BTN_LOAD_MORE, PAGE_HEADER_ALL_COURSES } from "../config/strings.js";
import MasterLayout from "../components/Masterlayout.js";
import ContainedBodyLayout from "../components/ContainedBodyLayout.js";
import { Typography, Button } from "@material-ui/core";

const Courses = props => {
  const [courses, setCourses] = useState(props.courses);
  const [hasMorePages, setHasMorePages] = useState(true);

  const getMoreCourses = async () => {
    if (hasMorePages) {
      pageOffset += 1;
      const moreCourses = await getCourses();
      if (moreCourses.length > 0) {
        setCourses([...courses, ...moreCourses]);
      } else {
        setHasMorePages(false);
      }
    }
  };

  return (
    <MasterLayout>
      <ContainedBodyLayout>
        <Typography variant="h2">{PAGE_HEADER_ALL_COURSES}</Typography>
        {courses.map(course => (
          <CourseItem course={course} key={course.id} isPublicView={true} />
        ))}
        <Button
          onClick={getMoreCourses}
          disabled={hasMorePages ? null : "disabled"}
        >
          {BTN_LOAD_MORE}
        </Button>
      </ContainedBodyLayout>
    </MasterLayout>
  );
};

let pageOffset = 1;
const getQuery = () => `
  query {
    courses: getPublicCourses(offset: ${pageOffset}) {
      id
      title,
      description,
      featuredImage,
      updated,
      creatorName,
      cost,
      slug,
      isFeatured
    }
  }
`;

const getCourses = async () => {
  let courses = [];
  try {
    const response = await queryGraphQL(`${BACKEND}/graph`, getQuery());
    courses = response.courses;
  } catch (e) {
    // do nothing
  }
  return courses;
};

Courses.getInitialProps = async props => {
  const courses = await getCourses();
  return { courses };
};

Courses.propTypes = {
  courses: PropTypes.arrayOf(publicCourse)
};

export default Courses;
