import React from "react";
import PropTypes from "prop-types";
import widgets from "../../../config/widgets";
import FetchBuilder from "../../../lib/fetch";
import * as config from "../../../config/constants";
import * as utilities from "../../../lib/utils";
import { connect } from "react-redux";
import { addressProps } from "../../../types";

const WidgetByName = ({ name, section, address }) => {
  const Widget = widgets[name].widget;
  const fetch = new FetchBuilder()
    .setUrl(`${address.backend}/graph`)
    .setIsGraphQLEndpoint(true);

  return (
    <div>
      <Widget
        name={name}
        fetchBuilder={fetch}
        section={section}
        config={Object.assign({}, config, {
          BACKEND: address.backend,
        })}
        utilities={utilities}
      />
    </div>
  );
};

WidgetByName.propTypes = {
  name: PropTypes.string.isRequired,
  section: PropTypes.string.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  address: state.address,
});

export default connect(mapStateToProps)(WidgetByName);
