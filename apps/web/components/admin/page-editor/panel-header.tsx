import React from "react";
import { Button } from "@components/ui/button";
import { X } from "lucide-react";

interface PanelHeaderProps {
    title: string;
    onClose: () => void;
}

export function PanelHeader({ title, onClose }: PanelHeaderProps) {
    return (
        <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
            <div className="flex items-center p-2 justify-between">
                <h2 className="text-lg font-medium">{title}</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
