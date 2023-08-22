import * as React from "react";

interface CommonButtonProps {
    children: React.ReactNode;
    variant?: "soft" | "classic";
    className?: string;
    style?: Record<string, string>;
    [key: string]: any;
}

interface ButtonButtonProps extends CommonButtonProps {
    component: "button";
    onClick?: (...args: any[]) => any;
}

interface LinkButtonProps extends CommonButtonProps {
    component: "link";
    href?: string;
}

type ButtonProps = ButtonButtonProps | LinkButtonProps;

export default function Button(props: ButtonProps) {
    const {
        children,
        className = "",
        style,
        component = "button",
        variant = "classic",
        ...other
    } = props;
    let commonClasses =
        "flex items-center gap-1 py-1 px-2 rounded disabled:pointer-events-none";

    if (variant === "classic") {
        commonClasses +=
            " bg-black text-white hover:!text-white hover:!bg-slate-500 active:!bg-slate-600 disabled:bg-slate-300";
    } else {
        commonClasses +=
            " bg-slate-100 text-black hover:!bg-slate-200 active:!bg-slate-300 disabled:text-slate-300";
    }

    if (component === "link") {
        return (
            <a
                className={`${commonClasses} ${className}`}
                href={props.href}
                style={{ ...style }}
                {...other}
            >
                {children}
            </a>
        );
    }

    return (
        <button
            className={`${commonClasses} ${className}`}
            onClick={props.onClick}
            style={{ ...style }}
            {...other}
        >
            {children}
        </button>
    );
}
