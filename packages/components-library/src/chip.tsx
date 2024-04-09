import { ReactNode, forwardRef } from "react";

interface ChipProps {
    children: ReactNode;
    style?: Record<string, string>;
    className?: string;
}

const Chip = forwardRef<HTMLSpanElement, ChipProps>(
    ({ children, style, className }: ChipProps, ref) => {
        return (
            <span
                ref={ref}
                className={`text-xs text-slate-500 border-[1px] border-slate-500 rounded px-[4px] py-[2px] ${className}`}
                style={{ ...style }}
            >
                {children}
            </span>
        );
    },
);

export default Chip;
