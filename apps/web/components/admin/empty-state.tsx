"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/shadcn-utils";

interface AdminEmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    className?: string;
}

export default function AdminEmptyState({
    title,
    description,
    actionLabel,
    actionHref,
    className,
}: AdminEmptyStateProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-dashed bg-muted/20 px-6 py-12",
                className,
            )}
        >
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
                <div className="mb-4 rounded-full border bg-background p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-semibold">{title}</h3>
                <p className="mt-2 text-muted-foreground">{description}</p>
                {actionLabel && actionHref ? (
                    <Link href={actionHref} className="mt-6">
                        <Button>{actionLabel}</Button>
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
