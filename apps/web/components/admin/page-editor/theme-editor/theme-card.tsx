import React, { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/shadcn-utils";
import { Pencil, Check } from "lucide-react";

interface ThemeCardProps {
    name: string;
    palette: string[];
    active?: boolean; // server active
    selected?: boolean; // local preview highlight
    onUse?: (e?: React.MouseEvent) => void;
    onEdit?: (e?: React.MouseEvent) => void;
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
            onEdit,
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
                        <div className="flex items-center gap-1">
                            {onEdit && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(e);
                                    }}
                                    className="h-8 w-8"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            )}
                            {showUseButton && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={active}
                                    onClick={onUse}
                                    className={cn(
                                        "h-8 w-8",
                                        active
                                            ? "opacity-60 cursor-not-allowed"
                                            : "",
                                    )}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
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
                </CardFooter>
            </Card>
        );
    },
);

ThemeCard.displayName = "ThemeCard";
