/**
 * Decorator for tweets.
 */
import React, { createRef, useEffect } from "react";
import PropTypes from "prop-types";

const styles = {
  container: {
    textAlign: "center",
  },
  iframeContainer: {
    position: "relative",
    overflow: "hidden",
    "& iframe": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
    },
  },
  link: {
    display: "hidden",
    marginTop: "1em",
    color: "#676767",
    fontSize: ".8em",
    overflowWrap: "anywhere",
  },
};

const Tweet = (props) => {
  const tweetRef = createRef();

  useEffect(() => {
    if (!window.twttr) {
      window.twttr = twitterFunc(document, "script", "twitter-wjs");
    }
  }, []);

  /* eslint-disable one-var */
  const twitterFunc = function (d, s, id) {
    var js,
      fjs = d.getElementsByTagName(s)[0],
      t = window.twttr || {};
    if (d.getElementById(id)) return t;
    js = d.createElement(s);
    js.id = id;
    js.src = "https://platform.twitter.com/widgets.js";
    fjs.parentNode.insertBefore(js, fjs);
    t._e = [];
    t.ready = function (f) {
      t._e.push(f);
    };
    return t;
  };
  /* eslint-enable one-var */

  useEffect(() => {
    const tokens = props.decoratedText.split("/");
    window.twttr.ready((twttr) => {
      twttr.widgets.createTweet(tokens[tokens.length - 1], tweetRef.current, {
        theme: "light",
        align: "center",
      });
    });
  }, [props.decoratedText]);

  return (
    <div style={styles.container}>
      <div ref={tweetRef} style={styles.iframeContainer} />
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
