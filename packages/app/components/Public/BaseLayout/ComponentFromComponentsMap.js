import React from "react";
import PropTypes from "prop-types";
// import ComponentsMap from "./ComponentsMap";
import widgets from "../../../config/widgets";

const ComponentFromComponentsMap = (props) => {
  const { name } = props;
  console.log(name, widgets, widgets[name]);
  const Component = widgets[name].widget;

  return (
    <div>
      <Component />
    </div>
  );
};

ComponentFromComponentsMap.propTypes = {
  name: PropTypes.string.isRequired,
};

export default ComponentFromComponentsMap;
