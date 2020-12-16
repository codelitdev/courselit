import React from "react";
import PropTypes from "prop-types";

const Link = ({ contentState, entityKey, children }) => {
  const { url } = contentState.getEntity(entityKey).getData();

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
};

Link.propTypes = {
  children: PropTypes.array.isRequired,
  contentState: PropTypes.func.isRequired,
  entityKey: PropTypes.string.isRequired,
};

export default Link;
