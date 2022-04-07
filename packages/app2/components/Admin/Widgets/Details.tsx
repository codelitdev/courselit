import React from "react";
import FetchBuilder from "../../../ui-lib/fetch";
import { useTheme } from "@mui/styles";
import { connect } from "react-redux";
import type Address from "../../../ui-models/address";
import { RootState } from "../../../state/store";

interface Component {
  caption: string;
  component: any;
  icon?: string;
}

interface DetailsProps {
  name: string;
  component: Component;
  address: Address;
}

const Details = ({ name, component, address }: DetailsProps) => {
  const theme = useTheme();
  const fetch = new FetchBuilder()
    .setUrl(`${address.backend}/api/graph`)
    .setIsGraphQLEndpoint(true);
  const { component: Component } = component;

  return <Component name={name} fetchBuilder={fetch} theme={theme} />;
};

const mapStateToProps = (state: RootState) => ({
  address: state.address,
});

export default connect(mapStateToProps)(Details);
