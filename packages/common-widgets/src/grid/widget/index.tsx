import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings, { Item } from "../settings";
import { TextRenderer, Button } from "@courselit/components-library";
import Itemm from "./item";

export default function Widget({
    settings: {
        title,
        description,
        headerAlignment,
        itemsAlignment,
        buttonCaption,
        buttonAction,
        buttonBackground,
        buttonForeground,
        backgroundColor,
        foregroundColor,
        items,
    },
}: WidgetProps<Settings>) {
    return (
        <section
            className="flex flex-col p-4"
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
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
                {buttonAction && buttonCaption && (
                    <Button
                        href={buttonAction}
                        component="link"
                        style={{
                            backgroundColor: buttonBackground,
                            color: buttonForeground,
                        }}
                        className="mb-6"
                    >
                        {buttonCaption}
                    </Button>
                )}
            </div>
            {items && items.length > 0 && (
                <div className="flex flex-wrap gap-[1%]">
                    {items.map((item: Item, index: number) => (
                        <div className="basis-full md:basis-[49.5%] lg:basis-[32.6666%] mb-6">
                            <Itemm
                                item={item}
                                key={index}
                                buttonBackground={buttonBackground}
                                buttonForeground={buttonForeground}
                                alignment={itemsAlignment}
                            />
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
