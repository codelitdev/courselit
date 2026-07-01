"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    POPUP_CANCEL_ACTION,
    COURSE_DISCUSSIONS_REPORT_DIALOG_TITLE,
    COURSE_DISCUSSIONS_REPORT_DIALOG_DESCRIPTION,
    COURSE_DISCUSSIONS_REPORT_DIALOG_PLACEHOLDER,
    COURSE_DISCUSSIONS_REPORT_DIALOG_SUBMIT,
} from "@ui-config/strings";

interface ReportReasonDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
}

export function ReportReasonDialog({
    isOpen,
    onClose,
    onSubmit,
}: ReportReasonDialogProps) {
    const [reason, setReason] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    function handleSubmit() {
        const trimmed = reason.trim();
        if (!trimmed) {
            textareaRef.current?.focus();
            return;
        }
        onSubmit(trimmed);
        setReason("");
    }

    function handleClose() {
        setReason("");
        onClose();
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle>
                        {COURSE_DISCUSSIONS_REPORT_DIALOG_TITLE}
                    </DialogTitle>
                    <DialogDescription>
                        {COURSE_DISCUSSIONS_REPORT_DIALOG_DESCRIPTION}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <Textarea
                        ref={textareaRef}
                        id="report-reason"
                        placeholder={
                            COURSE_DISCUSSIONS_REPORT_DIALOG_PLACEHOLDER
                        }
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={4}
                        className="resize-none"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                handleSubmit();
                            }
                        }}
                    />
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                    >
                        {POPUP_CANCEL_ACTION}
                    </Button>
                    <Button
                        type="submit"
                        disabled={!reason.trim()}
                        onClick={handleSubmit}
                    >
                        {COURSE_DISCUSSIONS_REPORT_DIALOG_SUBMIT}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
