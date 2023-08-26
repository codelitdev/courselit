import * as React from "react";
import { Root }  from "@radix-ui/react-form";

interface FormProps {
    onSubmit: (...args: any[]) => any;
    children: React.ReactNode
}

export default function Form({
    onSubmit,
    children
}: FormProps) {
    return (
        <Root onSubmit={onSubmit}>
        {children}
        </Root>
    )
}
