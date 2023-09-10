import React, { ReactNode } from "react";

interface ChipProps {
    children: ReactNode;
    style?: Record<string, string>;
    className?: string;
}

const Chip = React.forwardRef(
    ({ children, style, className }: ChipProps, forwardedRef: any) => {
        return (
            <span
                className={`text-xs text-white bg-slate-400 rounded px-2 py-1 ${className}`}
                style={{ ...style }}
            >
                {children}
            </span>
        );
    },
);

export default Chip;
