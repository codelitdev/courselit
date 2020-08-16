import React from "react";
import PropTypes from "prop-types";

const CodeRenderer = (props) => {
  return <div style={props.style}>{props.children}</div>;
};

CodeRenderer.propTypes = {
  style: PropTypes.object.isRequired,
  children: PropTypes.array,
};

export default CodeRenderer;
