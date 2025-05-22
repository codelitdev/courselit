import React, { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/shadcn-utils";

interface ThemeCardProps {
    name: string;
    palette: string[];
    active?: boolean; // server active
    selected?: boolean; // local preview highlight
    onUse?: (e?: React.MouseEvent) => void;
    showUseButton?: boolean;
    className?: string;
    onClick?: () => void;
}

export const ThemeCard = forwardRef<HTMLDivElement, ThemeCardProps>(
    (
        {
            name,
            palette,
            active = false,
            selected = false,
            onUse,
            showUseButton = true,
            className = "",
            onClick,
        },
        ref,
    ) => {
        return (
            <Card
                ref={ref}
                className={cn(
                    "w-full px-0 py-0 transition-colors group bg-background flex flex-col cursor-pointer",
                    selected
                        ? "border-2 border-primary shadow-md"
                        : "border border-muted shadow-none hover:bg-muted",
                    className,
                )}
                onClick={onClick}
            >
                <CardContent className="pb-2 pt-2 px-2">
                    <div className="flex items-center justify-between min-h-[24px]">
                        <span className="font-semibold text-[15px] text-foreground truncate">
                            {name}
                        </span>
                        {/* {active && (
                        <span className="flex items-center gap-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                Active
                            </span>
                        </span>
                    )} */}
                    </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-0 pb-2 px-2">
                    <div className="flex gap-2">
                        {palette.map((color, i) => (
                            <span
                                key={i}
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    {showUseButton && (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={active}
                            onClick={onUse}
                            className={cn(
                                "min-w-[56px] px-4 font-medium text-sm rounded-md h-8",
                                active ? "opacity-60 cursor-not-allowed" : "",
                            )}
                        >
                            {active ? "Active" : "Use"}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        );
    },
);

ThemeCard.displayName = "ThemeCard";
