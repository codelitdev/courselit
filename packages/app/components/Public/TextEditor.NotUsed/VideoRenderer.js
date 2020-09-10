import React from "react";
import PropTypes from "prop-types";
import { Grid, makeStyles, Typography } from "@material-ui/core";

const useStyles = makeStyles({
  container: {
    alignItems: "center",
    overflowX: "hidden",
    margin: "1em auto",
  },
  videocontainer: {
    width: 480,
    height: 270,
    display: "flex",
  },
  video: {
    flex: 1,
  },
  caption: {
    color: "#6d6d6d",
    paddingTop: 5,
  },
});

const VideoRenderer = (props) => {
  const tokenizedURL = props.decoratedText.split("/");
  const videoID = tokenizedURL[tokenizedURL.length - 1];
  const classes = useStyles();

  return (
    <Grid container direction="column" className={classes.container}>
      <Grid item className={classes.videocontainer}>
        <iframe
          src={`https://www.youtube.com/embed/${videoID}`}
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={classes.video}
        ></iframe>
      </Grid>
      <Grid item className={classes.caption}>
        <Typography variant="caption">{props.children}</Typography>
      </Grid>
    </Grid>
  );
};

VideoRenderer.propTypes = {
  decoratedText: PropTypes.string,
  children: PropTypes.array,
};

export default VideoRenderer;
