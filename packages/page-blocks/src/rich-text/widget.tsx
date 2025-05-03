import React from "react";
import { TextRenderer } from "@courselit/components-library";
import type { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    fontSize as defaultFontSize,
} from "./defaults";
import { Text1 } from "@courselit/page-primitives";

const twFontSize = {
    1: "text-xs",
    2: "text-sm",
    3: "text-base",
    4: "text-lg",
    5: "text-xl",
    6: "text-2xl",
    7: "text-3xl",
    8: "text-4xl",
    9: "text-5xl",
    10: "text-6xl",
    11: "text-7xl",
    12: "text-8xl",
};

const Widget = ({
    settings: {
        text,
        alignment,
        backgroundColor,
        color,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
        fontSize = defaultFontSize,
    },
    state: { theme },
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
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
                    style={{
                        textAlign: alignment,
                    }}
                >
                    <Text1 theme={theme} className={`${twFontSize[fontSize]}`}>
                        <TextRenderer json={text} />
                    </Text1>
                </div>
            </div>
        </section>
    );
};

export default Widget;
