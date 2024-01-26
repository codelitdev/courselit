import React from "react";
import { TextRenderer } from "@courselit/components-library";
import type { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";

const Widget = ({
    settings: {
        text,
        alignment,
        backgroundColor,
        color,
        horizontalPadding,
        verticalPadding,
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
