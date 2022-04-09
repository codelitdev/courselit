import React from "react";
import widgets from "../../../ui-config/widgets";
import FetchBuilder from "../../../ui-lib/fetch";
import * as config from "../../../ui-config/constants";
import * as utilities from "../../../ui-lib/utils";
import { connect } from "react-redux";
import State from "../../../ui-models/state";

interface WidgetByNameProps {
  name: string;
  section: string;
  address: any;
}

const WidgetByName = ({ name, section, address }: WidgetByNameProps) => {
  const Widget = widgets[name].widget;
  const fetch = new FetchBuilder()
    .setUrl(`${address.backend}/api/graph`)
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

const mapStateToProps = (state: State) => ({
  address: state.address,
});

export default connect(mapStateToProps)(WidgetByName);
