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
    state: AppState;
    dispatch: AppDispatch;
    settings: Record<string, unknown>;
}

const WidgetByName = ({
    id,
    name,
    state,
    dispatch,
    settings,
}: WidgetByNameProps) => {
    if (!widgets[name]) return <>{name} component is not found.</>;

    return React.createElement(widgets[name].widget, {
        name,
        settings,
        config: Object.assign({}, config, {
            BACKEND: state.address.backend,
            FREE_COST_CAPTION: FREE_COST,
        }),
        utilities,
        state,
        dispatch,
        id,
    });
};

const mapStateToProps = (state: AppState) => ({ state });
const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(WidgetByName);
