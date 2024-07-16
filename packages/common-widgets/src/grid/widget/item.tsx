import React from "react";
import { Item } from "../settings";
import {
    TextRenderer,
    Image,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
    Button2,
    Link,
} from "@courselit/components-library";
import { Alignment } from "@courselit/common-models";

interface ItemmProps {
    item: Item;
    buttonBackground?: string;
    buttonForeground?: string;
    alignment: Alignment;
    backgroundColor?: string;
    foregroundColor?: string;
    borderColor?: string;
    borderRadius?: number;
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
}: ItemmProps) {
    return (
        <Card
            className="h-full flex flex-col"
            style={{
                backgroundColor,
                color: foregroundColor,
                borderColor,
                borderRadius,
            }}
        >
            <CardHeader>
                <div
                    className={`flex gap-4 ${
                        media && media.file
                            ? mediaAlignment && mediaAlignment === "top"
                                ? "flex-col-reverse"
                                : "flex-col "
                            : "flex-col"
                    }`}
                >
                    <CardTitle
                        className={`${
                            alignment === "center" ? "text-center" : ""
                        }`}
                    >
                        {title}
                    </CardTitle>
                    {media && media.file && (
                        <div className="mb-4">
                            <Image
                                alt={media && media.caption}
                                src={media && media.file}
                                loading="lazy"
                                sizes="40vw"
                                noDefaultImage={true}
                                className="!aspect-square"
                            />
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="grow">
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
                            <TextRenderer json={description} />
                        </div>
                    )}
                </article>
            </CardContent>
            {buttonAction && buttonCaption && (
                <CardFooter>
                    <Link href={buttonAction} className="w-full">
                        <Button2
                            className="w-full"
                            style={{
                                backgroundColor: buttonBackground,
                                color: buttonForeground,
                            }}
                        >
                            {buttonCaption}
                        </Button2>
                    </Link>
                </CardFooter>
            )}
        </Card>
    );
}
