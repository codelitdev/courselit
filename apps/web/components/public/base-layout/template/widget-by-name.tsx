import React, { useState, useEffect } from "react";
import widgets from "@/ui-config/widgets";
import { COMPONENT_MISSING_SUFFIX } from "@/ui-config/strings";
import WidgetErrorBoundary from "@/components/public/base-layout/template/widget-error-boundary";
import { WidgetDefaultSettings, WidgetProps } from "@courselit/common-models";
import { useTheme } from "@/components/next-theme-provider";

const WidgetByName = ({
    id,
    name,
    state,
    settings,
    pageData,
    editing = false,
}: Omit<WidgetProps<WidgetDefaultSettings>, "toggleTheme" | "nextTheme">) => {
    const { resolvedTheme, setTheme: setNextTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Wait until the client has mounted before depending on the resolved theme.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    // Use undefined during SSR/hydration to match server, then switch to actual theme after mount
    const nextTheme = mounted ? resolvedTheme : undefined;

    const toggleTheme = () => {
        const themeNext = resolvedTheme === "dark" ? "light" : "dark";
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
