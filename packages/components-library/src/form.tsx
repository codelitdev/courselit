import * as React from "react";
import { Root } from "@radix-ui/react-form";

interface FormProps {
    onSubmit?: (...args: any[]) => any;
    children: React.ReactNode;
    [x: string]: any;
}

export default function Form({ onSubmit, children, ...props }: FormProps) {
    return (
        <Root onSubmit={onSubmit} {...props}>
            {children}
        </Root>
    );
}
