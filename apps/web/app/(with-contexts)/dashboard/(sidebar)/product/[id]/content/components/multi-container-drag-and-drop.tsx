"use client";

import {
    closestCorners,
    DndContext,
    DragEndEvent,
    DragOverEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CSSProperties, ReactNode, useMemo, useRef, useState } from "react";

const ITEM_PREFIX = "mcdnd:item:";
const CONTAINER_PREFIX = "mcdnd:container:";

const getItemDndId = (itemId: string) => `${ITEM_PREFIX}${itemId}`;
const getContainerDndId = (containerId: string) =>
    `${CONTAINER_PREFIX}${containerId}`;

const parseItemDndId = (value: string | number | null): string | null =>
    typeof value === "string" && value.startsWith(ITEM_PREFIX)
        ? value.slice(ITEM_PREFIX.length)
        : null;

const parseContainerDndId = (value: string | number | null): string | null =>
    typeof value === "string" && value.startsWith(CONTAINER_PREFIX)
        ? value.slice(CONTAINER_PREFIX.length)
        : null;

export type MultiContainerSnapshot = {
    containerId: string;
    itemIds: string[];
};

export type MultiContainerMoveEvent = {
    itemId: string;
    sourceContainerId: string;
    sourceIndex: number;
    destinationContainerId: string;
    destinationIndex: number;
};

const findItemLocation = (
    containers: MultiContainerSnapshot[],
    itemId: string,
): { containerId: string; index: number } | null => {
    for (const container of containers) {
        const index = container.itemIds.indexOf(itemId);
        if (index !== -1) {
            return {
                containerId: container.containerId,
                index,
            };
        }
    }

    return null;
};

export function MultiContainerDragAndDrop({
    containers,
    disabled = false,
    onMove,
    onOver,
    onDragStateChange,
    renderDragOverlay,
    children,
}: {
    containers: MultiContainerSnapshot[];
    disabled?: boolean;
    onMove: (event: MultiContainerMoveEvent) => void;
    onOver?: (event: MultiContainerMoveEvent) => void;
    onDragStateChange?: (
        drag: {
            itemId: string;
            sourceContainerId: string;
        } | null,
    ) => void;
    renderDragOverlay?: (itemId: string) => ReactNode;
    children: ReactNode;
}) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const dragStartLocationRef = useRef<{
        containerId: string;
        index: number;
    } | null>(null);

    const containerLookup = useMemo(() => {
        const map = new Map<string, { containerId: string; index: number }>();
        for (const container of containers) {
            container.itemIds.forEach((itemId, index) => {
                map.set(itemId, { containerId: container.containerId, index });
            });
        }
        return map;
    }, [containers]);

    const handleDragStart = (event: DragStartEvent) => {
        if (disabled) {
            return;
        }

        const itemId = parseItemDndId(event.active.id);
        if (!itemId) {
            return;
        }

        const location = containerLookup.get(itemId);
        if (!location) {
            return;
        }

        setActiveItemId(itemId);
        dragStartLocationRef.current = {
            containerId: location.containerId,
            index: location.index,
        };
        onDragStateChange?.({
            itemId,
            sourceContainerId: location.containerId,
        });
    };

    const clearDragState = () => {
        setActiveItemId(null);
        dragStartLocationRef.current = null;
        onDragStateChange?.(null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const draggedItemId = parseItemDndId(event.active.id);
        if (!draggedItemId || !event.over) {
            clearDragState();
            return;
        }

        const source = findItemLocation(containers, draggedItemId);
        const effectiveSource = dragStartLocationRef.current ?? source;
        if (!effectiveSource) {
            clearDragState();
            return;
        }

        const overItemId = parseItemDndId(event.over.id);
        if (overItemId) {
            const destination = findItemLocation(containers, overItemId);
            if (!destination) {
                clearDragState();
                return;
            }

            if (
                effectiveSource.containerId !== destination.containerId ||
                effectiveSource.index !== destination.index
            ) {
                onMove({
                    itemId: draggedItemId,
                    sourceContainerId: effectiveSource.containerId,
                    sourceIndex: effectiveSource.index,
                    destinationContainerId: destination.containerId,
                    destinationIndex: destination.index,
                });
            }

            clearDragState();
            return;
        }

        const overContainerId = parseContainerDndId(event.over.id);
        if (!overContainerId) {
            clearDragState();
            return;
        }

        const destinationContainer = containers.find(
            (container) => container.containerId === overContainerId,
        );
        if (!destinationContainer) {
            clearDragState();
            return;
        }

        const destinationIndex = destinationContainer.itemIds.length;
        if (
            effectiveSource.containerId !== overContainerId ||
            effectiveSource.index !== destinationIndex
        ) {
            onMove({
                itemId: draggedItemId,
                sourceContainerId: effectiveSource.containerId,
                sourceIndex: effectiveSource.index,
                destinationContainerId: overContainerId,
                destinationIndex,
            });
        }

        clearDragState();
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (!onOver) {
            return;
        }

        const draggedItemId = parseItemDndId(event.active.id);
        if (!draggedItemId || !event.over) {
            return;
        }

        const source = findItemLocation(containers, draggedItemId);
        if (!source) {
            return;
        }

        const overItemId = parseItemDndId(event.over.id);
        if (overItemId) {
            const destination = findItemLocation(containers, overItemId);
            if (!destination) {
                return;
            }

            if (
                source.containerId !== destination.containerId ||
                source.index !== destination.index
            ) {
                onOver({
                    itemId: draggedItemId,
                    sourceContainerId: source.containerId,
                    sourceIndex: source.index,
                    destinationContainerId: destination.containerId,
                    destinationIndex: destination.index,
                });
            }

            return;
        }

        const overContainerId = parseContainerDndId(event.over.id);
        if (!overContainerId) {
            return;
        }

        const destinationContainer = containers.find(
            (container) => container.containerId === overContainerId,
        );
        if (!destinationContainer) {
            return;
        }

        const destinationIndex = destinationContainer.itemIds.length;
        if (
            source.containerId !== overContainerId ||
            source.index !== destinationIndex
        ) {
            onOver({
                itemId: draggedItemId,
                sourceContainerId: source.containerId,
                sourceIndex: source.index,
                destinationContainerId: overContainerId,
                destinationIndex,
            });
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={clearDragState}
        >
            {children}
            <DragOverlay dropAnimation={null}>
                {activeItemId && renderDragOverlay
                    ? renderDragOverlay(activeItemId)
                    : null}
            </DragOverlay>
        </DndContext>
    );
}

export function MultiContainerSortableList({
    containerId,
    itemIds,
    children,
}: {
    containerId: string;
    itemIds: string[];
    children: ReactNode;
}) {
    return (
        <SortableContext
            id={getContainerDndId(containerId)}
            items={itemIds.map((itemId) => getItemDndId(itemId))}
            strategy={verticalListSortingStrategy}
        >
            {children}
        </SortableContext>
    );
}

export function useMultiContainerDroppable({
    containerId,
    disabled,
}: {
    containerId: string;
    disabled?: boolean;
}) {
    return useDroppable({
        id: getContainerDndId(containerId),
        disabled,
    });
}

export function useMultiContainerSortableItem({
    itemId,
    disabled,
}: {
    itemId: string;
    disabled?: boolean;
}): {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
    setNodeRef: ReturnType<typeof useSortable>["setNodeRef"];
    isDragging: boolean;
    style: CSSProperties;
} {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: getItemDndId(itemId),
        disabled,
    });

    return {
        attributes,
        listeners,
        setNodeRef,
        isDragging,
        style: {
            transform: CSS.Transform.toString(transform),
            transition,
        },
    };
}
