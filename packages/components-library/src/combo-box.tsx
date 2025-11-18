"use client";

import { KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, PlusCircle, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ComboBoxProps {
    options: string[];
    selectedOptions: Set<string>;
    onChange: (options: string[]) => void;
    className?: string;
    placeholder?: string;
    createLabel?: (value: string) => string;
    emptyLabel?: string;
}

const MAX_BADGES_TO_SHOW = 3;

export default function ComboBox({
    options,
    selectedOptions,
    onChange,
    className,
    placeholder = "Select or create...",
    createLabel = (value) => `Create "${value}"`,
    emptyLabel = "No results found",
}: ComboBoxProps) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [internalOptions, setInternalOptions] = useState<string[]>(() => {
        return Array.from(new Set(options));
    });
    const [internalSelected, setInternalSelected] = useState<Set<string>>(
        () => new Set(selectedOptions),
    );

    useEffect(() => {
        setInternalSelected(new Set(selectedOptions));
    }, [selectedOptions]);

    useEffect(() => {
        setInternalOptions((prev) => {
            const merged = new Set(prev);
            for (const option of options) {
                merged.add(option);
            }
            return Array.from(merged);
        });
    }, [options]);

    useEffect(() => {
        if (!open) {
            setSearchValue("");
        }
    }, [open]);

    const normalizedSearch = searchValue.trim().toLowerCase();

    const filteredOptions = useMemo(() => {
        if (!normalizedSearch) {
            return internalOptions;
        }
        return internalOptions.filter((option) =>
            option.toLowerCase().includes(normalizedSearch),
        );
    }, [internalOptions, normalizedSearch]);

    const existingValuesLower = useMemo(() => {
        return new Set(internalOptions.map((option) => option.toLowerCase()));
    }, [internalOptions]);

    const canCreateNewOption =
        normalizedSearch.length > 0 &&
        !existingValuesLower.has(normalizedSearch);

    const selectedArray = useMemo(() => {
        return Array.from(internalSelected).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
        );
    }, [internalSelected]);

    const handleToggleOption = (value: string) => {
        setInternalOptions((prev) =>
            prev.includes(value) ? prev : [...prev, value],
        );

        setInternalSelected((prev) => {
            const next = new Set(prev);
            if (next.has(value)) {
                next.delete(value);
            } else {
                next.add(value);
            }
            onChange(Array.from(next));
            return next;
        });
    };

    const handleCreateOption = () => {
        const trimmed = searchValue.trim();
        if (!trimmed) {
            return;
        }
        setInternalOptions((prev) =>
            prev.includes(trimmed) ? prev : [...prev, trimmed],
        );
        setInternalSelected((prev) => {
            const next = new Set(prev).add(trimmed);
            onChange(Array.from(next));
            return next;
        });
        setSearchValue("");
    };

    const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" && canCreateNewOption) {
            event.preventDefault();
            handleCreateOption();
        }
    };

    const handleRemoveOption = (value: string) => {
        setInternalSelected((prev) => {
            if (!prev.has(value)) {
                return prev;
            }
            const next = new Set(prev);
            next.delete(value);
            onChange(Array.from(next));
            return next;
        });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between gap-2",
                        "min-h-[42px] h-auto flex-wrap",
                        className,
                    )}
                >
                    <div className="flex flex-1 flex-wrap items-center gap-1 text-left">
                        {selectedArray.length === 0 ? (
                            <span className="text-muted-foreground">
                                {placeholder}
                            </span>
                        ) : (
                            <>
                                {selectedArray
                                    .slice(0, MAX_BADGES_TO_SHOW)
                                    .map((option) => (
                                        <Badge
                                            key={option}
                                            variant="secondary"
                                            className="flex items-center gap-1 text-xs"
                                        >
                                            {option}
                                            <button
                                                type="button"
                                                className="rounded-sm p-0.5 transition hover:bg-muted"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleRemoveOption(option);
                                                }}
                                                aria-label={`Remove ${option}`}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                {selectedArray.length > MAX_BADGES_TO_SHOW && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        +
                                        {selectedArray.length -
                                            MAX_BADGES_TO_SHOW}
                                    </Badge>
                                )}
                            </>
                        )}
                    </div>
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 shrink-0 opacity-50 transition-transform",
                            open && "rotate-180",
                        )}
                    />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        onKeyDown={handleInputKeyDown}
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                                <span>{emptyLabel}</span>
                                {canCreateNewOption && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        className="gap-2"
                                        onClick={handleCreateOption}
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                        {createLabel(searchValue.trim())}
                                    </Button>
                                )}
                            </div>
                        </CommandEmpty>
                        <CommandGroup heading="Options">
                            {filteredOptions.map((option) => {
                                const isSelected = internalSelected.has(option);
                                return (
                                    <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={(currentValue) => {
                                            handleToggleOption(currentValue);
                                        }}
                                    >
                                        <div className="mr-2 flex h-4 w-4 items-center justify-center">
                                            <Check
                                                className={cn(
                                                    "h-4 w-4",
                                                    isSelected
                                                        ? "opacity-100"
                                                        : "opacity-0",
                                                )}
                                            />
                                        </div>
                                        <span className="flex-1 text-sm">
                                            {option}
                                        </span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {canCreateNewOption && filteredOptions.length > 0 && (
                            <div className="border-t border-border p-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full justify-start gap-2 px-2 text-sm"
                                    onClick={handleCreateOption}
                                >
                                    <PlusCircle className="h-4 w-4" />
                                    {createLabel(searchValue.trim())}
                                </Button>
                            </div>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
