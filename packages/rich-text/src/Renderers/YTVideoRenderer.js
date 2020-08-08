/**
 * Renderer for YouTube videos.
 *
 * It works with the following two forms of YouTube URLs.
 *
 * 1. http://www.youtube.com/watch?v=iwGFalTRHDA
 * 2. http://youtu.be/n17B_uFF4cA
 */
import React from "react";
import PropTypes from "prop-types";

const getVideoID = (str) => {
  let videoID;

  if (str.indexOf("watch?v=") !== -1) {
    videoID = str.substr(str.indexOf("?v=") + 3);
  } else {
    const tokenizedURL = str.split("/");
    videoID = tokenizedURL[tokenizedURL.length - 1];
  }

  return videoID;
};

const styles = {
  container: {
    height: 480,
  },
  iframe: {
    position: "absolute",
    height: "100%",
    width: "100%",
  },
};

const YTVideoRenderer = (props) => {
  return (
    <div style={styles.container}>
      <iframe
        src={`https://www.youtube.com/embed/${getVideoID(props.decoratedText)}`}
        frameBorder="0"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={styles.iframe}
      />
    </div>
  );
};

YTVideoRenderer.propTypes = {
  decoratedText: PropTypes.string,
  children: PropTypes.array,
};

export default YTVideoRenderer;
