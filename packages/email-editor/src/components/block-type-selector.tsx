import { useRef, useEffect, useCallback } from "react";
import { useEmailEditor } from "@/context/email-editor-context";
import type { BlockType } from "@/types/email-editor";
import blockRegistry from "@/lib/block-registry";

interface BlockTypeSelectorProps {
    index: number;
    onClose: () => void;
}

export function BlockTypeSelector({ index, onClose }: BlockTypeSelectorProps) {
    const { addBlock } = useEmailEditor();
    const selectorRef = useRef<HTMLDivElement>(null);

    const blockTypes = Object.values(blockRegistry).map((block) => ({
        type: block.metadata.name as BlockType,
        icon: block.metadata.icon,
        label: block.metadata.displayName,
        description: block.metadata.description,
    }));

    const handleAddBlock = useCallback(
        (type: BlockType) => {
            addBlock(type, index);
            onClose();
        },
        [addBlock, index, onClose],
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                selectorRef.current &&
                !selectorRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        }

        const timer = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={selectorRef}
            className="bg-white shadow-lg rounded-md p-3 border z-20"
        >
            <div className="grid grid-cols-2 gap-2 min-w-[200px]">
                {blockTypes.map((blockType) => (
                    <button
                        key={blockType.type}
                        onClick={() => handleAddBlock(blockType.type)}
                        className="flex flex-col items-center p-3 hover:bg-blue-50 rounded transition-colors border border-transparent hover:border-blue-200"
                    >
                        <div className="text-blue-600 mb-1">
                            {blockType.icon && (
                                <blockType.icon className="h-5 w-5" />
                            )}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                            {blockType.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
