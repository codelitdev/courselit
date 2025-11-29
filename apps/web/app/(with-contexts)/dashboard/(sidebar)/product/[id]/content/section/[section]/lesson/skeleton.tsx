import { Skeleton } from "@/components/ui/skeleton";

export const LessonSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
            </div>
        </div>

        <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-[200px] w-full" />
        </div>

        <div className="flex items-center justify-between pt-6">
            <Skeleton className="h-10 w-24" />
            <div className="space-x-2">
                <Skeleton className="h-10 w-24 inline-block" />
                <Skeleton className="h-10 w-24 inline-block" />
            </div>
        </div>
    </div>
);
