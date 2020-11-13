import React from "react";
import PropTypes from "prop-types";
import widgets from "../../../config/widgets";
import FetchBuilder from "../../../lib/fetch";
import { BACKEND } from "../../../config/constants";
import * as config from "../../../config/constants";
import * as utilities from "../../../lib/utils";

const WidgetByName = (props) => {
  const { name, section } = props;
  const Widget = widgets[name].widget;
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setIsGraphQLEndpoint(true);

  return (
    <div>
      <Widget
        name={name}
        fetchBuilder={fetch}
        section={section}
        config={config}
        utilities={utilities}
      />
    </div>
  );
};

WidgetByName.propTypes = {
  name: PropTypes.string.isRequired,
  section: PropTypes.string.isRequired,
};

export default WidgetByName;
