import { Card, Skeleton } from "@courselit/components-library";
import PostCardSkeleton from "./post-card-skeleton";

export default function LoadingSkeleton() {
    return (
        <div className="container mx-auto p-0">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Create post input skeleton */}
                    <Skeleton className="w-full h-10" />
                    <div className="flex gap-2 items-center pb-4 ">
                        <Skeleton className="w-16 h-9 rounded-full" />
                        <Skeleton className="w-16 h-9 rounded-full" />
                        <Skeleton className="w-24 h-9 rounded-full" />
                        <Skeleton className="w-20 h-9 rounded-full" />
                    </div>

                    {/* Welcome banner skeleton */}
                    <Card className="p-4">
                        <Skeleton className="w-full h-6" />
                    </Card>

                    {/* Posts skeletons */}
                    <div className="space-y-4">
                        {[1, 2, 3].map((post) => (
                            <PostCardSkeleton key={post} />
                        ))}
                    </div>

                    {/* Pagination skeleton */}
                    <div className="flex justify-center gap-2 mt-6">
                        {[1, 2, 3, 4, 5].map((item) => (
                            <Skeleton key={item} className="w-9 h-9" />
                        ))}
                    </div>
                </div>

                {/* Community Info skeleton - right on desktop, bottom on mobile */}
                <div className="lg:col-start-3 lg:row-start-1">
                    <Card className="p-4">
                        <Skeleton className="w-3/4 h-6 mb-4" />
                        <Skeleton className="w-full h-40 rounded-lg mb-4" />
                        <div className="space-y-2">
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-full h-4" />
                            <Skeleton className="w-3/4 h-4" />
                        </div>
                        <Skeleton className="w-1/2 h-4 mt-4" />
                    </Card>
                </div>
            </div>
        </div>
    );
}
