"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import type { Instructor } from "@courselit/common-models";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    INSTRUCTORS_PICKER_MANAGE_LINK,
    INSTRUCTORS_PICKER_NONE_CREATED,
    INSTRUCTORS_PICKER_NONE_SELECTED,
    INSTRUCTORS_PICKER_PLACEHOLDER,
} from "@ui-config/strings";
import InstructorAvatar from "./instructor-avatar";

export type InstructorOption = Pick<
    Instructor,
    "instructorId" | "name" | "avatar"
>;

interface InstructorPickerProps {
    instructors: InstructorOption[];
    value: string[];
    onChange: (ids: string[]) => void;
    disabled?: boolean;
}

export default function InstructorPicker({
    instructors,
    value,
    onChange,
    disabled = false,
}: InstructorPickerProps) {
    if (!instructors.length) {
        return (
            <div className="text-sm text-muted-foreground">
                <p>{INSTRUCTORS_PICKER_NONE_CREATED}</p>
                <Link
                    href="/dashboard/instructors"
                    className="underline underline-offset-4"
                >
                    {INSTRUCTORS_PICKER_MANAGE_LINK}
                </Link>
            </div>
        );
    }

    const byId = new Map(instructors.map((item) => [item.instructorId, item]));
    const selected = value
        .map((id) => byId.get(id))
        .filter((item): item is InstructorOption => Boolean(item));
    const selectedIds = selected.map((item) => item.instructorId);
    const available = instructors.filter(
        (item) => !selectedIds.includes(item.instructorId),
    );

    const move = (index: number, offset: number) => {
        const next = [...selectedIds];
        const [moved] = next.splice(index, 1);
        next.splice(index + offset, 0, moved);
        onChange(next);
    };

    return (
        <div className="space-y-3">
            {selected.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    {INSTRUCTORS_PICKER_NONE_SELECTED}
                </p>
            )}
            <ul className="space-y-2">
                {selected.map((instructor, index) => (
                    <li
                        key={instructor.instructorId}
                        data-testid="selected-instructor"
                        className="flex items-center gap-3 rounded-md border p-2"
                    >
                        <InstructorAvatar
                            instructor={instructor}
                            className="h-8 w-8"
                        />
                        <span className="flex-1 truncate text-sm">
                            {instructor.name}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Move ${instructor.name} up`}
                            disabled={disabled || index === 0}
                            onClick={() => move(index, -1)}
                        >
                            <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Move ${instructor.name} down`}
                            disabled={disabled || index === selected.length - 1}
                            onClick={() => move(index, 1)}
                        >
                            <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${instructor.name}`}
                            disabled={disabled}
                            onClick={() =>
                                onChange(
                                    selectedIds.filter(
                                        (id) => id !== instructor.instructorId,
                                    ),
                                )
                            }
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </li>
                ))}
            </ul>
            {available.length > 0 && (
                <Select
                    value=""
                    disabled={disabled}
                    onValueChange={(id) => onChange([...selectedIds, id])}
                >
                    <SelectTrigger>
                        <SelectValue
                            placeholder={INSTRUCTORS_PICKER_PLACEHOLDER}
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {available.map((instructor) => (
                            <SelectItem
                                key={instructor.instructorId}
                                value={instructor.instructorId}
                            >
                                {instructor.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
    );
}
