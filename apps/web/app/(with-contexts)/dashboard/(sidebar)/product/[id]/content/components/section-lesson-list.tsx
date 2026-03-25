"use client";

import { Fragment } from "react";
import {
    MultiContainerSortableList,
    useMultiContainerDroppable,
    useMultiContainerSortableItem,
} from "./multi-container-drag-and-drop";
import LessonListItem from "./lesson-list-item";
import { LessonSummary } from "./helpers";

function SortableLessonRow({
    lesson,
    sectionId,
    productId,
    disabled,
}: {
    lesson: LessonSummary;
    sectionId: string;
    productId: string;
    disabled: boolean;
}) {
    const { attributes, listeners, setNodeRef, isDragging, style } =
        useMultiContainerSortableItem({
            itemId: lesson.lessonId,
            disabled,
        });

    return (
        <LessonListItem
            lesson={lesson}
            sectionId={sectionId}
            productId={productId}
            disabled={disabled}
            isDragging={isDragging}
            attributes={attributes}
            listeners={listeners}
            setNodeRef={setNodeRef}
            style={style}
        />
    );
}

export default function SectionLessonList({
    sectionId,
    productId,
    lessons,
    disabled,
    insertionCueIndex,
}: {
    sectionId: string;
    productId: string;
    lessons: LessonSummary[];
    disabled: boolean;
    insertionCueIndex?: number | null;
}) {
    const { setNodeRef } = useMultiContainerDroppable({
        containerId: sectionId,
        disabled,
    });
    const safeInsertionCueIndex =
        typeof insertionCueIndex === "number"
            ? Math.min(Math.max(insertionCueIndex, 0), lessons.length)
            : null;

    const renderInsertionCue = () => (
        <div
            data-testid={`lesson-insertion-cue-${sectionId}`}
            className="h-2 w-full rounded-md border border-dashed border-primary/40 bg-primary/10"
        />
    );

    return (
        <div
            ref={setNodeRef}
            className="space-y-2"
            data-testid={`section-dropzone-${sectionId}`}
        >
            <MultiContainerSortableList
                containerId={sectionId}
                itemIds={lessons.map((lesson) => lesson.lessonId)}
            >
                {lessons.map((lesson, index) => (
                    <Fragment key={lesson.lessonId}>
                        {safeInsertionCueIndex === index
                            ? renderInsertionCue()
                            : null}
                        <SortableLessonRow
                            lesson={lesson}
                            sectionId={sectionId}
                            productId={productId}
                            disabled={disabled}
                        />
                    </Fragment>
                ))}
                {safeInsertionCueIndex === lessons.length
                    ? renderInsertionCue()
                    : null}
            </MultiContainerSortableList>
        </div>
    );
}
