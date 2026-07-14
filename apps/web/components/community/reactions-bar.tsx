"use client";

import { useState, useRef, useEffect } from "react";
import { CommunityReaction } from "@courselit/common-models";
import { SmilePlus, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "./emoji-picker";

interface ReactionsBarProps {
    reactions: CommunityReaction[];
    onReact: (emoji: string) => void;
    /**
     * Optional reply button rendered at the end of the bar (after reactions).
     */
    onReply?: () => void;
    /**
     * Whether to show the reply button. Defaults to false.
     */
    showReplyButton?: boolean;
    /**
     * Number of replies to show on the reply button (post only).
     */
    repliesCount?: number;
}

export function ReactionsBar({
    reactions,
    onReact,
    onReply,
    showReplyButton = false,
    repliesCount,
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

    const activeReactions = reactions.filter((r) => r.count > 0);
    const hoveredReaction = reactions.find((r) => r.emoji === hoveredEmoji);

    return (
        <>
            <div className="flex flex-wrap gap-1.5 items-center">
                {/* Active reaction pills — left of the emoji picker */}
                {activeReactions.map((reaction) => (
                    <button
                        key={reaction.emoji}
                        type="button"
                        className={`inline-flex h-8 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-full border px-2.5 text-sm transition-colors ${
                            reaction.hasReacted
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-accent"
                        }`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReact(reaction.emoji);
                        }}
                        onMouseEnter={(e) =>
                            handleMouseEnter(reaction.emoji, e)
                        }
                        onMouseLeave={handleMouseLeave}
                    >
                        <span className="leading-none text-base">
                            {reaction.emoji}
                        </span>
                        <span className="leading-none tabular-nums text-xs">
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        aria-label="Add reaction"
                    >
                        <SmilePlus className="h-4 w-4" />
                    </button>
                </EmojiPicker>

                {showReplyButton && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-8 px-2.5"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onReply?.();
                        }}
                    >
                        <Reply className="h-4 w-4 mr-1.5" />
                        {repliesCount !== undefined && (
                            <span className="text-sm tabular-nums">
                                {repliesCount}
                            </span>
                        )}
                    </Button>
                )}
            </div>

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
                    <div className="max-w-[200px]">
                        {hoveredReaction.reactors.length > 0
                            ? hoveredReaction.reactors
                                  .map((r) => r.name || r.userId)
                                  .join(", ")
                            : "..."}
                    </div>
                </div>
            )}
        </>
    );
}
