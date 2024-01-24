import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings, { Item } from "./settings";
import { TextRenderer } from "@courselit/components-library";
import { Accordion } from "@courselit/components-library";
import { AccordionItem } from "@courselit/components-library";
import { AccordionTrigger } from "@courselit/components-library";
import { AccordionContent } from "@courselit/components-library";

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        items,
        horizontalPadding,
        verticalPadding,
    },
}: WidgetProps<Settings>) {
    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <div
                className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
            >
                <div
                    className={`flex flex-col ${
                        headerAlignment === "center"
                            ? "items-center"
                            : "items-start"
                    }`}
                >
                    <h2 className="text-4xl mb-4">{title}</h2>
                    {description && (
                        <div
                            className={`mb-4 ${
                                headerAlignment === "center"
                                    ? "text-center"
                                    : "text-left"
                            }`}
                        >
                            <TextRenderer json={description} />
                        </div>
                    )}
                </div>
                {items && items.length > 0 && (
                    <div className="flex flex-wrap gap-[1%]">
                        <Accordion type="single" collapsible className="w-full">
                            {items.map((item: Item, index: number) => (
                                <AccordionItem value={`${item.title}-${index}`}>
                                    <AccordionTrigger>
                                        {item.title}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <TextRenderer json={item.description} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                )}
            </div>
        </section>
    );
}
