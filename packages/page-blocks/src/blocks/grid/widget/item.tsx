import React from "react";
import { Item, SvgStyle } from "../settings";
import { TextRenderer, Link } from "@courselit/components-library";
import { Alignment } from "@courselit/common-models";
import { ThemeStyle } from "@courselit/page-models";
import {
    Button,
    PageCard,
    PageCardHeader,
    PageCardContent,
    PageCardImage,
    Text1,
} from "@courselit/page-primitives";
import { processedSvg } from "../helpers";

interface ItemmProps {
    item: Item;
    alignment: Alignment;
    borderRadius?: number;
    theme: ThemeStyle;
    svgStyle: SvgStyle;
    svgInline: boolean;
}

export default function Itemm({
    item: {
        title,
        description,
        buttonAction,
        buttonCaption,
        media,
        mediaAlignment,
        svgText,
    },
    alignment,
    theme,
    svgStyle,
    svgInline,
}: ItemmProps) {
    return (
        <PageCard className="h-full" theme={theme}>
            <PageCardContent className="h-full flex flex-col" theme={theme}>
                <PageCardHeader theme={theme}>
                    <div
                        className={`flex gap-4 ${
                            media && media.file
                                ? mediaAlignment && mediaAlignment === "top"
                                    ? "flex-col-reverse"
                                    : "flex-col "
                                : "flex-col"
                        }`}
                    >
                        <div
                            className={`flex ${svgInline ? "flex-row gap-2 items-center" : `flex-col gap-4 ${alignment === "center" ? "items-center" : "items-start"}`}`}
                        >
                            {svgText && (
                                <div
                                    className="flex justify-center items-center"
                                    style={{
                                        width: `${svgStyle.width}px`,
                                        height: `${svgStyle.height}px`,
                                        backgroundColor:
                                            svgStyle.backgroundColor,
                                        borderRadius: `${svgStyle.borderRadius}px`,
                                        borderWidth: `${svgStyle.borderWidth}px`,
                                        borderStyle: svgStyle.borderStyle,
                                        borderColor: svgStyle.borderColor,
                                        padding: "8px",
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html:
                                            processedSvg(svgText, svgStyle) ||
                                            '<div class="text-red-500">Invalid SVG</div>',
                                    }}
                                />
                            )}
                            {title}
                        </div>
                        {media && media.file && (
                            <div className="mb-4">
                                <PageCardImage
                                    alt={media.caption}
                                    src={media.file}
                                    className="!aspect-square rounded"
                                />
                            </div>
                        )}
                    </div>
                </PageCardHeader>
                <article
                    className={`grow flex flex-col ${
                        alignment === "center" ? "items-center" : "items-start"
                    }`}
                >
                    {description && (
                        <div
                            className={`grow mb-2 ${
                                alignment === "center"
                                    ? "text-center"
                                    : "text-left"
                            }`}
                        >
                            <Text1 theme={theme} component="span">
                                <TextRenderer json={description} />
                            </Text1>
                        </div>
                    )}
                </article>
                {buttonAction && buttonCaption && (
                    <Link href={buttonAction} className="w-full">
                        <Button className="w-full" theme={theme}>
                            {buttonCaption}
                        </Button>
                    </Link>
                )}
            </PageCardContent>
        </PageCard>
    );
}
