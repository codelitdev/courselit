import React from "react";
import PropTypes from "prop-types";

const LinkRenderer = (props) => (
  <span>
    <a href={props.decoratedText} target="_blank" rel="noopener noreferrer">
      {props.children}
    </a>
  </span>
);

LinkRenderer.propTypes = {
  children: PropTypes.array,
  decoratedText: PropTypes.string,
};

export default LinkRenderer;
