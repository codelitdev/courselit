import React, { ReactNode } from "react";
import { Cross } from "@courselit/icons";
import {
    Arrow,
    Close,
    Content,
    Portal,
    Root,
    Trigger,
} from "@radix-ui/react-popover";
import Button from "./button";

interface PopoverProps {
    open: boolean;
    setOpen: (val: boolean) => void;
    title: ReactNode | string;
    children: ReactNode;
    disabled: boolean;
}

export default function Popover({
    open,
    setOpen,
    title,
    children,
    disabled = false,
}: PopoverProps) {
    return (
        <Root open={open} onOpenChange={setOpen}>
            <Trigger asChild>
                <Button disabled={disabled} variant="soft">
                    {title}
                </Button>
            </Trigger>
            <Portal>
                <Content className="min-w-[180px] bg-white rounded shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)]">
                    {children}
                    <Close className="rounded-full h-[16px] w-[16px] inline-flex items-center justify-center absolute top-[5px] right-[5px] hover:bg-slate-100 focus:shadow-[0_0_0_1px] focus:bg-slate-100 outline-none cursor-default">
                        <Cross />
                    </Close>
                    <Arrow className="border-slate-300 fill-white" />
                </Content>
            </Portal>
        </Root>
    );
}
