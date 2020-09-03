/**
 * Decorator for tweets.
 */
import React from "react";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { useState } from "react";
import TweetEmbed from 'react-tweet-embed';

const styles = {
  container: {
    textAlign: "center",
  },
  iframeContainer: {
    overflow: "hidden",
  },
  link: {
    display: "hidden",
    marginTop: "1em",
    color: "#676767",
  },
};

const Tweet = (props) => {
  const [tweetId, setTweetId] = useState('');
  const twttr = window['twttr'];
  const callbacks = [];

  useEffect(() => {
    const tokens = props.decoratedText.split('\/');
    setTweetId(tokens[tokens.length - 1]);

    if (!(twttr && twttr.ready)) {
      addScript(`https://platform.twitter.com/widgets.js`, renderTweet)
    }
  }, [props.decoratedText])


  const addScript = (src, cb) => {
    if (callbacks.length === 0) {
      callbacks.push(cb)
      var s = document.createElement('script')
      s.setAttribute('src', src)
      s.onload = () => callbacks.forEach((cb) => cb())
      document.body.appendChild(s)
    } else {
      callbacks.push(cb)
    }
  }

  const renderTweet = () => {
    
  }

  return (
    <div style={styles.container}>
      <div style={styles.iframeContainer}>
        <TweetEmbed id={tweetId} />
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
