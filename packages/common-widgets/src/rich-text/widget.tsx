import React from "react";
import { TextRenderer } from "@courselit/components-library";
import type { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";

const Widget = ({
    settings: { text, alignment, backgroundColor, color },
}: WidgetProps<Settings>) => {
    if (!text) return <></>;

    return (
        <div
            className="p-4"
            style={{
                backgroundColor,
                color,
                textAlign: alignment,
            }}
        >
            <TextRenderer json={text} />
        </div>
    );
};

export default Widget;
