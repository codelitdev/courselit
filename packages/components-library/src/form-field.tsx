import React from "react";
import { Control, CustomMatcher, Field, Message } from "@radix-ui/react-form";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Help } from "@courselit/icons";
import { Tooltip } from ".";
import { Label } from "./components/ui/label";

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
        | "datetime-local"
        | "date"
        | "password";
    messages?: MessageItem[];
    [key: string]: any;
    name?: string;
    className?: string;
    endIcon?: React.ReactNode;
    tooltip?: string;
}

export default function FormField({
    label,
    component = "input",
    type = "text",
    messages,
    className = "",
    endIcon,
    tooltip,
    name,
    ...componentProps
}: FormFieldProps) {
    const Component = component === "input" ? Input : Textarea;

    return (
        <Field className={`flex flex-col ${className}`} name={name}>
            <div className="flex items-baseline justify-between">
                {label && (
                    <div className="flex grow items-center gap-1">
                        <Label htmlFor={name} className="mb-1 font-semibold">
                            {label}
                        </Label>
                        {tooltip && (
                            <Tooltip title={tooltip}>
                                <Help />
                            </Tooltip>
                        )}
                    </div>
                )}
                {messages &&
                    messages.map((message) => (
                        <Message
                            key={message.text}
                            className="text-xs mb-1"
                            match={message.match}
                        >
                            {message.text}
                        </Message>
                    ))}
            </div>
            <div className="flex items-center gap-2">
                <Control asChild>
                    <Component
                        type={type}
                        className="outline-hidden w-full"
                        name={name}
                        {...componentProps}
                    />
                </Control>
                {endIcon}
            </div>
        </Field>
    );
}
