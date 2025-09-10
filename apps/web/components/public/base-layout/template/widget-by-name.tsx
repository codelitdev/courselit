import React from "react";
import widgets from "@/ui-config/widgets";
import { COMPONENT_MISSING_SUFFIX } from "@/ui-config/strings";
import WidgetErrorBoundary from "@/components/public/base-layout/template/widget-error-boundary";
import { useTheme } from "next-themes";
import { WidgetDefaultSettings, WidgetProps } from "@courselit/common-models";

const WidgetByName = ({
    id,
    name,
    state,
    settings,
    pageData,
    editing = false,
}: Omit<WidgetProps<WidgetDefaultSettings>, "toggleTheme" | "nextTheme">) => {
    const { resolvedTheme: nextTheme, setTheme: setNextTheme } = useTheme();

    const toggleTheme = () => {
        const themeNext = nextTheme === "dark" ? "light" : "dark";
        setNextTheme(themeNext);
    };

    const widgetProps: WidgetProps<WidgetDefaultSettings> = {
        name,
        settings,
        state,
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
