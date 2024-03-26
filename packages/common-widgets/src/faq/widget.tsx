import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings, { Item } from "./settings";
import {
    TextRenderer,
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@courselit/components-library";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        backgroundColor,
        foregroundColor,
        items,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
    },
}: WidgetProps<Settings>) {
    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
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
                            <Accordion
                                type="single"
                                collapsible
                                className="w-full"
                            >
                                {items.map((item: Item, index: number) => (
                                    <AccordionItem
                                        key={item.title}
                                        value={`${item.title}-${index}`}
                                    >
                                        <AccordionTrigger>
                                            {item.title}
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <TextRenderer
                                                json={item.description}
                                            />
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
