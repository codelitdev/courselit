import PropTypes from "prop-types";
import {
  HEADER_COURSES_SECTION,
  PAGE_HEADER_ALL_COURSES,
} from "../config/strings.js";
import BaseLayout from "../components/Public/BaseLayout";
import Items from "../components/Public/Items/index.js";
import { publicCourse } from "../types.js";
import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import FetchBuilder from "../lib/fetch.js";
import { BACKEND } from "../config/constants.js";

const useStyles = makeStyles((theme) => ({
  content: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(8),
  },
  header: {
    marginLeft: theme.spacing(2),
  },
  headerTop: {
    marginBottom: theme.spacing(2),
  },
}));

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getCourses(offset: ${pageOffset}) {
      id
      title,
      description,
      featuredImage,
      updated,
      creatorName,
      cost,
      slug,
      isFeatured,
      courseId
    }
  }
`;

const Courses = (props) => {
  const classes = useStyles();

  return (
    <BaseLayout title={PAGE_HEADER_ALL_COURSES}>
      <Grid item xs={12} className={classes.content}>
        <Grid container component="section">
          <Grid item container className={classes.header}>
            <Grid item xs={12} className={classes.headerTop}>
              <Typography variant="h4">{HEADER_COURSES_SECTION}</Typography>
            </Grid>
            {/* <Grid item xs={12}>
              <Typography variant="body1" color="textSecondary">{SUBHEADER_BLOG_POSTS_SECTION}</Typography>
            </Grid> */}
          </Grid>
          <Items
            showLoadMoreButton={true}
            generateQuery={generateQuery}
            initialItems={props.courses}
          />
        </Grid>
      </Grid>
    </BaseLayout>
  );
};

const getCourses = async () => {
  let courses = [];
  const query = generateQuery();
  try {
    const fetch = new FetchBuilder()
      .setUrl(`${BACKEND}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .build();
    const response = await fetch.exec();
    courses = response.courses;
  } catch (e) {}
  return courses;
};

export async function getServerSideProps() {
  const courses = await getCourses();
  return { props: { courses } };
}

Courses.propTypes = {
  courses: PropTypes.arrayOf(publicCourse),
};

export default Courses;
