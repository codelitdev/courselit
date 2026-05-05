import { Card, Skeleton } from "@courselit/components-library";

export default function PostCardSkeleton() {
    return (
        <Card className="p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex w-full gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="w-full min-w-0 space-y-3">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-6 w-2/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="mt-4 flex items-center gap-4">
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    </div>
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </Card>
    );
}
