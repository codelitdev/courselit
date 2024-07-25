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
}: {
    id: number;
    Renderer: any;
    rendererProps: Record<string, unknown>;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: id });

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
                "flex flex-col text-black",
                isDragging && "opacity-50",
            )}
        >
            <div className="flex items-center gap-5">
                <button className="border" {...listeners}>
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
}: {
    items: any;
    onChange: any;
    Renderer: any;
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

    const findPositionOfItems = (id: number) =>
        data.findIndex((item: { id: number }) => item.id === id);

    const handleDragEnd = (event: { active: any; over: any }) => {
        const { active, over } = event;

        if (active.id === over.id) return;
        setData((data: any) => {
            const originalPos = findPositionOfItems(active.id);
            const newPos = findPositionOfItems(over.id);
            return arrayMove(data, originalPos, newPos);
        });
    };

    useEffect(() => {
        if (onChange) {
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
                    />
                ))}
            </SortableContext>
        </DndContext>
    );
};

export default DragAndDrop;
