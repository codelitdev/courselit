import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressBar } from "./progress-bar";
import type { ContentItem } from "./content";

interface ContentCardProps {
    item: ContentItem;
}

export function ContentCard({ item }: ContentCardProps) {
    const { entity, entityType } = item;
    const progress =
        entity.totalLessons && entity.completedLessonsCount
            ? (entity.completedLessonsCount / entity.totalLessons) * 100
            : 0;

    return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="relative aspect-video">
                <Image
                    src={
                        entity.featuredImage?.thumbnail ||
                        "/courselit_backdrop_square.webp"
                    }
                    alt={entity.title}
                    fill
                    className="object-cover"
                />
            </div>
            <CardContent className="p-4">
                <h3 className="text-xl font-semibold mb-3">{entity.title}</h3>
                {entityType === "course" && entity.totalLessons && (
                    <div className="space-y-2">
                        <ProgressBar value={progress} />
                        <p className="text-sm text-muted-foreground flex justify-between">
                            <span>{`${entity.completedLessonsCount} of ${entity.totalLessons} lessons completed`}</span>
                            <span>{`${Math.round(progress)}%`}</span>
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
