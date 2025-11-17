import { useState, useEffect, useRef, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Pencil, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@courselit/components-library";
import { TextRenderer } from "@courselit/page-blocks";
import { isTextEditorNonEmpty } from "@ui-lib/utils";
import { BUTTON_SAVING, TOAST_TITLE_SUCCESS } from "@ui-config/strings";
import { AddressContext } from "@components/contexts";
import type { TextEditorContent } from "@courselit/common-models";
import { Editor, emptyDoc as TextEditorEmptyDoc } from "@courselit/text-editor";

interface BannerComponentProps {
    canEdit: boolean;
    initialBannerText?: TextEditorContent;
    onSaveBanner: (text: TextEditorContent) => Promise<void>;
}

export default function Banner({
    canEdit,
    initialBannerText,
    onSaveBanner,
}: BannerComponentProps) {
    const initialContent: TextEditorContent =
        initialBannerText ||
        (TextEditorEmptyDoc as unknown as TextEditorContent);
    const [bannerText, setBannerText] =
        useState<TextEditorContent>(initialContent);
    const [isEditing, setIsEditing] = useState(false);
    const [editedBannerText, setEditedBannerText] =
        useState<TextEditorContent>(initialContent);
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const address = useContext(AddressContext);
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

    const hasExistingBanner = isTextEditorNonEmpty(
        initialBannerText ||
            (TextEditorEmptyDoc as unknown as TextEditorContent),
    );

    if (!canEdit && !hasExistingBanner) {
        return null;
    }

    return (
        <div className="relative">
            <Alert>
                {!isEditing ? (
                    <>
                        <AlertDescription>
                            {isTextEditorNonEmpty(bannerText) ? (
                                <TextRenderer
                                    json={
                                        bannerText as unknown as Record<
                                            string,
                                            unknown
                                        >
                                    }
                                />
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
                        <Editor
                            showToolbar={false}
                            initialContent={editedBannerText}
                            onChange={(value) =>
                                setEditedBannerText(value as TextEditorContent)
                            }
                            url={address.backend}
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
                                        {BUTTON_SAVING}
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
