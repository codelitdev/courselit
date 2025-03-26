import React from "react";
import widgets from "../../../../ui-config/widgets";
import type { AppState, AppDispatch } from "@courselit/state-management";
import { COMPONENT_MISSING_SUFFIX } from "../../../../ui-config/strings";
import WidgetErrorBoundary from "./widget-error-boundary";

interface WidgetByNameProps {
    id: string;
    name: string;
    state: Partial<AppState>;
    dispatch?: AppDispatch;
    settings: Record<string, unknown>;
    pageData: Record<string, unknown>;
    editing: boolean;
}

const WidgetByName = ({
    id,
    name,
    state,
    dispatch,
    settings,
    pageData,
    editing = false,
}: WidgetByNameProps) => {
    if (!widgets[name]) return <>{`${name} ${COMPONENT_MISSING_SUFFIX}`}</>;

    return (
        <WidgetErrorBoundary widgetName={name}>
            {React.createElement(widgets[name].widget, {
                name,
                settings,
                state,
                dispatch,
                id,
                pageData,
                editing,
            })}
        </WidgetErrorBoundary>
    );
};

export default WidgetByName;
