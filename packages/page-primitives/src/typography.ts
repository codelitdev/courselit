import React from "react";
import type { ThemeStyle } from "@courselit/page-models";

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    className?: string;
    theme?: ThemeStyle;
}
