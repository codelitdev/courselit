import { connect } from "react-redux";
import PropTypes from "prop-types";
import Items from "../components/Public/Items/index.js";
import BaseLayout from "../components/Public/BaseLayout";
import { publicCourse, siteInfoProps } from "../types.js";
import {
  HEADER_BLOG_POSTS_SECTION,
  SUBHEADER_BLOG_POSTS_SECTION,
  BTN_VIEW_ALL,
} from "../config/strings.js";
import { Button, Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import Link from "next/link";
import FetchBuilder from "../lib/fetch.js";
import { BACKEND } from "../config/constants.js";

const useStyles = makeStyles((theme) => ({
  content: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(8),
  },
  header: {
    [theme.breakpoints.up("md")]: {
      marginLeft: theme.spacing(2),
    },
  },
  headerTop: {
    marginBottom: theme.spacing(2),
  },
  link: {
    textDecoration: "none",
    color: "inherit",
  },
  callToAction: {
    [theme.breakpoints.up("md")]: {
      marginLeft: theme.spacing(2),
    },
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

const Index = (props) => {
  const classes = useStyles();

  return (
    <BaseLayout title={props.siteinfo.subtitle}>
      <Grid item xs={12} className={classes.content}>
        <Grid container component="section">
          {props.courses.length > 0 && (
            <>
              <Grid item container className={classes.header}>
                <Grid item xs={12} className={classes.headerTop}>
                  <Typography variant="h4">
                    {HEADER_BLOG_POSTS_SECTION}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1" color="textSecondary">
                    {SUBHEADER_BLOG_POSTS_SECTION}
                  </Typography>
                </Grid>
              </Grid>
              <Items
                generateQuery={generateQuery}
                initialItems={props.courses}
                posts={true}
              />
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  disableElevation
                  className={classes.callToAction}
                >
                  <Link href="/posts">
                    <a className={classes.link}>{BTN_VIEW_ALL}</a>
                  </Link>
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Grid>
    </BaseLayout>
  );
};

const getCourses = async () => {
  let courses = [];
  try {
    const fetch = new FetchBuilder()
      .setUrl(`${BACKEND}/graph`)
      .setPayload(generateQuery())
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

Index.propTypes = {
  courses: PropTypes.arrayOf(publicCourse),
  siteinfo: siteInfoProps,
};

const mapStateToProps = (state) => ({
  siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Index);
