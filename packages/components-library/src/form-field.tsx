import * as React from "react";
import { Control, CustomMatcher, Field, Label, Message } from "@radix-ui/react-form";

interface Message {
    text: string;
    match: "valueMissing" | "valid" | "typeMismatch" | "tooShort" | "tooLong" | "stepMismatch" | "rangeUnderflow" | "rangeOverflow" | "patternMismatch" | "badInput" | CustomMatcher; 
}

export interface FormFieldProps {
    label: string;
    component?: "input" | "textarea";
    type?: "email" | "number" | "file" | "color" | "checkbox" | "hidden" | "range" | "submit" | "text" | "url";
    messages?: Message[];
    [key: string]: any;
    name?: string;
}

export default function FormField({
    label,
    component = "input",
    type = "text",
    messages,
    name,
    ...componentProps
}: FormFieldProps) {
    const controlClasses = "border border-black hover:border-slate-500 rounded py-1 px-2 outline-none hover:shadow-[0_0_0_1px_grey] focus:shadow-[0_0_0_2px_grey]" 
    const Component = component;

    return (
            <Field name={name}>
                <div className="flex items-baseline justify-between">
                    <Label className="mb-1 font-medium">{label}</Label>
                    {messages && messages.map(message => 
                        <Message className="text-sm" match={message.match}>
                            {message.text}
                        </Message>
                    )}
                </div>
                <Control asChild>
                    <Component
                        className={controlClasses}
                        type={type}
                        {...componentProps} />
                </Control>
            </Field>
    )
}
