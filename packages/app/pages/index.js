import { connect } from "react-redux";
import PropTypes from "prop-types";
import Items from "../components/Public/Items/index.js";
import BaseLayout from "../components/Public/BaseLayout";
import { publicCourse, siteInfoProps } from "../types.js";
import { HEADER_BLOG_POSTS_SECTION, BTN_VIEW_ALL } from "../config/strings.js";
import { Button, Grid, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import Link from "next/link";
import FetchBuilder from "../lib/fetch.js";
import { getBackendAddress } from "../lib/utils.js";

const useStyles = makeStyles((theme) => ({
  content: {
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
    },
    paddingTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
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
                  <Typography variant="h2">
                    {HEADER_BLOG_POSTS_SECTION}
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

export async function getServerSideProps(context) {
  const { req } = context;
  const courses = await getCourses(getBackendAddress(req.headers.host));
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
