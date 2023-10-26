import React from "react";
import {
    Control,
    CustomMatcher,
    Field,
    Label,
    Message,
} from "@radix-ui/react-form";

interface MessageItem {
    text: string;
    match:
        | "valueMissing"
        | "valid"
        | "typeMismatch"
        | "tooShort"
        | "tooLong"
        | "stepMismatch"
        | "rangeUnderflow"
        | "rangeOverflow"
        | "patternMismatch"
        | "badInput"
        | CustomMatcher;
}

export interface FormFieldProps {
    label?: string;
    component?: "input" | "textarea";
    type?:
        | "email"
        | "number"
        | "file"
        | "color"
        | "checkbox"
        | "hidden"
        | "range"
        | "submit"
        | "text"
        | "url"
        | "date";
    messages?: MessageItem[];
    [key: string]: any;
    name?: string;
    className?: string;
    endIcon?: React.ReactNode;
}

export default function FormField({
    label,
    component = "input",
    type = "text",
    messages,
    name,
    className = "",
    endIcon,
    ...componentProps
}: FormFieldProps) {
    const controlClasses =
        "flex w-full border border-slate-300 hover:border-slate-400 rounded py-1 px-2 outline-none focus:border-slate-600 disabled:pointer-events-none";
    const Component = component;

    return (
        <Field className={`flex flex-col ${className}`} name={name}>
            <div className="flex items-baseline justify-between">
                {label && <Label className="mb-1 font-medium">{label}</Label>}
                {messages &&
                    messages.map((message) => (
                        <Message className="text-xs" match={message.match}>
                            {message.text}
                        </Message>
                    ))}
            </div>
            <div className={controlClasses}>
                <Control asChild>
                    <Component
                        type={type}
                        className="outline-none w-full"
                        {...componentProps}
                    />
                </Control>
                {endIcon}
            </div>
        </Field>
    );
}
