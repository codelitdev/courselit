import React from "react";
import { Item } from "../settings";
import { TextRenderer, Link } from "@courselit/components-library";
import { Alignment, Theme } from "@courselit/common-models";
import {
    Button,
    PageCard,
    PageCardHeader,
    PageCardContent,
    PageCardImage,
    Subheader1,
} from "@courselit/page-primitives";

interface ItemmProps {
    item: Item;
    buttonBackground?: string;
    buttonForeground?: string;
    alignment: Alignment;
    backgroundColor?: string;
    foregroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
    theme: Theme;
}

export default function Itemm({
    item: {
        title,
        description,
        buttonAction,
        buttonCaption,
        media,
        mediaAlignment,
    },
    buttonBackground,
    buttonForeground,
    alignment,
    backgroundColor,
    foregroundColor,
    borderColor,
    borderRadius,
    theme,
}: ItemmProps) {
    return (
        <PageCard
            className="h-full flex flex-col"
            style={{
                backgroundColor,
                color: foregroundColor,
                borderColor,
                borderRadius,
            }}
            theme={theme}
        >
            <PageCardContent className="p-0" theme={theme}>
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
                        <span
                            className={`${
                                alignment === "center" ? "text-center" : ""
                            }`}
                        >
                            {title}
                        </span>
                        {media && media.file && (
                            <div className="mb-4">
                                <PageCardImage
                                    alt={media && media.caption}
                                    src={media && media.file}
                                    className="!aspect-square rounded"
                                />
                            </div>
                        )}
                    </div>
                </PageCardHeader>
                <article
                    className={`flex flex-col ${
                        alignment === "center" ? "items-center" : "items-start"
                    }`}
                >
                    {description && (
                        <div
                            className={`mb-2 ${
                                alignment === "center"
                                    ? "text-center"
                                    : "text-left"
                            }`}
                        >
                            <Subheader1 theme={theme}>
                                <TextRenderer json={description} />
                            </Subheader1>
                        </div>
                    )}
                </article>
                {buttonAction && buttonCaption && (
                    <Link href={buttonAction} className="w-full">
                        <Button
                            className="w-full"
                            style={{
                                backgroundColor:
                                    buttonBackground || theme?.colors?.primary,
                                color: buttonForeground || "#fff",
                            }}
                            theme={theme}
                        >
                            {buttonCaption}
                        </Button>
                    </Link>
                )}
            </PageCardContent>
        </PageCard>
    );
}
