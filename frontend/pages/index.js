import { useState } from "react";
import { connect } from "react-redux";
import MasterLayout from "../components/Masterlayout.js";
import { networkAction } from "../redux/actions.js";
import { BACKEND } from "../config/constants.js";
import BlogPostItem from "../components/BlogPostItem.js";
import { Grid, Button, Typography, Link } from "@material-ui/core";
import {
  HEADER_BLOG_POSTS_SECTION,
  BTN_LOAD_MORE,
  EMPTY_PAGE_PLACEHOLDER,
  EMPTY_PAGE_CREATOR_USER_PLACEHOLDER,
  BTN_GO_TO_DASHBOARD
} from "../config/strings.js";
import Hero from "../components/Hero.js";
import { makeStyles } from "@material-ui/styles";
import ContainedBodyLayout from "../components/ContainedBodyLayout.js";
import About from "../components/About.js";
import FetchBuilder from "../lib/fetch.js";

const useStyles = makeStyles(theme => ({
  root: {
    marginTop: 10
  },
  body: {
    marginTop: "1.8em"
  },
  content: {
    marginBottom: theme.spacing(2)
  },
  emptystate: {
    marginTop: theme.spacing(16),
    [theme.breakpoints.up("md")]: {
      marginTop: theme.spacing(24)
    }
  },
  adminEmptySectionHeader: {
    marginBottom: theme.spacing(4)
  },
  emptyStateHeader: {
    textAlign: "center"
  }
}));

const getBlogPostQuery = postsPaginationOffset =>
  `
    query {
      posts: getPosts(offset: ${postsPaginationOffset}) {
        id,
        title,
        description,
        updated,
        creatorName,
        slug,
        featuredImage
      }
    }
  `;

const Index = props => {
  const [posts, setPosts] = useState([...props.posts]);
  const [postsOffset, setPostsOffset] = useState(props.postsOffset);
  const classes = useStyles();
  const hasContentToShow =
    props.featuredCourses.length > 0 || props.posts.length > 0;

  const getMorePosts = async () => {
    props.dispatch(networkAction(true));
    const morePosts = await getPosts(postsOffset);
    if (morePosts) {
      setPosts([...posts, ...morePosts]);
      setPostsOffset(postsOffset + 1);
    }
    props.dispatch(networkAction(false));
  };

  return (
    <MasterLayout>
      <Grid container direction="column">
        <Grid item>
          <div className={classes.offset}></div>
        </Grid>
        {hasContentToShow === true && (
          <>
            <ContainedBodyLayout>
              <Hero featuredCourses={props.featuredCourses} />
            </ContainedBodyLayout>
            <Grid item className={classes.body}>
              <ContainedBodyLayout>
                <Grid
                  container
                  direction="row"
                  spacing={2}
                  className={classes.content}
                >
                  {posts.length > 0 && (
                    <Grid item xs={12} sm={8}>
                      <section className="posts">
                        <Typography variant="h4">
                          {HEADER_BLOG_POSTS_SECTION}
                        </Typography>
                        {posts.map((x, index) => (
                          <BlogPostItem key={index} {...x} />
                        ))}
                        {posts.length > 0 && (
                          <Button onClick={getMorePosts}>
                            {BTN_LOAD_MORE}
                          </Button>
                        )}
                      </section>
                    </Grid>
                  )}
                  <Grid item xs={12} sm={4}>
                    <aside>
                      <About />
                    </aside>
                  </Grid>
                </Grid>
              </ContainedBodyLayout>
            </Grid>
          </>
        )}
        {hasContentToShow === false && (
          <ContainedBodyLayout>
            <Grid
              container
              alignItems="center"
              className={classes.emptystate}
              direction="column"
            >
              {props.profile.fetched &&
                (props.profile.isCreator || props.profile.isAdmin) && (
                  <>
                    <Grid
                      item
                      className={[
                        classes.adminEmptySectionHeader,
                        classes.emptyStateHeader
                      ]}
                    >
                      <Typography variant="h5">
                        {EMPTY_PAGE_CREATOR_USER_PLACEHOLDER}
                      </Typography>
                    </Grid>
                    <Grid item>
                      <Button variant="contained" color="secondary">
                        <Link href="/create" as={`/create`}>
                          {BTN_GO_TO_DASHBOARD}
                        </Link>
                      </Button>
                    </Grid>
                  </>
                )}
              {(!props.profile.fetched ||
                (props.profile.fetched &&
                  !(props.profile.isCreator || props.profile.isAdmin))) && (
                <>
                  <Grid item className={classes.emptyStateHeader}>
                    <Typography variant="h5">
                      {EMPTY_PAGE_PLACEHOLDER}
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </ContainedBodyLayout>
        )}
      </Grid>
    </MasterLayout>
  );
};

Index.getInitialProps = async () => {
  let postsOffset = 1;
  const posts = await getPosts(postsOffset++);
  const featuredCourses = await getFeaturedCourses();

  return { posts, postsOffset, featuredCourses };
};

const getPosts = async offset => {
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setPayload(getBlogPostQuery(offset))
    .setIsGraphQLEndpoint(true)
    .build();
  const response = await fetch.exec();

  return response.posts;
};

const getFeaturedCourses = async () => {
  const query = `
    query {
      featuredCourses: getPublicCourses(offset: 1, onlyShowFeatured: true) {
        id,
        title,
        cost,
        featuredImage,
        slug
      }
    }
  `;
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setPayload(query)
    .setIsGraphQLEndpoint(true)
    .build();
  const response = await fetch.exec();

  return response.featuredCourses;
};

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
});

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
