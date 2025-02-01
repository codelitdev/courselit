import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Pencil, Check, X, Loader2 } from "lucide-react";
import {
    TextEditor,
    TextEditorEmptyDoc,
    TextRenderer,
    useToast,
} from "@courselit/components-library";
import { isTextEditorNonEmpty } from "@ui-lib/utils";
import { TOAST_TITLE_SUCCESS } from "@ui-config/strings";

interface BannerComponentProps {
    canEdit: boolean;
    initialBannerText: Record<string, unknown>;
    onSaveBanner: (text: Record<string, unknown>) => Promise<void>;
}

export default function Banner({
    canEdit,
    initialBannerText,
    onSaveBanner,
}: BannerComponentProps) {
    const [bannerText, setBannerText] = useState(
        initialBannerText || TextEditorEmptyDoc,
    );
    const [isEditing, setIsEditing] = useState(false);
    const [editedBannerText, setEditedBannerText] = useState(bannerText);
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditing]);

    const handleSaveBanner = async () => {
        setIsSaving(true);
        try {
            await onSaveBanner(editedBannerText);
            setBannerText(editedBannerText);
            setIsEditing(false);
        } catch (error) {
            toast({
                title: TOAST_TITLE_SUCCESS,
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedBannerText(bannerText);
        setIsEditing(false);
    };

    if (!canEdit && !isTextEditorNonEmpty(initialBannerText)) {
        return null;
    }

    return (
        <div className="relative">
            <Alert>
                {!isEditing ? (
                    <>
                        <AlertDescription>
                            {isTextEditorNonEmpty(bannerText) ? (
                                <TextRenderer json={bannerText} />
                            ) : (
                                canEdit && (
                                    <div className="flex items-center space-x-2 text-muted-foreground">
                                        <AlertCircle className="h-4 w-4" />
                                        <p>
                                            Share important updates,
                                            announcements, or news with your
                                            community members here.
                                        </p>
                                    </div>
                                )
                            )}
                        </AlertDescription>
                        {canEdit && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={() => setIsEditing(true)}
                            >
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit banner</span>
                            </Button>
                        )}
                    </>
                ) : (
                    <div className="space-y-2">
                        <TextEditor
                            showToolbar={false}
                            initialContent={editedBannerText}
                            onChange={(value) => setEditedBannerText(value)}
                        />
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                            >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSaveBanner}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4 mr-1" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </Alert>
        </div>
    );
}
