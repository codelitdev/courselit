import { X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailSettings } from "./email-settings";
import type { Email, Style } from "../types/email-editor";
import type { BlockRegistry } from "../types/block-registry";
import type { Content } from "../types/email-editor";

interface BlockSettingsPanelProps {
    blockId: string | null;
    email: Email;
    setSelectedBlockId: (id: string | null) => void;
    blockRegistry: BlockRegistry;
    updateEmail: (email: Email) => void;
    updateEmailStyle: (style: Partial<Style>) => void;
    updateBlock: (id: string, content: Partial<Content>) => void;
}

export function BlockSettingsPanel({
    blockId,
    email,
    setSelectedBlockId,
    blockRegistry,
    updateEmail,
    updateEmailStyle,
    updateBlock,
}: BlockSettingsPanelProps) {
    if (!blockId) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h2 className="font-medium">Email Settings</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedBlockId(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <EmailSettings
                        email={email}
                        updateEmail={updateEmail}
                        updateEmailStyle={updateEmailStyle}
                    />
                </div>
            </div>
        );
    }

    const block = email.content.find((b) => b.id === blockId);

    if (!block) return null;

    const blockComponent = blockRegistry[block.blockType];
    if (!blockComponent) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h2 className="font-medium">Unknown Block</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedBlockId(null)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="p-4">
                    <p className="text-sm text-gray-500">
                        Block type &quot;{block.blockType}&quot; not found in
                        registry.
                    </p>
                </div>
            </div>
        );
    }

    const SettingsComponent = blockComponent.settings;
    const capitalizedBlockName = blockComponent.metadata.displayName;

    const handleClose = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setSelectedBlockId(null);
    };

    const handleEmailBreadcrumbClick = () => {
        setSelectedBlockId(null);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                <div className="flex items-center">
                    <Button
                        onClick={handleEmailBreadcrumbClick}
                        className=""
                        variant="ghost"
                    >
                        Email
                    </Button>
                    <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                    <span className="font-medium">{capitalizedBlockName}</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    type="button"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <SettingsComponent
                    block={block}
                    style={email.style}
                    updateBlock={updateBlock}
                />
            </div>
        </div>
    );
}
