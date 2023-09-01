import * as React from "react";

interface SectionProps {
    className?: string;
    children: any;
}

const Section = ({ className = "", children }: SectionProps) => {
    return (
        <section
            className={`flex flex-col gap-4 border rounded border-slate-200 p-2 ${className}`}
        >
            {children}
        </section>
    );
};

export default Section;
