"use client";

import React, { useEffect } from "react";
import { useState } from "react";
import { DragHandle } from "@courselit/icons";
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    closestCorners,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { useSortable } from "@dnd-kit/sortable";
import clsx from "clsx";
import { CSS } from "@dnd-kit/utilities";

export function SortableItem({
    id,
    Renderer,
    rendererProps,
    disabled = false,
}: {
    id: number | string;
    Renderer: any;
    rendererProps: Record<string, unknown>;
    disabled?: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: id, disabled });

    const style = {
        transition,
        transform: CSS.Transform.toString(transform),
    };

    return (
        <div
            {...attributes}
            ref={setNodeRef}
            style={style}
            className={clsx(
                "flex flex-col text-foreground",
                isDragging && "opacity-50",
            )}
        >
            <div className="flex items-center gap-5">
                <button
                    data-testid="drag-handle"
                    className="border border-border text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded transition-colors"
                    disabled={disabled}
                    {...(disabled ? {} : listeners)}
                >
                    <DragHandle />
                </button>
                <Renderer {...rendererProps} />
            </div>
        </div>
    );
}

const DragAndDrop = ({
    items,
    onChange,
    Renderer,
    disabled = false,
}: {
    items: any;
    onChange: any;
    Renderer: any;
    disabled?: boolean;
}) => {
    const [data, setData] = useState(items);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(MouseSensor, {
            // Require the mouse to move by 10 pixels before activating
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor, {
            // Press delay of 250ms, with tolerance of 5px of movement
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
    );

    const findPositionOfItems = (id: number | string) =>
        data.findIndex((item: { id: number | string }) => item.id === id);

    const handleDragEnd = (event: { active: any; over: any }) => {
        if (disabled) {
            return;
        }
        const { active, over } = event;

        if (!over) return;
        if (active.id === over.id) return;
        setData((data: any) => {
            const originalPos = findPositionOfItems(active.id);
            const newPos = findPositionOfItems(over.id);
            return arrayMove(data, originalPos, newPos);
        });
    };

    useEffect(() => {
        if (onChange && JSON.stringify(data) !== JSON.stringify(items)) {
            onChange(data);
        }
    }, [data]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={data.map((item: { id: any }) => item.id)}
                strategy={verticalListSortingStrategy}
            >
                {data.map((item: any) => (
                    <SortableItem
                        key={item.id}
                        id={item.id}
                        rendererProps={item}
                        Renderer={Renderer}
                        disabled={disabled}
                    />
                ))}
            </SortableContext>
        </DndContext>
    );
};

export default DragAndDrop;
