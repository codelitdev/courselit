import React, { ReactNode } from "react";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";

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
        <Dialog {...itemProps}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[85vh] w-[90vw] max-w-[450px]">
                <DialogTitle className="mb-4">{title}</DialogTitle>
                {description && (
                    <DialogDescription className="mt-[10px] mb-5 leading-normal">
                        {description}
                    </DialogDescription>
                )}
                {children}
                <DialogFooter className="mt-[25px] flex justify-end gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            {cancelButtonCaption || "Cancel"}
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        {okButton || (
                            <Button type="button" onClick={onClick}>
                                {okButtonCaption || "Ok"}
                            </Button>
                        )}
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
