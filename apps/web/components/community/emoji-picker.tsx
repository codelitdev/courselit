"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

const COMMON_EMOJIS = ["👍", "❤️", "😄", "🎉", "😢", "😮"];

interface EmojiPickerProps {
    onEmojiSelect: (emoji: string) => void;
    children?: React.ReactNode;
}

export function EmojiPicker({ onEmojiSelect, children }: EmojiPickerProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children || (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                    >
                        +
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent align="start" side="top" className="w-auto p-2">
                <div className="flex gap-1">
                    {COMMON_EMOJIS.map((emoji) => (
                        <button
                            key={emoji}
                            type="button"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
                            onClick={() => {
                                onEmojiSelect(emoji);
                                setOpen(false);
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
