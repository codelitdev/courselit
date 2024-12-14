import { Card, Skeleton } from "@courselit/components-library";

export default function LoadingSkeleton() {
    return (
        <div className="max-w-3xl mx-auto p-4 space-y-6 w-full">
            {/* Post input skeleton */}
            <Skeleton className="w-full h-10" />

            {/* Navigation tabs skeleton */}
            <div className="flex gap-2 items-center">
                <Skeleton className="w-16 h-9 rounded-full" />
                <Skeleton className="w-40 h-9 rounded-full" />
                <Skeleton className="w-20 h-9 rounded-full" />
                <Skeleton className="w-24 h-9 rounded-full" />
            </div>

            {/* Welcome banner skeleton */}
            <Card className="p-4">
                <Skeleton className="w-full h-6" />
            </Card>

            {/* Posts skeletons */}
            <div className="space-y-4">
                {[1, 2].map((post) => (
                    <Card key={post} className="p-4">
                        <div className="flex justify-between items-start">
                            <div className="flex gap-3 w-full">
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <div className="w-full space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="w-32 h-5" />
                                        <Skeleton className="w-24 h-4" />
                                    </div>
                                    <Skeleton className="w-full h-4" />
                                    <Skeleton className="w-full h-4" />
                                    <Skeleton className="w-3/4 h-4" />
                                    <div className="flex items-center gap-4 mt-4">
                                        <Skeleton className="w-16 h-8" />
                                        <Skeleton className="w-16 h-8" />
                                    </div>
                                </div>
                            </div>
                            <Skeleton className="w-8 h-8 rounded-full" />
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
