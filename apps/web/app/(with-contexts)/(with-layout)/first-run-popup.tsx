"use client";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@components/ui/alert-dialog";
import { AlertDialogCancel } from "@radix-ui/react-alert-dialog";
import Link from "next/link";
import { useState } from "react";

export default function FirstRunPopup() {
    const [open, setOpen] = useState(true);

    return (
        <AlertDialog open={open}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        Welcome to your new school! 🎉
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        You are almost ready to monetize your knowledge.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOpen(false)}>
                        I&apos;ll do it on my own
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Link href="/dashboard/get-set-up">Continue setup</Link>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
