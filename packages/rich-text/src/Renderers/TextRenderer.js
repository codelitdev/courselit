import React from "react";
import PropTypes from "prop-types";

const TextRenderer = (props) => {
  return <span style={props.style}>{props.children}</span>;
};

TextRenderer.propTypes = {
  style: PropTypes.object.isRequired,
  children: PropTypes.array,
};

export default TextRenderer;
