import React from "react";
import { Fallback, Image, Root } from "@radix-ui/react-avatar";

interface AvatarProps {
    src?: string;
    alt?: string;
    fallbackText?: string;
}

export default function Avatar({ src, alt, fallbackText }: AvatarProps) {
    return (
        <Root className="bg-black inline-flex h-[45px] w-[45px] select-none items-center justify-center overflow-hidden rounded-full align-middle border border-slate-200">
            <Image
                className="h-full w-full rounded-[inherit] object-cover"
                src={src}
                alt={alt}
            />
            <Fallback className="leading-1 flex h-full w-full items-center justify-center bg-white text-[15px] font-medium">
                {fallbackText}
            </Fallback>
        </Root>
    );
}
