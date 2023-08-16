import React from "react";
import { Button } from "@mui/material";
import { Item } from "../settings";
import { TextRenderer, Image } from "@courselit/components-library";
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
        <div className="sm:w-full md:w-1/2 lg:w-1/3 mb-6">
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
                <h3 className="text-3xl">{title}</h3>
                {description && (
                    <div
                        className={
                            alignment === "center" ? "text-center" : "text-left"
                        }
                    >
                        <TextRenderer json={description} />
                    </div>
                )}
                {buttonAction && buttonCaption && (
                    <Button
                        component="a"
                        href={buttonAction}
                        variant="contained"
                        size="large"
                        sx={{
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
