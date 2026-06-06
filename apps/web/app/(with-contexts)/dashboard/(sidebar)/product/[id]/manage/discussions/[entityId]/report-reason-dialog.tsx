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
import { POPUP_CANCEL_ACTION } from "@ui-config/strings";

const REPORT_DIALOG_TITLE = "Report Post";
const REPORT_DIALOG_DESCRIPTION =
    "Please provide a reason for reporting this post.";
const REPORT_DIALOG_PLACEHOLDER = "Reason for reporting...";
const REPORT_DIALOG_SUBMIT = "Submit";

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
                    <DialogTitle>{REPORT_DIALOG_TITLE}</DialogTitle>
                    <DialogDescription>
                        {REPORT_DIALOG_DESCRIPTION}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <Textarea
                        ref={textareaRef}
                        id="report-reason"
                        placeholder={REPORT_DIALOG_PLACEHOLDER}
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
                        {REPORT_DIALOG_SUBMIT}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
