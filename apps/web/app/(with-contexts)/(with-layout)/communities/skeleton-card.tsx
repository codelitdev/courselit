import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
    return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="relative aspect-video">
                <Skeleton className="h-full w-full" />
            </div>
            <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Skeleton className="h-4 w-4 mr-2" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                </div>
            </CardContent>
        </Card>
    );
}
