"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Group } from "@courselit/common-models";
import { useToast } from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import ContentSectionCard from "./content-section-card";
import {
    MultiContainerDragAndDrop,
    MultiContainerMoveEvent,
    MultiContainerSnapshot,
} from "./multi-container-drag-and-drop";
import {
    applyLessonMove,
    buildLessonMap,
    LessonMap,
    LessonSummary,
    sortLessonsForSection,
} from "./helpers";

const arrayMove = <T,>(items: T[], oldIndex: number, newIndex: number): T[] => {
    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    if (!moved) {
        return items;
    }
    next.splice(newIndex, 0, moved);
    return next;
};

const findLessonLocation = (
    map: LessonMap,
    lessonId: string,
): { sectionId: string; index: number } | null => {
    for (const [sectionId, sectionLessons] of Object.entries(map)) {
        const index = sectionLessons.findIndex(
            (lesson) => lesson.lessonId === lessonId,
        );
        if (index !== -1) {
            return {
                sectionId,
                index,
            };
        }
    }

    return null;
};

const normalizeDestinationIndex = ({
    map,
    sourceSectionId,
    destinationSectionId,
    destinationIndex,
}: {
    map: LessonMap;
    sourceSectionId: string;
    destinationSectionId: string;
    destinationIndex: number;
}) => {
    const sourceLessons = map[sourceSectionId] ?? [];
    const destinationLessons = map[destinationSectionId] ?? [];
    const maxIndex =
        sourceSectionId === destinationSectionId
            ? Math.max(sourceLessons.length - 1, 0)
            : destinationLessons.length;

    return Math.min(Math.max(destinationIndex, 0), maxIndex);
};

export default function ContentSectionsBoard({
    orderedSections,
    setOrderedSections,
    lessons,
    courseId,
    productId,
    productType,
    address,
    onRequestDelete,
}: {
    orderedSections: Group[];
    setOrderedSections: React.Dispatch<React.SetStateAction<Group[]>>;
    lessons: LessonSummary[];
    courseId: string;
    productId: string;
    productType?: string;
    address: string;
    onRequestDelete: (item: { id: string; title: string }) => void;
}) {
    const { toast } = useToast();
    const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
    const [sectionMenuOpenId, setSectionMenuOpenId] = useState<string | null>(
        null,
    );
    const [isReordering, setIsReordering] = useState(false);
    const [isMovingLesson, setIsMovingLesson] = useState(false);
    const [lessonMap, setLessonMap] = useState<LessonMap>({});
    const [activeLessonDrag, setActiveLessonDrag] = useState<{
        lessonId: string;
        sourceSectionId: string;
    } | null>(null);
    const [focusedSectionId, setFocusedSectionId] = useState<string | null>(
        null,
    );
    const [recentlyMovedSectionId, setRecentlyMovedSectionId] = useState<
        string | null
    >(null);
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [lessonHoverPreview, setLessonHoverPreview] = useState<{
        lessonId: string;
        destinationSectionId: string;
        destinationIndex: number;
    } | null>(null);

    useEffect(() => {
        setLessonMap(buildLessonMap(orderedSections, lessons));
    }, [lessons]);

    useEffect(() => {
        setLessonMap((current) => {
            const next = orderedSections.reduce((acc, section) => {
                acc[section.id] =
                    current[section.id] ??
                    sortLessonsForSection(lessons, section);
                return acc;
            }, {} as LessonMap);

            return next;
        });
    }, [orderedSections, lessons]);

    useEffect(() => {
        if (!focusedSectionId) {
            return;
        }

        const sectionNode = sectionRefs.current[focusedSectionId];
        if (!sectionNode) {
            return;
        }

        requestAnimationFrame(() => {
            if (typeof sectionNode.scrollIntoView === "function") {
                sectionNode.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        });
        setFocusedSectionId(null);
    }, [focusedSectionId, orderedSections]);

    useEffect(() => {
        if (!recentlyMovedSectionId) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setRecentlyMovedSectionId(null);
        }, 900);

        return () => window.clearTimeout(timerId);
    }, [recentlyMovedSectionId]);

    const disabled = isReordering || isMovingLesson;
    const sectionMoveDisabled = disabled || !!activeLessonDrag;

    const toggleSectionCollapse = (sectionId: string) => {
        setCollapsedSections((prev) =>
            prev.includes(sectionId)
                ? prev.filter((id) => id !== sectionId)
                : [...prev, sectionId],
        );
    };

    const reorderGroups = async (
        groupIds: string[],
        fallbackSections: Group[],
    ) => {
        const mutation = `
            mutation ReorderGroups($courseId: String!, $groupIds: [String!]!) {
                course: reorderGroups(courseId: $courseId, groupIds: $groupIds) {
                    courseId
                    groups {
                        id
                        rank
                    }
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    courseId,
                    groupIds,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        setIsReordering(true);
        try {
            await fetch.exec();
        } catch (err: any) {
            setOrderedSections(fallbackSections);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsReordering(false);
        }
    };

    const moveLesson = async ({
        lessonId,
        destinationGroupId,
        destinationIndex,
        rollbackSnapshot,
    }: {
        lessonId: string;
        destinationGroupId: string;
        destinationIndex: number;
        rollbackSnapshot: LessonMap;
    }) => {
        const mutation = `
            mutation MoveLesson(
                $courseId: String!,
                $lessonId: String!,
                $destinationGroupId: String!,
                $destinationIndex: Int!
            ) {
                course: moveLesson(
                    courseId: $courseId,
                    lessonId: $lessonId,
                    destinationGroupId: $destinationGroupId,
                    destinationIndex: $destinationIndex
                ) {
                    courseId
                }
            }
        `;

        const fetch = new FetchBuilder()
            .setUrl(`${address}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    courseId,
                    lessonId,
                    destinationGroupId,
                    destinationIndex,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        setIsMovingLesson(true);
        try {
            await fetch.exec();
        } catch (err: any) {
            setLessonMap(rollbackSnapshot);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsMovingLesson(false);
            setActiveLessonDrag(null);
            setLessonHoverPreview(null);
        }
    };

    const handleLessonOver = ({
        itemId,
        destinationContainerId,
        destinationIndex,
    }: MultiContainerMoveEvent) => {
        if (
            disabled ||
            !activeLessonDrag ||
            activeLessonDrag.lessonId !== itemId
        ) {
            return;
        }

        if (activeLessonDrag.sourceSectionId === destinationContainerId) {
            setLessonHoverPreview((prev) => (prev ? null : prev));
            return;
        }

        const destinationLessons = lessonMap[destinationContainerId] ?? [];
        const safeDestinationIndex = Math.min(
            Math.max(destinationIndex, 0),
            destinationLessons.length,
        );

        setLessonHoverPreview((prev) => {
            if (
                prev &&
                prev.lessonId === itemId &&
                prev.destinationSectionId === destinationContainerId &&
                prev.destinationIndex === safeDestinationIndex
            ) {
                return prev;
            }

            return {
                lessonId: itemId,
                destinationSectionId: destinationContainerId,
                destinationIndex: safeDestinationIndex,
            };
        });
    };

    const handleLessonMove = ({
        itemId,
        sourceContainerId,
        sourceIndex,
        destinationContainerId,
        destinationIndex,
    }: MultiContainerMoveEvent) => {
        if (disabled) {
            return;
        }

        setLessonHoverPreview(null);
        const currentLocation = findLessonLocation(lessonMap, itemId) ?? {
            sectionId: sourceContainerId,
            index: sourceIndex,
        };
        const safeDestinationIndex = normalizeDestinationIndex({
            map: lessonMap,
            sourceSectionId: currentLocation.sectionId,
            destinationSectionId: destinationContainerId,
            destinationIndex,
        });

        if (
            currentLocation.sectionId === destinationContainerId &&
            currentLocation.index === safeDestinationIndex
        ) {
            return;
        }

        const rollbackSnapshot = lessonMap;
        setLessonMap((current) => {
            const currentLocation = findLessonLocation(current, itemId);
            if (!currentLocation) {
                return current;
            }

            return applyLessonMove({
                current,
                lessonId: itemId,
                sourceSectionId: currentLocation.sectionId,
                destinationSectionId: destinationContainerId,
                destinationIndex: safeDestinationIndex,
            });
        });

        moveLesson({
            lessonId: itemId,
            destinationGroupId: destinationContainerId,
            destinationIndex: safeDestinationIndex,
            rollbackSnapshot,
        });
    };

    const moveSection = (sectionId: string, offset: number) => {
        if (sectionMoveDisabled) {
            return;
        }

        const sourceIndex = orderedSections.findIndex(
            (section) => section.id === sectionId,
        );
        if (sourceIndex < 0) {
            return;
        }

        const destinationIndex = sourceIndex + offset;
        if (
            destinationIndex < 0 ||
            destinationIndex >= orderedSections.length
        ) {
            return;
        }

        const fallbackSections = [...orderedSections];
        const nextSections = arrayMove(
            orderedSections,
            sourceIndex,
            destinationIndex,
        );
        setOrderedSections(nextSections);
        setFocusedSectionId(sectionId);
        setRecentlyMovedSectionId(sectionId);
        reorderGroups(
            nextSections.map((section) => section.id),
            fallbackSections,
        );
    };

    const lessonContainers = useMemo<MultiContainerSnapshot[]>(
        () =>
            orderedSections.map((section) => ({
                containerId: section.id,
                itemIds: (lessonMap[section.id] ?? []).map(
                    (lesson) => lesson.lessonId,
                ),
            })),
        [orderedSections, lessonMap],
    );

    const lessonLookup = useMemo(() => {
        const map = new Map<string, LessonSummary>();
        lessons.forEach((lesson) => {
            map.set(lesson.lessonId, lesson);
        });
        return map;
    }, [lessons]);

    return (
        <MultiContainerDragAndDrop
            containers={lessonContainers}
            disabled={disabled}
            onOver={handleLessonOver}
            onMove={handleLessonMove}
            onDragStateChange={(drag) => {
                if (drag) {
                    setLessonHoverPreview(null);
                    setActiveLessonDrag({
                        lessonId: drag.itemId,
                        sourceSectionId: drag.sourceContainerId,
                    });
                    return;
                }

                setActiveLessonDrag(null);
                setLessonHoverPreview(null);
            }}
            renderDragOverlay={(itemId) => {
                const item = lessonLookup.get(itemId);
                if (!item) {
                    return null;
                }

                return (
                    <div className="flex items-center justify-between py-2 px-3 rounded-md border border-border bg-card text-card-foreground shadow-lg min-w-52">
                        <span className="text-sm font-medium">
                            {item.title}
                        </span>
                    </div>
                );
            }}
        >
            {orderedSections.map((section, index) => {
                const lessonInsertionCueIndex =
                    lessonHoverPreview &&
                    activeLessonDrag &&
                    lessonHoverPreview.lessonId === activeLessonDrag.lessonId &&
                    lessonHoverPreview.destinationSectionId === section.id &&
                    activeLessonDrag.sourceSectionId !== section.id
                        ? lessonHoverPreview.destinationIndex
                        : null;

                return (
                    <div
                        key={section.id}
                        ref={(node) => {
                            sectionRefs.current[section.id] = node;
                        }}
                        className={`scroll-mt-24 rounded-md transition-colors duration-300 ${
                            recentlyMovedSectionId === section.id
                                ? "bg-primary/10 ring-1 ring-primary/40 motion-safe:animate-pulse"
                                : ""
                        }`}
                    >
                        <ContentSectionCard
                            section={section}
                            lessons={lessonMap[section.id] ?? []}
                            lessonInsertionCueIndex={lessonInsertionCueIndex}
                            collapsed={collapsedSections.includes(section.id)}
                            sectionMenuOpenId={sectionMenuOpenId}
                            productId={productId}
                            productType={productType}
                            totalGroups={orderedSections.length}
                            lessonDragDisabled={disabled}
                            canMoveUp={index > 0}
                            canMoveDown={index < orderedSections.length - 1}
                            sectionMoveDisabled={sectionMoveDisabled}
                            onMoveUp={() => moveSection(section.id, -1)}
                            onMoveDown={() => moveSection(section.id, 1)}
                            onSectionMenuOpenChange={setSectionMenuOpenId}
                            onToggleCollapse={toggleSectionCollapse}
                            onRequestDelete={(item) => {
                                setSectionMenuOpenId(null);
                                onRequestDelete(item);
                            }}
                        />
                    </div>
                );
            })}
        </MultiContainerDragAndDrop>
    );
}
