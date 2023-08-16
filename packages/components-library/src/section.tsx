import * as React from "react";

interface SectionProps {
    children: any;
}

const Section = (props: SectionProps) => {
    return <section>{props.children}</section>;
};

export default Section;
