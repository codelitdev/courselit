import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings, { Item } from "./settings";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@courselit/components-library";
import { TextRenderer } from "../../components";
import {
    Header1,
    Section,
    Subheader1,
    Text1,
} from "@courselit/page-primitives";
import { ThemeStyle } from "@courselit/page-models";
import clsx from "clsx";

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
        layout,
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

    return (
        <Section theme={overiddenTheme} id={cssId}>
            <div
                className={clsx(
                    "flex gap-4 flex-col",
                    layout === "horizontal" ? "lg:flex-row" : "",
                )}
            >
                <div
                    className={clsx(
                        "flex w-full flex-col",
                        headerAlignment === "center"
                            ? "items-center"
                            : "items-start",
                        layout === "horizontal" ? "lg:w-1/2" : "",
                    )}
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
                                <TextRenderer
                                    json={description}
                                    theme={overiddenTheme}
                                />
                            </Subheader1>
                        </div>
                    )}
                </div>
                {items && items.length > 0 && (
                    <div
                        className={clsx(
                            "flex w-full flex-wrap gap-[1%]",
                            layout === "horizontal" ? "lg:w-1/2" : "",
                        )}
                    >
                        <Accordion
                            type="single"
                            collapsible
                            className="w-full"
                            value={
                                editing
                                    ? `${items[itemBeingEditedIndex]?.title}-${itemBeingEditedIndex}`
                                    : undefined
                            }
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
                                        <TextRenderer
                                            json={item.description}
                                            theme={overiddenTheme}
                                        />
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
