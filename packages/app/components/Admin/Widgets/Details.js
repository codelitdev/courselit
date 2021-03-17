import React from "react";
import PropTypes from "prop-types";
import FetchBuilder from "../../../lib/fetch";
import { useTheme } from "@material-ui/styles";
import { connect } from "react-redux";
import { addressProps } from "../../../types";

const Details = ({ name, component, address }) => {
  const theme = useTheme();
  const fetch = new FetchBuilder()
    .setUrl(`${address.backend}/graph`)
    .setIsGraphQLEndpoint(true);
  const { component: Component } = component;

  return <Component name={name} fetchBuilder={fetch} theme={theme} />;
};

Details.propTypes = {
  name: PropTypes.string.isRequired,
  component: PropTypes.shape({
    caption: PropTypes.string.isRequired,
    component: PropTypes.object.isRequired,
    icon: PropTypes.string,
  }),
  address: addressProps,
};

const mapStateToProps = (state) => ({
  address: state.address,
});

export default connect(mapStateToProps)(Details);
