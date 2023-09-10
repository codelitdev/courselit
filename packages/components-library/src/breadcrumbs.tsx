import { Children, ReactNode } from "react";

interface BreadcrumbsProps {
    children: ReactNode;
    className?: string;
    [x: string]: any;
}

export default function Breadcrumbs({
    children,
    className = "",
    ...otherProps
}: BreadcrumbsProps) {
    const count = Children.count(children);

    return (
        <div className={`flex ${className}`} {...otherProps}>
            {Children.map(children, (child, index) => (
                <p
                    className={`flex ${
                        index < count - 1 ? "text-slate-500" : ""
                    }`}
                >
                    {index !== 0 && (
                        <>
                            <span>&nbsp; / &nbsp;</span>
                            <span>{child}</span>
                        </>
                    )}
                    {index === 0 && <span>{child}</span>}
                </p>
            ))}
        </div>
    );
}
