"use client";

import { ChangeEvent, useState, useEffect, useRef } from "react";
import { Cross, Add, ExpandMore } from "@courselit/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ScrollArea from "./scrollarea";
import { cn } from "@/lib/utils";

interface ComboBoxProps {
    options: string[];
    selectedOptions: Set<string>;
    onChange: (options: string[]) => void;
    className?: string;
    side?: "left" | "right" | "top" | "bottom";
    placeholder?: string;
}

export default function ComboBox({
    options,
    selectedOptions,
    onChange,
    className,
    side = "top",
    placeholder = "Select an option or create one",
}: ComboBoxProps) {
    const [internalOptions, setInternalOptions] = useState(options);
    const [internalSelectedOptions, setInternalSelectedOptions] =
        useState<Set<string>>(selectedOptions);
    const [text, setText] = useState("");
    const [internalOpen, setInternalOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const setInputRef = (node: HTMLInputElement | null) => {
        inputRef.current = node;
        // Focus immediately when the input is mounted and dropdown is open
        if (node && internalOpen) {
            setTimeout(() => node.focus(), 0);
        }
    };

    // Sync internal state with prop changes
    useEffect(() => {
        setInternalSelectedOptions(selectedOptions);
    }, [selectedOptions]);

    useEffect(() => {
        setInternalOptions(options);
    }, [options]);

    // Reset highlighted index when text changes
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [text]);

    // Focus input when dropdown opens
    useEffect(() => {
        if (internalOpen && inputRef.current) {
            // Use setTimeout to ensure the dropdown is fully rendered before focusing
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        }
    }, [internalOpen]);

    const onOptionAdd = () => {
        if (!text.trim()) return;

        internalSelectedOptions.add(text);
        const selectedOptions = new Set(internalSelectedOptions);
        setInternalSelectedOptions(selectedOptions);
        onChange(Array.from(selectedOptions));
        if (!internalOptions.includes(text)) {
            setInternalOptions([...internalOptions, text]);
        }
        setText("");
    };

    const onOptionRemove = (option: string) => {
        internalSelectedOptions.delete(option);
        const selectedOptions = new Set(internalSelectedOptions);
        setInternalSelectedOptions(selectedOptions);
        onChange(Array.from(selectedOptions));
    };

    const onOptionSelect = (option: string) => {
        internalSelectedOptions.add(option);
        const selectedOptions = new Set(internalSelectedOptions);
        setInternalSelectedOptions(selectedOptions);
        onChange(Array.from(selectedOptions));
    };

    const filteredOptions = internalOptions.filter((option) =>
        option.toLowerCase().includes(text.toLowerCase()),
    );

    const canCreateNew = text.trim() && !internalOptions.includes(text);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (canCreateNew) {
                onOptionAdd();
            } else if (
                highlightedIndex >= 0 &&
                highlightedIndex < filteredOptions.length
            ) {
                onOptionSelect(filteredOptions[highlightedIndex]);
            } else if (filteredOptions.length === 1) {
                onOptionSelect(filteredOptions[0]);
            }
        } else if (e.key === "Escape") {
            setInternalOpen(false);
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev < filteredOptions.length - 1 ? prev + 1 : 0,
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : filteredOptions.length - 1,
            );
        }
    };

    return (
        <div className="relative w-full">
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={internalOpen}
                className={cn(
                    "w-full justify-between min-h-[40px] h-auto p-2 text-left font-normal",
                    "bg-background border-input hover:bg-accent hover:text-accent-foreground",
                    "focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    className,
                )}
                onClick={() => {
                    setInternalOpen(!internalOpen);
                    // Ensure focus goes to our input after opening
                    if (!internalOpen) {
                        setTimeout(() => {
                            inputRef.current?.focus();
                        }, 10);
                    }
                }}
            >
                <div className="flex flex-wrap gap-1 flex-1">
                    {internalSelectedOptions.size > 0 ||
                    selectedOptions.size > 0 ? (
                        Array.from(
                            internalSelectedOptions.size > 0
                                ? internalSelectedOptions
                                : selectedOptions,
                        ).map((option) => (
                            <Badge
                                key={option}
                                variant="secondary"
                                className="text-xs"
                            >
                                {option}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOptionRemove(option);
                                    }}
                                >
                                    <Cross className="h-3 w-3" />
                                </Button>
                            </Badge>
                        ))
                    ) : (
                        <span className="text-muted-foreground">
                            {placeholder}
                        </span>
                    )}
                </div>
                <ExpandMore className="h-4 w-4 opacity-50" />
            </Button>

            {internalOpen && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md">
                    <div className="p-3">
                        <div className="flex gap-2">
                            <Input
                                ref={setInputRef}
                                placeholder="Search or create..."
                                value={text}
                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                    setText(e.target.value)
                                }
                                onKeyDown={handleKeyDown}
                                className="flex-1"
                            />
                            {canCreateNew && (
                                <Button
                                    size="sm"
                                    onClick={onOptionAdd}
                                    className="px-3"
                                >
                                    <Add className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <ScrollArea>
                        <div className="p-1">
                            {filteredOptions.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredOptions.map((option, index) => (
                                        <Button
                                            key={option}
                                            variant="ghost"
                                            className={cn(
                                                "w-full justify-start h-8 px-2 text-sm",
                                                index === highlightedIndex &&
                                                    "bg-accent text-accent-foreground",
                                            )}
                                            onClick={() =>
                                                onOptionSelect(option)
                                            }
                                            disabled={internalSelectedOptions.has(
                                                option,
                                            )}
                                        >
                                            {option}
                                            {internalSelectedOptions.has(
                                                option,
                                            ) && (
                                                <Badge
                                                    variant="secondary"
                                                    className="ml-auto text-xs"
                                                >
                                                    Selected
                                                </Badge>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-3 text-center text-sm text-muted-foreground">
                                    No options found
                                </div>
                            )}
                            {canCreateNew && (
                                <div className="border-t pt-2 mt-2">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start h-8 px-2 text-sm"
                                        onClick={onOptionAdd}
                                    >
                                        <Add className="h-4 w-4 mr-2" />
                                        Create &quot;{text}&quot;
                                    </Button>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}
