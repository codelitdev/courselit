"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    BUTTON_CANCEL_TEXT,
    BUTTON_CONFIRM_TEXT,
    COURSE_DISCUSSIONS_ADMIN_REJECTION_DIALOG_TITLE,
    COURSE_DISCUSSIONS_ADMIN_REJECTION_DIALOG_DESCRIPTION,
    COURSE_DISCUSSIONS_ADMIN_REJECTION_DIALOG_LABEL,
} from "@ui-config/strings";

interface RejectionReasonDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
}

export function RejectionReasonDialog({
    isOpen,
    onClose,
    onConfirm,
}: RejectionReasonDialogProps) {
    const [reason, setReason] = useState("");

    const handleConfirm = () => {
        onConfirm(reason);
        setReason("");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>
                        {COURSE_DISCUSSIONS_ADMIN_REJECTION_DIALOG_TITLE}
                    </DialogTitle>
                    <DialogDescription>
                        {COURSE_DISCUSSIONS_ADMIN_REJECTION_DIALOG_DESCRIPTION}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">
                            {COURSE_DISCUSSIONS_ADMIN_REJECTION_DIALOG_LABEL}
                        </Label>
                        <Input
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        {BUTTON_CANCEL_TEXT}
                    </Button>
                    <Button type="submit" onClick={handleConfirm}>
                        {BUTTON_CONFIRM_TEXT}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
