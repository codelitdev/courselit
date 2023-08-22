import React from "react";
import { Item } from "../settings";
import { TextRenderer, Image, Button } from "@courselit/components-library";
import { Alignment } from "@courselit/common-models";

interface ItemmProps {
    item: Item;
    buttonBackground?: string;
    buttonForeground?: string;
    alignment: Alignment;
}

export default function Itemm({
    item: { title, description, buttonAction, buttonCaption, media },
    buttonBackground,
    buttonForeground,
    alignment,
}: ItemmProps) {
    return (
        <div>
            {media && media.file && (
                <div className="mb-4">
                    <Image
                        src={media && media.file}
                        loading="lazy"
                        sizes="40vw"
                        noDefaultImage={true}
                    />
                </div>
            )}
            <article
                className={`flex flex-col ${
                    alignment === "center" ? "items-center" : "items-start"
                }`}
            >
                <h3 className="text-3xl mb-2">{title}</h3>
                {description && (
                    <div
                        className={`mb-2 ${
                            alignment === "center" ? "text-center" : "text-left"
                        }`}
                    >
                        <TextRenderer json={description} />
                    </div>
                )}
                {buttonAction && buttonCaption && (
                    <Button
                        href={buttonAction}
                        component="link"
                        style={{
                            backgroundColor: buttonBackground,
                            color: buttonForeground,
                        }}
                    >
                        {buttonCaption}
                    </Button>
                )}
            </article>
        </div>
    );
}
