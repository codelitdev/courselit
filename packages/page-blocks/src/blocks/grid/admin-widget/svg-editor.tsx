import React, { useState, useRef, useEffect } from "react";
import { SvgStyle } from "../settings";
import {
    Alert,
    Button2,
    Textarea,
    AlertDescription,
} from "@courselit/components-library";
import { Check, Pencil, Trash, AlertCircle } from "lucide-react";
import { validateSvg, processedSvg } from "../helpers";

export default function SvgEditor({
    svgText,
    svgStyle,
    onSvgChange,
}: {
    svgText: string;
    svgStyle: SvgStyle;
    onSvgChange: (svgCode: string) => void;
}) {
    const [svgCode, setSvgCode] = useState<string>(svgText);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [tempSvgCode, setTempSvgCode] = useState<string>(svgText);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [isEditing]);

    useEffect(() => {
        onSvgChange(svgCode);
    }, [svgCode]);

    const handleSvgChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTempSvgCode(e.target.value);
        setError(null);
    };

    // const validateSvg = (code: string): boolean => {
    //     if (!code.trim()) return false

    //     // Basic validation - check if it starts with <svg and ends with </svg>
    //     const hasSvgTags = code.trim().startsWith("<svg") && code.trim().endsWith("</svg>")

    //     if (!hasSvgTags) {
    //         setError("Invalid SVG format. Make sure your code starts with <svg and ends with </svg>")
    //         return false
    //     }

    //     return true
    // }

    const saveSvgChanges = () => {
        try {
            if (validateSvg(tempSvgCode)) {
                setSvgCode(tempSvgCode);
                setIsEditing(false);
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const cancelEditing = () => {
        setTempSvgCode(svgCode);
        setIsEditing(false);
        setError(null);
    };

    const removeSvg = () => {
        setSvgCode("");
        setTempSvgCode("");
        setIsEditing(false);
        setError(null);
    };

    //    const processedSvg = () => {
    //     if (!validateSvg(svgCode)) return ""

    //     // Replace currentColor with the selected color
    //     return svgCode.replace(/currentColor/g, svgStyle.svgColor)
    //   }

    return !isEditing ? (
        <div>
            <div className="flex items-center justify-between gap-2">
                {svgCode ? (
                    <div className="flex justify-center items-center py-4">
                        <div
                            className="flex justify-center items-center"
                            style={{
                                width: `${svgStyle.width}px`,
                                height: `${svgStyle.height}px`,
                                backgroundColor: svgStyle.backgroundColor,
                                borderRadius: `${svgStyle.borderRadius}px`,
                                borderWidth: `${svgStyle.borderWidth}px`,
                                borderStyle: svgStyle.borderStyle,
                                borderColor: svgStyle.borderColor,
                                padding: "8px",
                            }}
                            dangerouslySetInnerHTML={{
                                __html:
                                    processedSvg(svgCode, svgStyle) ||
                                    '<div class="text-red-500">Invalid SVG</div>',
                            }}
                        />
                    </div>
                ) : (
                    <div
                        className="flex justify-center items-center"
                        style={{
                            width: `${svgStyle.width}px`,
                            height: `${svgStyle.height}px`,
                            backgroundColor: svgStyle.backgroundColor,
                            borderRadius: `${svgStyle.borderRadius}px`,
                            borderWidth: `${svgStyle.borderWidth}px`,
                            borderStyle: svgStyle.borderStyle,
                            borderColor: svgStyle.borderColor,
                            padding: "8px",
                        }}
                        //   dangerouslySetInnerHTML={{
                        //     __html: '<div class="text-center text-muted-foreground">No SVG added yet. Click the edit button to add SVG.</div>',
                        //   }}
                    ></div>
                )}
                <div className="flex gap-2">
                    <Button2
                        variant="outline"
                        size="icon"
                        onClick={() => {
                            setIsEditing(true);
                        }}
                    >
                        <Pencil />
                    </Button2>
                    {svgText && (
                        <Button2
                            variant="outline"
                            size="icon"
                            onClick={(e) => {
                                e.preventDefault();
                                removeSvg();
                            }}
                        >
                            <Trash />
                        </Button2>
                    )}
                </div>
            </div>
        </div>
    ) : (
        <div>
            <Textarea
                ref={textareaRef}
                placeholder="Enter SVG code here..."
                className="min-h-[150px] font-mono text-sm mb-4"
                rows={10}
                value={tempSvgCode}
                onChange={handleSvgChange}
            />
            <p className="text-xs text-muted-foreground mb-4">
                <a
                    href="https://lucide.dev/icons/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                >
                    Lucide icons
                </a>{" "}
                works the best with CourseLit.
            </p>
            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <div className="flex justify-end gap-2">
                <Button2
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        cancelEditing();
                    }}
                    variant="outline"
                    size="sm"
                >
                    Cancel
                </Button2>
                <Button2
                    type="submit"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                        e.preventDefault();
                        saveSvgChanges();
                    }}
                >
                    <Check /> Save
                </Button2>
            </div>
        </div>
    );
}
