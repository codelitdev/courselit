import React from "react";
import widgets from "../../../ui-config/widgets";
import { FetchBuilder } from "@courselit/utils";
import * as config from "../../../ui-config/constants";
import * as utilities from "../../../ui-lib/utils";
import { connect } from "react-redux";
import type { AppState, AppDispatch } from "@courselit/state-management";

interface WidgetByNameProps {
  name: string;
  section: string;
  address: any;
  state: AppState;
  dispatch: AppDispatch;
}

const WidgetByName = ({
  name,
  section,
  address,
  state,
  dispatch,
}: WidgetByNameProps) => {
  const Widget = widgets[name].widget;
  const fetch = new FetchBuilder()
    .setUrl(`${state.address.backend}/api/graph`)
    .setIsGraphQLEndpoint(true);

  return (
    <div>
      <Widget
        name={name}
        fetchBuilder={fetch}
        section={section}
        config={Object.assign({}, config, {
          BACKEND: state.address.backend,
        })}
        utilities={utilities}
        state={state}
        dispatch={dispatch}
      />
    </div>
  );
};

const mapStateToProps = (state: AppState) => ({ state });
const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(WidgetByName);
