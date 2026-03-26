"use client";

import { Badge } from "@/components/ui/badge";
import { ChevronRight, FileText, HelpCircle, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { DragHandle } from "@courselit/icons";
import { PRODUCT_STATUS_DRAFT } from "@ui-config/strings";
import { CSSProperties } from "react";
import { LessonSummary } from "./helpers";
import type { useMultiContainerSortableItem } from "./multi-container-drag-and-drop";

function LessonTypeIcon({ type }: { type: string }) {
    switch (type) {
        case "video":
            return <Video className="h-4 w-4 text-muted-foreground" />;
        case "text":
            return <FileText className="h-4 w-4 text-muted-foreground" />;
        case "quiz":
            return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
        default:
            return null;
    }
}

export default function LessonListItem({
    lesson,
    sectionId,
    productId,
    disabled,
    isDragging,
    attributes,
    listeners,
    setNodeRef,
    style,
}: {
    lesson: LessonSummary;
    sectionId: string;
    productId: string;
    disabled: boolean;
    isDragging: boolean;
    attributes: ReturnType<typeof useMultiContainerSortableItem>["attributes"];
    listeners: ReturnType<typeof useMultiContainerSortableItem>["listeners"];
    setNodeRef: ReturnType<typeof useMultiContainerSortableItem>["setNodeRef"];
    style: CSSProperties;
}) {
    const router = useRouter();

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-5 w-full ${isDragging ? "opacity-50" : ""}`}
        >
            <button
                type="button"
                data-testid="lesson-drag-handle"
                disabled={disabled}
                className="border border-border text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded transition-colors cursor-grab active:cursor-grabbing"
                onClick={(event) => {
                    event.stopPropagation();
                }}
                {...(disabled ? {} : attributes)}
                {...(disabled ? {} : listeners)}
            >
                <DragHandle />
            </button>

            <div
                data-testid={`lesson-item-${lesson.lessonId}`}
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted transition-colors duration-150 ease-in-out cursor-pointer w-full"
                onClick={() =>
                    router.push(
                        `/dashboard/product/${productId}/content/section/${sectionId}/lesson?id=${lesson.lessonId}`,
                    )
                }
            >
                <div className="flex items-center space-x-3">
                    <LessonTypeIcon type={lesson.type} />
                    <span className="text-sm font-medium text-foreground">
                        {lesson.title}
                    </span>
                </div>
                <div className="flex items-center space-x-3">
                    {!lesson.published && (
                        <Badge variant="outline" className="ml-2 text-xs">
                            {PRODUCT_STATUS_DRAFT}
                        </Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
            </div>
        </div>
    );
}
