/**
 * Decorator for tweets.
 */
import React from "react";
import PropTypes from "prop-types";

const Tweet = (props) => {
  return (
    <div style={styles.container}>
      <div style={styles.iframeContainer}>
        <iframe
          src={`https://www.youtube.com/embed/${getVideoID(
            props.decoratedText
          )}`}
          frameBorder="0"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={styles.iframe}
        />
      </div>
      <a href={props.decoratedText} style={styles.link}>
        {props.children}
      </a>
    </div>
  );
};

Tweet.propTypes = {
  decoratedText: PropTypes.string,
  children: PropTypes.array,
};

export default Tweet;
