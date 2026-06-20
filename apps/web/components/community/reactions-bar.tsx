"use client";

import { useState, useRef, useEffect } from "react";
import { CommunityReaction } from "@courselit/common-models";
import { EmojiPicker } from "./emoji-picker";

interface ReactionsBarProps {
    reactions: CommunityReaction[];
    onReact: (emoji: string) => void;
    /**
     * Optional flag to show reactions in a compact layout (for comments/replies).
     * Defaults to false (full layout for post cards).
     */
    compact?: boolean;
}

export function ReactionsBar({
    reactions,
    onReact,
    compact = false,
}: ReactionsBarProps) {
    const [hoveredEmoji, setHoveredEmoji] = useState<string | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{
        top: number;
        left: number;
    } | null>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = (
        emoji: string,
        e: React.MouseEvent<HTMLButtonElement>,
    ) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({
            top: rect.top - 8,
            left: rect.left + rect.width / 2,
        });
        setHoveredEmoji(emoji);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setHoveredEmoji(null);
            setTooltipPos(null);
        }, 200);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const hoveredReaction = reactions.find((r) => r.emoji === hoveredEmoji);

    return (
        <div className="flex items-center gap-1">
            {reactions
                .filter((r) => r.count > 0)
                .map((reaction) => (
                    <button
                        key={reaction.emoji}
                        type="button"
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                            reaction.hasReacted
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-accent"
                        } ${compact ? "text-[10px] px-1.5 py-0" : ""}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onReact(reaction.emoji);
                        }}
                        onMouseEnter={(e) =>
                            handleMouseEnter(reaction.emoji, e)
                        }
                        onMouseLeave={handleMouseLeave}
                    >
                        <span className="leading-none">{reaction.emoji}</span>
                        <span className="leading-none tabular-nums">
                            {reaction.count}
                        </span>
                    </button>
                ))}
            <EmojiPicker
                onEmojiSelect={(emoji) => {
                    onReact(emoji);
                }}
            >
                <button
                    type="button"
                    className={`inline-flex items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent ${
                        compact ? "h-5 w-5 text-xs" : "h-6 w-6 text-sm"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                >
                    +
                </button>
            </EmojiPicker>
            {hoveredReaction && hoveredEmoji && tooltipPos && (
                <div
                    ref={tooltipRef}
                    className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md"
                    style={{
                        top: tooltipPos.top,
                        left: tooltipPos.left,
                    }}
                    onMouseEnter={() => {
                        if (timeoutRef.current) {
                            clearTimeout(timeoutRef.current);
                        }
                    }}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className="font-medium">{hoveredEmoji}</div>
                    <div className="mt-0.5 max-w-[200px]">
                        {hoveredReaction.reactors.length > 0
                            ? hoveredReaction.reactors
                                  .map((r) => r.name || r.userId)
                                  .join(", ")
                            : "..."}
                    </div>
                </div>
            )}
        </div>
    );
}
