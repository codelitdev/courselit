import React, { ReactNode } from "react";
import {
    Corner,
    Root,
    Scrollbar,
    Thumb,
    Viewport,
} from "@radix-ui/react-scroll-area";

interface ScrollAreaProps {
    children: ReactNode;
}

export default function ScrollArea({ children }: ScrollAreaProps) {
    return (
        <Root className="h-[225px] overflow-hidden">
            <Viewport className="w-full h-full rounded">{children}</Viewport>
            <Scrollbar
                className="flex select-none touch-none p-0.5 bg-slate-100 transition-colors duration-[160ms] ease-out hover:bg-slate-200 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
                orientation="vertical"
            >
                <Thumb className="flex-1 bg-slate-400 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
            </Scrollbar>
            <Scrollbar
                className="flex select-none touch-none p-0.5 bg-slate-100 transition-colors duration-[160ms] ease-out hover:bg-slate-200 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
                orientation="horizontal"
            >
                <Thumb className="flex-1 bg-slate-400 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
            </Scrollbar>
            <Corner className="bg-slate-100" />
        </Root>
    );
}
