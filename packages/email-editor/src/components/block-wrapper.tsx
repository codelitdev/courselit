import { useState, useRef } from "react";
import type { Content, Style } from "@/types/email-editor";
import type { BlockRegistry } from "../types/block-registry";
import { AddBlockButton } from "./add-block-button";
import { Trash, Copy, ChevronUp, ChevronDown } from "lucide-react";

interface BlockWrapperProps {
    block: Required<Content>;
    index: number;
    isFirst: boolean;
    isLast: boolean;
    isFixed?: boolean;
    style?: Style;
    blockRegistry: BlockRegistry;
    selectedBlockId: string | null;
    setSelectedBlockId: (id: string | null) => void;
    deleteBlock: (id: string) => void;
    moveBlock: (id: string, direction: "up" | "down") => void;
    duplicateBlock: (id: string) => void;
    movingBlockId: string | null;
    addBlock: (blockType: string, index: number) => void;
    totalBlocks: number;
}

export function BlockWrapper({
    block,
    index,
    isFirst,
    isLast,
    isFixed = false,
    style,
    blockRegistry,
    selectedBlockId,
    setSelectedBlockId,
    deleteBlock,
    moveBlock,
    duplicateBlock,
    movingBlockId,
    addBlock,
    totalBlocks,
}: BlockWrapperProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isControlsHovered, setIsControlsHovered] = useState(false);
    const controlsRef = useRef<HTMLDivElement>(null);
    const blockRef = useRef<HTMLDivElement>(null);

    const isMoving = movingBlockId === block.id;
    const isSelected = selectedBlockId === block.id;

    // Handle showing controls when either the block or controls are hovered
    const showControls = isHovered || isControlsHovered;

    const handleBlockClick = () => {
        setSelectedBlockId(block.id);
    };

    // Handle mouse enter/leave for the controls panel
    const handleControlsMouseEnter = () => {
        setIsControlsHovered(true);
    };

    const handleControlsMouseLeave = () => {
        setIsControlsHovered(false);
    };

    const renderBlock = () => {
        const blockComponent = blockRegistry[block.blockType];
        if (!blockComponent) {
            return <div>Unknown block type: {block.blockType}</div>;
        }

        const BlockComponent = blockComponent.block;
        return (
            <BlockComponent
                block={block}
                style={style}
                selectedBlockId={selectedBlockId}
            />
        );
    };

    // Calculate if move buttons should be disabled
    const canMoveUp = !isFixed && index > 1; // Can't move into first position (index 0)
    const canMoveDown = !isFixed && index < totalBlocks - 2; // Can't move into last position

    // Check if we should show any controls at all
    const hasAnyControls = !isFixed || (!isFirst && !isLast);

    return (
        <div
            className={`relative transition-all duration-300 ease-in-out ${isMoving ? "scale-105 shadow-lg z-20" : ""} group`}
            style={{
                transform: isMoving ? "translateY(-2px)" : "translateY(0)",
            }}
        >
            {/* Block content */}
            <div
                ref={blockRef}
                className={`relative border-2 transition-all duration-200 ${
                    isSelected
                        ? "border-blue-500"
                        : showControls
                          ? "border-blue-300"
                          : "border-transparent"
                } ${isMoving ? "border-blue-400 bg-blue-50/30" : ""}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleBlockClick}
            >
                {/* Block content */}
                <div>{renderBlock()}</div>

                {/* Bottom border with add button on hover */}
                {!isLast && (
                    <div className="absolute left-0 right-0 bottom-0 z-10">
                        <div
                            className={`absolute -bottom-3 left-1/2 transform -translate-x-1/2 transition-opacity duration-200 ${
                                isHovered ? "opacity-100" : "opacity-0"
                            }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <AddBlockButton
                                position="below"
                                index={index + 1}
                                addBlock={addBlock}
                                blockRegistry={blockRegistry}
                            />
                        </div>
                    </div>
                )}

                {/* Control buttons overlay - positioned inside the block */}
                {showControls && !isMoving && hasAnyControls && (
                    <div
                        ref={controlsRef}
                        className="absolute top-2 right-2 bg-white shadow-lg rounded-md border flex flex-row z-20"
                        onMouseEnter={handleControlsMouseEnter}
                        onMouseLeave={handleControlsMouseLeave}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Delete button - disabled for fixed blocks */}
                        {!isFixed && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteBlock(block.id);
                                }}
                                className="p-2 hover:bg-red-50 hover:text-red-600 transition-colors rounded-l-md"
                                title="Delete block"
                            >
                                <Trash className="h-3 w-3 text-black" />
                            </button>
                        )}

                        {/* Duplicate button - only for non-first and non-last blocks */}
                        {!isFirst && !isLast && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateBlock(block.id);
                                }}
                                className={`p-2 hover:bg-gray-100 transition-colors ${!isFixed ? "" : "rounded-l-md"}`}
                                title="Duplicate block"
                            >
                                <Copy className="h-3 w-3 text-black" />
                            </button>
                        )}

                        {/* Move up button - disabled for fixed blocks and when can't move up */}
                        {canMoveUp && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    moveBlock(block.id, "up");
                                }}
                                className="p-2 hover:bg-gray-100 transition-colors"
                                title="Move up"
                                disabled={isMoving}
                            >
                                <ChevronUp className="h-3 w-3 text-black" />
                            </button>
                        )}

                        {/* Move down button - disabled for fixed blocks and when can't move down */}
                        {canMoveDown && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    moveBlock(block.id, "down");
                                }}
                                className="p-2 hover:bg-gray-100 transition-colors rounded-r-md"
                                title="Move down"
                                disabled={isMoving}
                            >
                                <ChevronDown className="h-3 w-3 text-black" />
                            </button>
                        )}
                    </div>
                )}

                {/* Moving indicator */}
                {isMoving && (
                    <div className="absolute inset-0 bg-blue-100/20 border-2 border-blue-400 rounded-md pointer-events-none z-10">
                        <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                            Moving...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
