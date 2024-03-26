import React, { ReactNode } from "react";
import {
    Close,
    Content,
    Description,
    Overlay,
    Portal,
    Root,
    Title,
    Trigger,
} from "@radix-ui/react-dialog";
import IconButton from "./icon-button";
import { Cross } from "@courselit/icons";
import Button from "./button";

interface Dialog2Props {
    trigger: React.ReactNode;
    title: string;
    description?: string;
    children: React.ReactNode;
    cancelButtonCaption?: string;
    okButton?: ReactNode;
    okButtonCaption?: string;
    onClick?: (...args: any[]) => void;
    [x: string]: any;
}

export default function Dialog2({
    trigger,
    title,
    description,
    children,
    cancelButtonCaption,
    okButtonCaption,
    okButton,
    onClick,
    ...itemProps
}: Dialog2Props) {
    return (
        <Root {...itemProps}>
            <Trigger asChild>{trigger}</Trigger>
            <Portal>
                <Overlay className="z-[1501] bg-black opacity-70 data-[state=open]:animate-overlayShow fixed inset-0" />
                <Content className="z-[1501] data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[450px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none">
                    <Title className="text-lg font-medium mb-4">{title}</Title>
                    {description && (
                        <Description className="text-slate-500 mt-[10px] mb-5 leading-normal">
                            {description}
                        </Description>
                    )}
                    {children}
                    <div className="mt-[25px] flex justify-end gap-2">
                        <Close asChild>
                            <Button component="button" variant="soft">
                                {cancelButtonCaption || "Cancel"}
                            </Button>
                        </Close>
                        <Close asChild>
                            {okButton || (
                                <Button component="button" onClick={onClick}>
                                    {okButtonCaption || "Ok"}
                                </Button>
                            )}
                        </Close>
                    </div>
                    <Close asChild>
                        <span
                            className="absolute top-[10px] right-[10px]"
                            aria-label="Close"
                        >
                            <IconButton variant="soft">
                                <Cross />
                            </IconButton>
                        </span>
                    </Close>
                </Content>
            </Portal>
        </Root>
    );
}
