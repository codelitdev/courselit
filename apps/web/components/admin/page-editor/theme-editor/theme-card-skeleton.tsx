import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/shadcn-utils";

interface ThemeCardSkeletonProps {
    className?: string;
}

export function ThemeCardSkeleton({ className = "" }: ThemeCardSkeletonProps) {
    return (
        <Card
            className={cn(
                "w-full px-0 py-0 bg-background flex flex-col border border-muted",
                className,
            )}
        >
            <CardContent className="pb-2 pt-2 px-2">
                <div className="flex items-center justify-between min-h-[24px]">
                    <Skeleton className="h-5 w-24" />
                </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between pt-0 pb-2 px-2">
                <div className="flex gap-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="w-4 h-4 rounded-full" />
                    ))}
                </div>
                <Skeleton className="h-8 w-[56px] rounded-md" />
            </CardFooter>
        </Card>
    );
}
