import React from "react";
import PropTypes from "prop-types";

const Link = (props) => (
  <span>
    <a href={props.decoratedText} target="_blank" rel="noopener noreferrer">
      {props.children}
    </a>
  </span>
);

Link.propTypes = {
  children: PropTypes.array,
  decoratedText: PropTypes.string,
};

export default Link;
