import React from "react";
import PropTypes from "prop-types";
import widgets from "../../../config/widgets";
import FetchBuilder from "../../../lib/fetch";
import { BACKEND } from "../../../config/constants";
import { useTheme } from "@material-ui/styles";

const WidgetByName = (props) => {
  const { name } = props;
  const theme = useTheme();
  const Widget = widgets[name].widget;
  const fetch = new FetchBuilder()
    .setUrl(`${BACKEND}/graph`)
    .setIsGraphQLEndpoint(true);

  return (
    <div>
      <Widget name={name} fetchBuilder={fetch} theme={theme} />
    </div>
  );
};

WidgetByName.propTypes = {
  name: PropTypes.string.isRequired,
};

export default WidgetByName;
