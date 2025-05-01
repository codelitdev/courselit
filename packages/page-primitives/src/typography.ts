import React from "react";
import type { Theme } from "@courselit/common-models";

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    className?: string;
    theme?: Theme;
}
