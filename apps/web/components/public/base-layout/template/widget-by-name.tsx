import React from "react";
import widgets from "../../../../ui-config/widgets";
import type { AppState, AppDispatch } from "@courselit/state-management";
import { COMPONENT_MISSING_SUFFIX } from "../../../../ui-config/strings";
import WidgetErrorBoundary from "./widget-error-boundary";
import { useTheme } from "next-themes";
import { WidgetDefaultSettings, WidgetProps } from "@courselit/common-models";

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
}: Omit<WidgetProps<WidgetDefaultSettings>, "toggleTheme" | "nextTheme">) => {
    const { theme: nextTheme, setTheme: setNextTheme } = useTheme();

    const toggleTheme = () => {
        const themeNext = nextTheme === "dark" ? "light" : "dark";
        setNextTheme(themeNext);
    };

    const widgetProps: WidgetProps<WidgetDefaultSettings> = {
        name,
        settings,
        state,
        dispatch,
        id,
        pageData,
        editing,
        nextTheme,
        toggleTheme,
    };

    if (!widgets[name]) return <>{`${name} ${COMPONENT_MISSING_SUFFIX}`}</>;

    return (
        <WidgetErrorBoundary widgetName={name}>
            {React.createElement(widgets[name].widget, widgetProps)}
        </WidgetErrorBoundary>
    );
};

export default WidgetByName;
