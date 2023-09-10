import React from "react";

interface SectionProps {
    className?: string;
    header?: string;
    children: any;
}

const Section = ({ className = "", children, header }: SectionProps) => {
    return (
        <section
            className={`flex flex-col border rounded border-slate-200 p-2 ${className}`}
        >
            {header && <h2 className="text-xl font-medium mb-4">{header}</h2>}
            <div className="flex flex-col gap-2">{children}</div>
        </section>
    );
};

export default Section;
