/**
 * Decorator for tweets.
 */
import React, { createRef, useEffect, useState } from "react";
import PropTypes from "prop-types";

const styles = {
  container: {
    textAlign: "center",
  },
  iframeContainer: {
    position: "relative",
    overflow: "hidden",
    '& iframe': {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
    }
  },
  link: {
    display: "hidden",
    marginTop: "1em",
    color: "#676767",
  },
};

const Tweet = (props) => {
  const callbacks = [];
  const [tweetId, setTweetId] = useState("");
  const container = createRef();

  useEffect(() => {
    addScript(`https://platform.twitter.com/widgets.js`, () => {})
  }, []);

  useEffect(() => {
    const twttr = window.twttr;
    const tokens = props.decoratedText.split("/");
    setTweetId(tokens[tokens.length - 1]);
    if (twttr) {
      renderTweet();
    }
  });

  const addScript = (src, cb) => {
    if (callbacks.length === 0) {
      callbacks.push(cb);
      var s = document.createElement("script");
      s.setAttribute("src", src);
      s.onload = () => callbacks.forEach((cb) => cb());
      document.body.appendChild(s);
    } else {
      callbacks.push(cb);
    }
  };

  const renderTweet = () => {
    const twttr = window.twttr;
    if (tweetId && container.current) {
      clearPreviousContent();
      twttr.widgets.createTweet(tweetId, container.current, {
        theme: "light",
        align: "center",
      });
    }

    // twttr.ready().then(({ widgets}) => {
    //   // clearPreviousContent()

    //   widgets.createTweet('20', container.current, {
    //     theme: 'dark'
    //   })
    //     .then(response => console.log('Tweet loaded'))
    //     .catch(err => console.log(err))
    // })
  };

  const clearPreviousContent = () => {
    if (container) {
      container.current.innerHTML = "";
    }
  };

  return (
    <div style={styles.container}>
      <div ref={container} style={styles.iframeContainer} />
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
