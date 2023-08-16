import React from "react";
import { WidgetProps } from "@courselit/common-models";
import Settings, { Item } from "../settings";
import { TextRenderer } from "@courselit/components-library";
import Itemm from "./item";
import { Button } from "@mui/material";

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
        <div
            className="flex flex-col p-4"
            style={{
                backgroundColor,
                color: foregroundColor,
            }}
        >
            <div className="mb-12">
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
                            component="a"
                            href={buttonAction}
                            variant="contained"
                            size="large"
                            sx={{
                                backgroundColor: buttonBackground,
                                color: buttonForeground,
                            }}
                        >
                            {buttonCaption}
                        </Button>
                    )}
                </div>
            </div>
            {items && items.length > 0 && (
                <div className="flex flex-wrap">
                    {items.map((item: Item, index: number) => (
                        <Itemm
                            item={item}
                            key={index}
                            buttonBackground={buttonBackground}
                            buttonForeground={buttonForeground}
                            alignment={itemsAlignment}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
