import {
    Arrow,
    Content,
    Portal,
    Provider,
    Root,
    Trigger,
} from "@radix-ui/react-tooltip";
import React from "react";

interface TooltipProps {
    title: string;
    children: React.ReactNode;
}
export default function Tooltip({ title, children }: TooltipProps) {
    return (
        <Provider>
            <Root>
                <Trigger asChild>
                    <span>{children}</span>
                </Trigger>
                <Portal>
                    <Content className="text-white select-none rounded bg-black px-2 py-1 text-sm leading-none  shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px]">
                        {title}
                        <Arrow className="fill-black" />
                    </Content>
                </Portal>
            </Root>
        </Provider>
    );
}
