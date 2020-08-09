import React from "react";
import PropTypes from "prop-types";

const Blockquote = (props) => {
  return <div style={props.style}>{props.children}</div>;
};

Blockquote.propTypes = {
  style: PropTypes.object.isRequired,
  children: PropTypes.array,
};

export default Blockquote;
