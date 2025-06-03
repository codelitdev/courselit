import React from "react";
import { Switch as ShadcnSwitch } from "./components/ui/switch";
import { cn } from "./lib/utils";
import type { ThemeStyle } from "@courselit/page-models";

export interface SwitchProps
    extends React.ComponentPropsWithoutRef<typeof ShadcnSwitch> {
    theme?: ThemeStyle;
}

export const Switch = React.forwardRef<
    React.ElementRef<typeof ShadcnSwitch>,
    SwitchProps
>(({ className = "", theme, ...props }, ref) => {
    const classes = cn(
        // Base styles
        "",
        // User overrides
        className,
    );

    return <ShadcnSwitch ref={ref} className={classes} {...props} />;
});
