"use client";

import { useState } from "react";
import { useEmailEditor } from "@/context/email-editor-context";
import { Plus } from "lucide-react";
import blockRegistry from "@/lib/block-registry";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { BlockType } from "@/types/email-editor";

interface AddBlockButtonProps {
    position: "above" | "below";
    index: number;
}

export function AddBlockButton({ position, index }: AddBlockButtonProps) {
    const { addBlock } = useEmailEditor();
    const [isOpen, setIsOpen] = useState(false);

    const blockTypes = Object.values(blockRegistry).map((block) => ({
        type: block.metadata.name as BlockType,
        icon: block.metadata.icon,
        label: block.metadata.displayName,
        description: block.metadata.description,
    }));

    const handleAddBlock = (blockType: BlockType) => {
        addBlock(blockType, index);
        setIsOpen(false);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className="bg-white border border-gray-300 rounded-full p-1 shadow-sm hover:border-gray-400 transition-colors">
                    <Plus className="h-3 w-3 text-gray-600" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-3"
                side="bottom"
                align="start"
                sideOffset={8}
                avoidCollisions={true}
                collisionPadding={20}
            >
                <div className="grid grid-cols-2 gap-2">
                    {blockTypes.map((blockType) => (
                        <button
                            key={blockType.type}
                            onClick={() => handleAddBlock(blockType.type)}
                            className="flex flex-col items-center p-3 hover:bg-blue-50 rounded transition-colors border border-transparent hover:border-blue-200"
                        >
                            <div className="text-blue-600 mb-1">
                                {blockType.icon && (
                                    <blockType.icon className="w-5 h-5" />
                                )}
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                                {blockType.label}
                            </span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
