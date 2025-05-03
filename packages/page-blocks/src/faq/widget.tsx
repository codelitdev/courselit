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
import { Header1, Subheader1, Text1 } from "@courselit/page-primitives";

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
    state,
}: WidgetProps<Settings>) {
    const { theme } = state;

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
                        <Header1 className="mb-4" theme={theme}>
                            {title}
                        </Header1>
                        {description && (
                            <div
                                className={`mb-4 ${
                                    headerAlignment === "center"
                                        ? "text-center"
                                        : "text-left"
                                }`}
                            >
                                <Subheader1 theme={theme}>
                                    <TextRenderer json={description} />
                                </Subheader1>
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
                                            <Text1 theme={theme}>
                                                {item.title}
                                            </Text1>
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
