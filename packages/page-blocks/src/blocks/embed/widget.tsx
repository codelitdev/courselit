import React, { useRef } from "react";
import { WidgetProps } from "@courselit/common-models";
import { height as defaultHeight } from "./defaults";
import Settings from "./settings";
import { ThemeStyle } from "@courselit/page-models";
import { Section } from "@courselit/page-primitives";
import { SandboxedEmbed } from "../../components";

export default function Widget({
    id,
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

    const formattedHeight = `${height}px`;

    // Check if content is "script" or "iframe" (not a direct URL)
    const isEmbedCode = contentType === "script";

    const containerStyle =
        aspectRatio && aspectRatio !== "default"
            ? ({
                  position: "relative",
                  width: "100%",
                  paddingTop: `calc(100% / (${aspectRatio.split(":")[0]} / ${aspectRatio.split(":")[1]}))`,
              } as React.CSSProperties)
            : isEmbedCode
              ? ({} as React.CSSProperties)
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
            : isEmbedCode
              ? ({} as React.CSSProperties)
              : ({ height: "100%" } as React.CSSProperties);

    const renderContent = () => {
        if (isEmbedCode) {
            // Content is a script or iframe code - use sandboxed embed for dynamic height
            return (
                <SandboxedEmbed
                    id={id}
                    content={content}
                    className="w-full"
                    style={iframeStyle}
                />
            );
        } else {
            // URL-based content
            return (
                <iframe
                    ref={iframeRef}
                    src={content}
                    className="w-full border-0"
                    style={iframeStyle}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            );
        }
    };

    return (
        <Section theme={overiddenTheme} id={cssId}>
            <div className="mx-auto lg:max-w-[1200px]">
                <div className={`flex flex-col px-4 w-full mx-auto`}>
                    <div
                        className={`w-full overflow-hidden relative`}
                        style={containerStyle}
                    >
                        {renderContent()}
                    </div>
                </div>
            </div>
        </Section>
    );
}
