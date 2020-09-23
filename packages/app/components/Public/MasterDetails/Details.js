import React from "react";
import PropTypes from "prop-types";
import FetchBuilder from "../../../lib/fetch";
import { BACKEND } from "../../../config/constants";
import { useTheme } from "@material-ui/styles";

const Details = (props) => {
  const { name, component } = props;
  const theme = useTheme();
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setIsGraphQLEndpoint(true);
  const { component: Component } = component;

  return <Component name={name} fetchBuilder={fetch} theme={theme} />;
};

Details.propTypes = {
  name: PropTypes.string.isRequired,
  component: PropTypes.shape({
    icon: PropTypes.string.isRequired,
    caption: PropTypes.string.isRequired,
    component: PropTypes.object.isRequired,
  }),
};

export default Details;
