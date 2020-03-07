import { useState } from "react";
import { connect } from "react-redux";
import MasterLayout from "../components/Masterlayout.js";
import { networkAction } from "../redux/actions.js";
import { BACKEND } from "../config/constants.js";
import BlogPostItem from "../components/BlogPostItem.js";
import { Grid, Button, Typography } from "@material-ui/core";
import { HEADER_BLOG_POSTS_SECTION, BTN_LOAD_MORE } from "../config/strings.js";
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
        <Grid item>
          <Hero featuredCourses={props.featuredCourses} />
        </Grid>
        <Grid item className={classes.body}>
          <ContainedBodyLayout>
            <Grid container direction="row" spacing={2}>
              <Grid item xs={12} sm={8}>
                <section className="posts">
                  <Typography variant="h4">
                    {HEADER_BLOG_POSTS_SECTION}
                  </Typography>
                  {posts.map((x, index) => (
                    <BlogPostItem key={index} {...x} />
                  ))}
                  {posts.length > 0 && (
                    <Button onClick={getMorePosts}>{BTN_LOAD_MORE}</Button>
                  )}
                </section>
              </Grid>
              <Grid item xs={12} sm={4}>
                <aside>
                  <About />
                </aside>
              </Grid>
            </Grid>
          </ContainedBodyLayout>
        </Grid>
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
  auth: state.auth
});

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
