import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { networkAction } from "../../../redux/actions";
import FetchBuilder from "../../../lib/fetch";
import { BACKEND } from "../../../config/constants";
import { Grid, Typography, Button } from "@material-ui/core";
import {
  HEADER_BLOG_POSTS_SECTION,
  BTN_LOAD_MORE,
  SUBHEADER_BLOG_POSTS_SECTION,
} from "../../../config/strings";
import ListItem from "./ListItem";
import { makeStyles } from "@material-ui/styles";
import { publicCourse } from "../../../types";

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

const List = (props) => {
  const [posts, setPosts] = useState(props.initialItems || []);
  const [postsOffset, setPostsOffset] = useState(2);
  const shouldShowLoadMoreButton = props.showLoadMoreButton
    ? props.showLoadMoreButton
    : false;
  const classes = useStyles();
  const { generateQuery } = props;
  console.log(props.initialItems);

  // useEffect(() => {
  //   getPosts();
  // }, [postsOffset]);

  const getPosts = async () => {
    // const query = `
    //     query {
    //         posts: getPosts(offset: ${postsOffset}) {
    //             id,
    //             title,
    //             description,
    //             updated,
    //             creatorName,
    //             slug,
    //             featuredImage,
    //             courseId
    //         }
    //     }
    //     `;

    try {
      props.dispatch && props.dispatch(networkAction(true));
      const fetch = new FetchBuilder()
        .setUrl(`${BACKEND}/graph`)
        .setPayload(generateQuery(postsOffset))
        .setIsGraphQLEndpoint(true)
        .build();
      const response = await fetch.exec();
      if (response.posts) {
        setPosts([...posts, ...response.posts]);
      }
    } finally {
      props.dispatch && props.dispatch(networkAction(false));
    }
  };

  return posts.length > 0 ? (
    <Grid item xs={12} className={classes.content}>
      <Grid container component="section">
        <Grid item container className={classes.header}>
          <Grid item xs={12} className={classes.headerTop}>
            <Typography variant="h4">{HEADER_BLOG_POSTS_SECTION}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1" color="textSecondary">
              {SUBHEADER_BLOG_POSTS_SECTION}
            </Typography>
          </Grid>
        </Grid>
        <Grid item container xs={12} justify="space-between">
          {posts.map((x, index) => (
            <ListItem key={index} {...x} />
          ))}
        </Grid>
        {shouldShowLoadMoreButton && posts.length > 0 && (
          <Grid item xs={12}>
            <Button onClick={() => setPostsOffset(postsOffset + 1)}>
              {BTN_LOAD_MORE}
            </Button>
          </Grid>
        )}
      </Grid>
    </Grid>
  ) : (
    <></>
  );
};

List.propTypes = {
  generateQuery: PropTypes.func.isRequired,
  initialItems: PropTypes.arrayOf(publicCourse),
  showLoadMoreButton: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
};

// const mapStateToProps = () => ({});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(null, mapDispatchToProps)(List);
