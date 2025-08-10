import React, { useRef, useEffect } from "react";
import { WidgetProps } from "@courselit/common-models";
import {
    height as defaultHeight,
} from "./defaults";
import Settings from "./settings";
import { ThemeStyle } from "@courselit/page-models";
import { Section } from "@courselit/page-primitives";

export default function Widget({
    settings: {
        contentType,
        content,
        aspectRatio,
        height = defaultHeight,
        cssId,
        maxWidth,
        verticalPadding,
    },
    state,
}: WidgetProps<Settings>) {
    const { theme } = state;
    const overiddenTheme: ThemeStyle = JSON.parse(JSON.stringify(theme.theme));
    overiddenTheme.structure.page.width =
        maxWidth || theme.theme.structure.page.width;
    overiddenTheme.structure.section.padding.y =
        verticalPadding || theme.theme.structure.section.padding.y;

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const formattedHeight = `${height}px`;

    const containerStyle =
        aspectRatio && aspectRatio !== "default"
            ? ({
                  position: "relative",
                  width: "100%",
                  paddingTop: `calc(100% / (${aspectRatio.split(":")[0]} / ${aspectRatio.split(":")[1]}))`,
              } as React.CSSProperties)
            : ({ height: formattedHeight } as React.CSSProperties);

    const iframeStyle =
        aspectRatio && aspectRatio !== "default"
            ? ({
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
              } as React.CSSProperties)
            : ({ height: "100%" } as React.CSSProperties);

    useEffect(() => {
        if (contentType === "script" && content && containerRef.current) {
            const tempContainer = document.createElement("div");
            tempContainer.innerHTML = content;

            // Append all elements to the container
            Array.from(tempContainer.children).forEach((elem) => {
                if (elem.nodeName === "SCRIPT") {
                    const script = document.createElement("script");
                    script.innerHTML = elem.innerHTML;
                    Array.from(elem.attributes).forEach((attr) => {
                        script.setAttribute(attr.name, attr.value);
                    });
                    containerRef.current?.appendChild(script);
                } else {
                    containerRef.current?.appendChild(elem.cloneNode(true));
                }
            });
        }
    }, [contentType, content]);

    return (
        <Section theme={overiddenTheme} id={cssId}>
            <div className="mx-auto lg:max-w-[1200px]">
                <div className={`flex flex-col px-4 w-full mx-auto`}>
                    <div
                        className={`w-full overflow-hidden relative`}
                        style={containerStyle}
                    >
                        {contentType === "script" ? (
                            <div
                                ref={containerRef}
                                className="w-full h-full"
                                style={iframeStyle}
                            />
                        ) : (
                            <iframe
                                ref={iframeRef}
                                src={content}
                                className="w-full border-0"
                                style={iframeStyle}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                </div>
            </div>
        </Section>
    );
}
