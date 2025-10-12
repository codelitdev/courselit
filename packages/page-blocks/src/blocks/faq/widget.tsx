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
    Header1,
    Section,
    Subheader1,
    Text1,
} from "@courselit/page-primitives";
import { ThemeStyle } from "@courselit/page-models";

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        items,
        cssId,
        maxWidth,
        verticalPadding,
        itemBeingEditedIndex,
    },
    state,
    editing,
}: WidgetProps<Settings>) {
    const { theme } = state;
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;
    const accordionValue = editing
        ? `${items[itemBeingEditedIndex]?.title}-${itemBeingEditedIndex}`
        : undefined;

    return (
        <Section theme={overiddenTheme} id={cssId}>
            <div className={`flex flex-col gap-4`}>
                <div
                    className={`flex flex-col ${
                        headerAlignment === "center"
                            ? "items-center"
                            : "items-start"
                    }`}
                >
                    <Header1 className="mb-4" theme={overiddenTheme}>
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
                            <Subheader1 theme={overiddenTheme} component="span">
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
                            value={accordionValue}
                        >
                            {items.map((item: Item, index: number) => (
                                <AccordionItem
                                    key={`${item.title}-${index}`}
                                    value={`${item.title}-${index}`}
                                >
                                    <AccordionTrigger>
                                        <Text1 theme={overiddenTheme}>
                                            {item.title}
                                        </Text1>
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
        </Section>
    );
}
