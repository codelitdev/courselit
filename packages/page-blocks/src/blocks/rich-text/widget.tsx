import React from "react";
import { TextRenderer } from "../../components";
import type { WidgetProps } from "@courselit/common-models";
import Settings from "./settings";
import { fontSize as defaultFontSize } from "./defaults";
import { Text1, Section } from "@courselit/page-primitives";
import { ThemeStyle } from "@courselit/page-models";

// TODO: This is not working hence turned off
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
        cssId,
        maxWidth,
        verticalPadding,
        fontSize = defaultFontSize,
    },
    state: { theme },
}: WidgetProps<Settings>) => {
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;

    if (!text) return <></>;

    return (
        <Section
            theme={overiddenTheme}
            style={{
                textAlign: alignment,
            }}
            id={cssId}
        >
            <Text1
                theme={overiddenTheme}
                className={`${twFontSize[fontSize]}`}
                component="span"
            >
                <TextRenderer json={text} theme={overiddenTheme} />
            </Text1>
        </Section>
    );
};

export default Widget;
