import React from "react";
import widgets from "../../../../ui-config/widgets";
import { connect } from "react-redux";
import type { AppState, AppDispatch } from "@courselit/state-management";

interface WidgetByNameProps {
    id: string;
    name: string;
    state: AppState;
    dispatch: AppDispatch;
    settings: Record<string, unknown>;
    pageData: Record<string, unknown>;
}

const WidgetByName = ({
    id,
    name,
    state,
    dispatch,
    settings,
    pageData,
}: WidgetByNameProps) => {
    if (!widgets[name]) return <>{name} component is not found.</>;

    return React.createElement(widgets[name].widget, {
        name,
        settings,
        state,
        dispatch,
        id,
        pageData,
    });
};

const mapStateToProps = (state: AppState) => ({ state });
const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(WidgetByName);
