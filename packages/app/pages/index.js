// import { useState } from "react";
import { connect } from "react-redux";
// import { networkAction } from "../redux/actions.js";
// import { BACKEND } from "../config/constants.js";
// import BlogPostItem from "../components/BlogPostItem.js";
// import { Grid, Button, Typography, Link } from "@material-ui/core";
// import {
//   HEADER_BLOG_POSTS_SECTION,
//   BTN_LOAD_MORE
// } from "../config/strings.js";
import { makeStyles } from "@material-ui/styles";
// import FetchBuilder from "../lib/fetch.js";
import Posts from "../components/Public/Posts/List.js";
import BaseLayout from "../components/Public/BaseLayout";

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

// const getBlogPostQuery = postsPaginationOffset =>
//   `
//     query {
//       posts: getPosts(offset: ${postsPaginationOffset}) {
//         id,
//         title,
//         description,
//         updated,
//         creatorName,
//         slug,
//         featuredImage
//       }
//     }
//   `;

const Index = props => {
  // const [posts, setPosts] = useState([...props.posts]);
  // const [postsOffset, setPostsOffset] = useState(props.postsOffset);

  // const getMorePosts = async () => {
  //   props.dispatch(networkAction(true));
  //   const morePosts = await getPosts(postsOffset);
  //   if (morePosts) {
  //     setPosts([...posts, ...morePosts]);
  //     setPostsOffset(postsOffset + 1);
  //   }
  //   props.dispatch(networkAction(false));
  // };

  return (
    <BaseLayout title={props.siteinfo.subtitle}>
      <Posts />
    </BaseLayout>
  );
};

// Index.getInitialProps = async () => {
//   let postsOffset = 1;
//   const posts = await getPosts(postsOffset++);
//   // const featuredCourses = await getFeaturedCourses();

//   return { posts, postsOffset };
// };

// const getPosts = async offset => {
//   const fetch = new FetchBuilder()
//     .setUrl(`${BACKEND}/graph`)
//     .setPayload(getBlogPostQuery(offset))
//     .setIsGraphQLEndpoint(true)
//     .build();
//   const response = await fetch.exec();

//   return response.posts;
// };

// const getFeaturedCourses = async () => {
//   const query = `
//     query {
//       featuredCourses: getPublicCourses(offset: 1, onlyShowFeatured: true) {
//         id,
//         title,
//         cost,
//         featuredImage,
//         slug
//       }
//     }
//   `;
//   const fetch = new FetchBuilder()
//     .setUrl(`${BACKEND}/graph`)
//     .setPayload(query)
//     .setIsGraphQLEndpoint(true)
//     .build();
//   const response = await fetch.exec();

//   return response.featuredCourses;
// };

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile,
  siteinfo: state.siteinfo
});

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
