import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivities } from "@/hooks/use-activities";

interface MetricCardProps {
    title: string;
    icon: React.ReactNode;
    type: string;
    duration: string;
    entityId: string;
}

const MetricCard = ({
    title,
    icon,
    type,
    duration,
    entityId,
}: MetricCardProps) => {
    const { data, loading } = useActivities(type, duration, entityId);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                {loading ? (
                    <>
                        <Skeleton className="h-7 w-3/4 mb-1" />
                        <Skeleton className="h-4 w-1/2" />
                    </>
                ) : (
                    <>
                        <div className="text-2xl font-bold">
                            {data.count.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data.growth > 0 ? "+" : ""}
                            {data.growth}% from previous period
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default MetricCard;
