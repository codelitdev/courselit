import React, { ReactNode } from "react";
import { Submit } from "@radix-ui/react-form";
import { Button2 } from ".";

interface FormSubmitProps {
    text: ReactNode;
    [key: string]: any;
}

export default function FormSubmit({ text, ...other }: FormSubmitProps) {
    return (
        <Submit asChild>
            <Button2 {...other}>{text}</Button2>
        </Submit>
    );
}
