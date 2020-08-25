// import { useState } from "react";
// import PropTypes from "prop-types";
// import { publicCourse } from "../types.js";
// import { queryGraphQL } from "../lib/utils.js";
// import { BACKEND } from "../config/constants.js";
import { PAGE_HEADER_ALL_COURSES } from "../config/strings.js";
// import { makeStyles } from "@material-ui/styles";
import BaseLayout from "../components/Public/BaseLayout";
import Posts from "../components/Public/Courses/List.js";

// const useStyles = makeStyles(theme => ({
//   header: {
//     marginTop: theme.spacing(2),
//     marginBottom: theme.spacing(2),
//     [theme.breakpoints.up("sm")]: {
//       marginTop: theme.spacing(4)
//     }
//   },
//   loadMoreBtn: {
//     marginBottom: theme.spacing(4)
//   }
// }));

const Courses = (props) => {
  // const [courses, setCourses] = useState(props.courses);
  // const [hasMorePages, setHasMorePages] = useState(true);
  // const classes = useStyles();

  // const getMoreCourses = async () => {
  //   if (hasMorePages) {
  //     pageOffset += 1;
  //     const moreCourses = await getCourses();
  //     if (moreCourses.length > 0) {
  //       setCourses([...courses, ...moreCourses]);
  //     } else {
  //       setHasMorePages(false);
  //     }
  //   }
  // };

  return (
    <BaseLayout title={PAGE_HEADER_ALL_COURSES}>
      <Posts showLoadMoreButton={true} />
    </BaseLayout>
  );
};

// let pageOffset = 1;
// const getQuery = () => `
//   query {
//     courses: getPublicCourses(offset: ${pageOffset}) {
//       id
//       title,
//       description,
//       featuredImage,
//       updated,
//       creatorName,
//       cost,
//       slug,
//       isFeatured
//     }
//   }
// `;

// const getCourses = async () => {
//   let courses = [];
//   try {
//     const response = await queryGraphQL(`${BACKEND}/graph`, getQuery());
//     courses = response.courses;
//   } catch (e) {
//     // do nothing
//   }
//   return courses;
// };

// Courses.getInitialProps = async props => {
//   const courses = await getCourses();
//   return { courses };
// };

// Courses.propTypes = {
//   courses: PropTypes.arrayOf(publicCourse)
// };

export default Courses;
