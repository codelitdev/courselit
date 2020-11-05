import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Grid, Typography, Button } from "@material-ui/core";
import ListItem from "./ListItem";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  content: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(2),
    background: "#eee",
  },
  header: {
    marginLeft: theme.spacing(2),
  },
  headerTop: {
    marginBottom: theme.spacing(2),
  },
}));

const Widget = (props) => {
  const { fetchBuilder, auth, utilities, config } = props;
  const [posts, setPosts] = useState([]);
  const [postsOffset, setPostsOffset] = useState(1);
  const shouldShowLoadMoreButton = props.showLoadMoreButton
    ? props.showLoadMoreButton
    : false;
  const classes = useStyles();
  const FEATURED_SECTION_HEADER = "";
  const BTN_LOAD_MORE = "";
  const SUBHEADER_FEATURED_SECTION = "";

  useEffect(() => {
    getPosts();
  }, [postsOffset]);

  const getPosts = async () => {
    const query = `
    query {
      courses: getPublicCourses(offset: 1, onlyShowFeatured: true) {
        id,
        title,
        cost,
        featuredImage,
        slug,
        courseId
      }
    }
    `;

    const fetch = fetchBuilder.setPayload(query).build();
    try {
      const response = await fetch.exec();
      if (response.courses) {
        setPosts([...posts, ...response.courses]);
      }
    } catch (err) {}
  };

  return posts.length > 0 ? (
    <Grid item xs={12} className={classes.content}>
      <Grid container component="section">
        <Grid item container className={classes.header}>
          <Grid item xs={12} className={classes.headerTop}>
            <Typography variant="h3">{FEATURED_SECTION_HEADER}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1" color="textSecondary">
              {SUBHEADER_FEATURED_SECTION}
            </Typography>
          </Grid>
        </Grid>
        <Grid item container xs={12}>
          {posts.map((x, index) => (
            <ListItem
              key={index}
              appUtilities={utilities}
              appConfig={config}
              {...x}
            />
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

Widget.propTypes = {
  showLoadMoreButton: PropTypes.bool,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Widget);
