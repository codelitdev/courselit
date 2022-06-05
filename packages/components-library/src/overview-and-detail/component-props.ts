import * as React from "react";

interface ComponentWithoutDetailProps {
    Overview: React.Component;
}

interface ComponentWithDetailProps {
    subtitle: string;
    Overview: React.Component;
    Detail: React.Component;
}

type ComponentProps = ComponentWithoutDetailProps | ComponentWithDetailProps;

export function isComponentWithoutDetailProps(
    val: any
): val is ComponentWithoutDetailProps {
    return !val.hasOwnProperty("Detail");
}

export function isComponentWithDetailProps(
    val: any
): val is ComponentWithDetailProps {
    return val.hasOwnProperty("Detail");
}

export default ComponentProps;
