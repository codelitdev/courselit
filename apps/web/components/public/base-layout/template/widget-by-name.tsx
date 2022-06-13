import React from "react";
import widgets from "../../../../ui-config/widgets";
import * as config from "../../../../ui-config/constants";
import * as utilities from "../../../../ui-lib/utils";
import { connect } from "react-redux";
import type { AppState, AppDispatch } from "@courselit/state-management";
import { FREE_COST } from "../../../../ui-config/strings";

interface WidgetByNameProps {
    id: string;
    name: string;
    section: string;
    state: AppState;
    dispatch: AppDispatch;
    settings: Record<string, unknown>;
}

const WidgetByName = ({
    id,
    name,
    section,
    state,
    dispatch,
    settings,
}: WidgetByNameProps) => {
    const Widget = widgets[name].widget;

    return (
        <div>
            <Widget
                name={name}
                settings={settings}
                config={Object.assign({}, config, {
                    BACKEND: state.address.backend,
                    FREE_COST_CAPTION: FREE_COST,
                })}
                utilities={utilities}
                section={section}
                state={state}
                dispatch={dispatch}
                id={id}
            />
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({ state });
const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(WidgetByName);
