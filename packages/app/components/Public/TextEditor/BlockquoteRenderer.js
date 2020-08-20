import React from "react";
import PropTypes from "prop-types";

const BlockquoteRenderer = (props) => {
  return <div style={props.style}>{props.children}</div>;
};

BlockquoteRenderer.propTypes = {
  style: PropTypes.object.isRequired,
  children: PropTypes.array,
};

export default BlockquoteRenderer;
