import React, { ReactNode } from "react";

interface SectionProps {
    className?: string;
    header?: string;
    subtext?: ReactNode;
    children: any;
}

const Section = ({
    className = "",
    children,
    header,
    subtext,
}: SectionProps) => {
    return (
        <section
            className={`flex flex-col border rounded border-slate-200 gap-4 p-2 ${className}`}
        >
            {header && <h2 className="text-xl font-medium">{header}</h2>}
            {subtext && <div className="text-sm text-slate-500">{subtext}</div>}
            <div className="flex flex-col gap-2">{children}</div>
        </section>
    );
};

export default Section;
