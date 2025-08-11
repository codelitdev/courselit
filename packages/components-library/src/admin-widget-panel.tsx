import * as React from "react";
import Section from "./section";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./components/ui/accordion";

interface AdminWidgetPanelContainerProps {
    children: React.ReactNode;
    className?: string;
    type?: "single" | "multiple";
    defaultValue?: string | string[];
}

export function AdminWidgetPanelContainer({
    children,
    className = "",
    type = "multiple",
    defaultValue,
}: AdminWidgetPanelContainerProps) {
    return (
        <div className={`flex flex-col gap-4 mb-4 ${className}`}>
            {type === "single" ? (
                <Accordion
                    type="single"
                    collapsible
                    defaultValue={defaultValue as string}
                >
                    {children}
                </Accordion>
            ) : (
                <Accordion
                    type="multiple"
                    defaultValue={defaultValue as string[]}
                >
                    {children}
                </Accordion>
            )}
        </div>
    );
}

interface AdminWidgetPanelProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
    value: string;
    defaultExpanded?: boolean;
}

export function AdminWidgetPanel({
    title,
    children,
    className = "",
    value,
}: AdminWidgetPanelProps) {
    if (!title) {
        // If no title, render as non-collapsible section
        return <Section className={className}>{children}</Section>;
    }

    return (
        <AccordionItem value={value} className={className}>
            <AccordionTrigger className="text-base hover:no-underline">
                {title}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4">
                {children}
            </AccordionContent>
        </AccordionItem>
    );
}
