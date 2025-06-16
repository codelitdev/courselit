"use client";

import { useEmailEditor } from "@/context/email-editor-context";
import { X, ChevronRight, Code, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailSettings } from "./email-settings";
import { renderEmailToHtml } from "@/lib/email-renderer";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useBlockRegistry } from "@/context/block-registry-context";

interface BlockSettingsPanelProps {
    blockId: string | null;
}

export function BlockSettingsPanel({ blockId }: BlockSettingsPanelProps) {
    const { email, setSelectedBlockId } = useEmailEditor();

    const [isHtmlDialogOpen, setIsHtmlDialogOpen] = useState(false);
    const [exportedHtml, setExportedHtml] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const blockRegistry = useBlockRegistry();

    // const handleSave = () => {
    //     alert("Email saved! Check console for data.");
    // };

    const handleExportHtml = async () => {
        const html = await renderEmailToHtml(email);
        setExportedHtml(html);
        setIsHtmlDialogOpen(true);
    };

    const handleCopyHtml = () => {
        navigator.clipboard.writeText(exportedHtml);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

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
                    <EmailSettings />

                    <div className="mt-6 space-y-2 pt-4">
                        {/* <Button className="w-full" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Template
                        </Button> */}
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleExportHtml}
                        >
                            <Code className="h-4 w-4 mr-2" />
                            Export HTML
                        </Button>
                    </div>

                    <Dialog
                        open={isHtmlDialogOpen}
                        onOpenChange={setIsHtmlDialogOpen}
                    >
                        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                            <DialogHeader>
                                <DialogTitle>Exported HTML</DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto my-4">
                                <textarea
                                    value={exportedHtml}
                                    readOnly
                                    className="w-full h-[400px] p-3 border rounded-md font-mono text-xs resize-none bg-gray-50"
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsHtmlDialogOpen(false)}
                                >
                                    Close
                                </Button>
                                <Button onClick={handleCopyHtml}>
                                    {isCopied ? (
                                        <>
                                            <Check className="h-4 w-4 mr-2" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy HTML
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
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

    const handleClose = () => {
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
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        Email
                    </Button>
                    <ChevronRight className="h-4 w-4 mx-1 text-gray-400" />
                    <span className="font-medium">{capitalizedBlockName}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <SettingsComponent block={block} />
            </div>
        </div>
    );
}
