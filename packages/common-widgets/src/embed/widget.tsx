import React, { useRef, useEffect } from "react";
import { WidgetProps } from "@courselit/common-models";
import {
    verticalPadding as defaultVerticalPadding,
    horizontalPadding as defaultHorizontalPadding,
    height as defaultHeight,
} from "./defaults";
import Settings from "./settings";

export default function Widget({
    settings: {
        url,
        script,
        aspectRatio,
        height = defaultHeight,
        backgroundColor,
        horizontalPadding = defaultHorizontalPadding,
        verticalPadding = defaultVerticalPadding,
        cssId,
    },
}: WidgetProps<Settings>) {
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

    // const handleLoad = () => {
    //     setIsLoading(false)
    // }

    useEffect(() => {
        if (script && containerRef.current) {
            const tempContainer = document.createElement("div");
            tempContainer.innerHTML = script;

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

            // setIsLoading(false);
        }
    }, [script]);

    return (
        <section
            className={`py-[${verticalPadding}px]`}
            style={{
                backgroundColor,
            }}
            id={cssId}
        >
            <div className="mx-auto lg:max-w-[1200px]">
                <div
                    className={`flex flex-col px-4 w-full mx-auto lg:max-w-[${horizontalPadding}%]`}
                >
                    <div
                        className={`w-full overflow-hidden relative`}
                        style={containerStyle}
                    >
                        {script ? (
                            <div
                                ref={containerRef}
                                className="w-full h-full"
                                style={iframeStyle}
                            />
                        ) : (
                            <iframe
                                ref={iframeRef}
                                src={url}
                                className="w-full border-0"
                                style={iframeStyle}
                                // onLoad={handleLoad}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
