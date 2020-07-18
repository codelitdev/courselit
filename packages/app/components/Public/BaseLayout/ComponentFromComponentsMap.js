import React from "react";
import PropTypes from "prop-types";
import ComponentsMap from "./ComponentsMap";

const ComponentFromComponentsMap = props => {
  const { name } = props;
  const Component = ComponentsMap[name];

  return (
    <div>
      <Component />
    </div>
  );
};

ComponentFromComponentsMap.propTypes = {
  name: PropTypes.string.isRequired
};

export default ComponentFromComponentsMap;
