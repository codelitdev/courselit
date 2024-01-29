import React from "react";
import { TextRenderer } from "@courselit/components-library";
import type { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
} from "./defaults";

const Widget = ({
    settings: {
        text,
        alignment,
        backgroundColor,
        color,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
    },
}: WidgetProps<Settings>) => {
    if (!text) return <></>;

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
                color,
            }}
            id={cssId}
        >
            <div
                className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
                style={{
                    textAlign: alignment,
                }}
            >
                <TextRenderer json={text} />
            </div>
        </section>
    );
};

export default Widget;
