import PropTypes from "prop-types";
import { publicCourse } from "../types.js";
import { HEADER_BLOG_POSTS_SECTION } from "../config/strings.js";
import BaseLayout from "../components/Public/BaseLayout";
import Items from "../components/Public/Items/index.js";
import FetchBuilder from "../lib/fetch.js";
import { Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { getBackendAddress } from "../lib/utils.js";

const useStyles = makeStyles((theme) => ({
  content: {
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
    },
    paddingTop: theme.spacing(2),
  },
  header: {
    [theme.breakpoints.up("md")]: {
      marginLeft: theme.spacing(2),
    },
  },
  headerTop: {
    marginBottom: theme.spacing(2),
  },
}));

const generateQuery = (pageOffset = 1) => `
  query {
    courses: getPosts(offset: ${pageOffset}) {
      id,
      title,
      description,
      updated,
      creatorName,
      slug,
      featuredImage,
      courseId
    }
  }
`;

function Posts(props) {
  const classes = useStyles();

  return (
    <BaseLayout title={HEADER_BLOG_POSTS_SECTION}>
      <Grid item xs={12} className={classes.content}>
        <Grid container component="section">
          <Grid item container className={classes.header}>
            <Grid item xs={12} className={classes.headerTop}>
              <Typography variant="h2">{HEADER_BLOG_POSTS_SECTION}</Typography>
            </Grid>
          </Grid>
          <Items
            showLoadMoreButton={true}
            generateQuery={generateQuery}
            initialItems={props.courses}
            posts={true}
          />
        </Grid>
      </Grid>
    </BaseLayout>
  );
}

const getCourses = async (backend) => {
  let courses = [];
  try {
    const fetch = new FetchBuilder()
      .setUrl(`${backend}/graph`)
      .setPayload(generateQuery())
      .setIsGraphQLEndpoint(true)
      .build();
    const response = await fetch.exec();
    courses = response.courses;
  } catch (e) {}
  return courses;
};

export async function getServerSideProps({ req }) {
  const courses = await getCourses(getBackendAddress(req.headers.host));
  return { props: { courses } };
}

Posts.propTypes = {
  courses: PropTypes.arrayOf(publicCourse),
};

export default Posts;
