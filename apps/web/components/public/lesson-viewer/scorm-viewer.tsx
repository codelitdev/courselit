"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { debounce } from "@courselit/utils";

interface ScormViewerProps {
    lessonId: string;
    launchUrl: string;
}

interface CMIData {
    [key: string]: unknown;
}

export function ScormViewer({ lessonId, launchUrl }: ScormViewerProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const scormState = useRef<CMIData>({});
    const pendingUpdates = useRef<Map<string, unknown>>(new Map());
    const sessionActive = useRef(false);

    // Centralized GetValue logic
    const getValue = useCallback((element: string): string => {
        if (!sessionActive.current) {
            console.warn(`[SCORM] GetValue rejected - session not active`);
            return "";
        }
        const value = getNestedValue(scormState.current, element);
        return value !== undefined ? String(value) : "";
    }, []);

    // Debounced batch commit function
    const commitToServer = useCallback(
        debounce(async () => {
            if (pendingUpdates.current.size === 0) return;

            const updates = Object.fromEntries(pendingUpdates.current);
            pendingUpdates.current.clear();

            try {
                await fetch(`/api/scorm/lesson/${lessonId}/runtime`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ updates }),
                });
            } catch (err) {
                console.error("Failed to save SCORM data:", err);
                // Re-queue failed updates
                for (const [k, v] of Object.entries(updates)) {
                    pendingUpdates.current.set(k, v);
                }
            }
        }, 500),
        [lessonId],
    );

    // Centralized SetValue logic
    const setValue = useCallback(
        (element: string, value: string): string => {
            if (!sessionActive.current) {
                console.warn(`[SCORM] SetValue rejected - session not active`);
                return "false";
            }

            // Fix C: Prevent infinite suspend_data growth (4KB limit for SCORM 1.2)
            let safeValue = value;
            if (
                element === "cmi.suspend_data" ||
                element === "cmi.core.suspend_data"
            ) {
                const maxSize = 4096;
                if (value.length > maxSize) {
                    console.warn(
                        `[SCORM] suspend_data exceeded ${maxSize} bytes, truncating`,
                    );
                    safeValue = value.slice(0, maxSize);
                }
            }

            setNestedValue(scormState.current, element, safeValue);
            pendingUpdates.current.set(element, safeValue);
            commitToServer();
            return "true";
        },
        [commitToServer],
    );

    // Load initial SCORM data & Initialize Standard Fields
    useEffect(() => {
        async function loadScormData() {
            try {
                const response = await fetch(
                    `/api/scorm/lesson/${lessonId}/runtime`,
                );
                if (response.ok) {
                    const data = await response.json();
                    scormState.current = data || { cmi: {} };

                    // Tell the SCO the context (Credit, Mode, Entry)
                    const hasSuspend = !!getNestedValue(
                        scormState.current,
                        "cmi.suspend_data",
                    );
                    const entryValue = hasSuspend ? "resume" : "ab-initio";

                    // SCORM 1.2
                    setNestedValue(
                        scormState.current,
                        "cmi.core.entry",
                        entryValue,
                    );
                    setNestedValue(
                        scormState.current,
                        "cmi.core.lesson_mode",
                        "normal",
                    );
                    setNestedValue(
                        scormState.current,
                        "cmi.core.credit",
                        "credit",
                    );

                    // SCORM 2004
                    setNestedValue(scormState.current, "cmi.entry", entryValue);
                    setNestedValue(scormState.current, "cmi.mode", "normal");
                    setNestedValue(scormState.current, "cmi.credit", "credit");

                    // Ensure default status is present for 1.2 if missing
                    if (
                        !getNestedValue(
                            scormState.current,
                            "cmi.core.lesson_status",
                        )
                    ) {
                        setNestedValue(
                            scormState.current,
                            "cmi.core.lesson_status",
                            "not attempted",
                        );
                    }
                    // Ensure default status is present for 2004 if missing
                    if (
                        !getNestedValue(
                            scormState.current,
                            "cmi.completion_status",
                        )
                    ) {
                        setNestedValue(
                            scormState.current,
                            "cmi.completion_status",
                            "unknown",
                        ); // 2004 default is 'unknown'
                    }
                }
            } catch (err) {
                console.error("Failed to load SCORM runtime data:", err);
            } finally {
                setIsDataLoaded(true);
            }
        }
        loadScormData();
    }, [lessonId]);

    // Force immediate flush (no debounce) - used for Finish/Terminate
    const forceFlush = useCallback(async () => {
        if (pendingUpdates.current.size === 0) return;
        const updates = Object.fromEntries(pendingUpdates.current);
        pendingUpdates.current.clear();
        await fetch(`/api/scorm/lesson/${lessonId}/runtime`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ updates }),
        });
    }, [lessonId]);

    // Fix B: Save on browser close/crash
    useEffect(() => {
        const onUnload = () => {
            if (!sessionActive.current) return;

            setNestedValue(scormState.current, "cmi.core.exit", "suspend");
            pendingUpdates.current.set("cmi.core.exit", "suspend");

            const payload = JSON.stringify({
                updates: Object.fromEntries(pendingUpdates.current),
            });
            navigator.sendBeacon(
                `/api/scorm/lesson/${lessonId}/runtime`,
                payload,
            );
        };

        window.addEventListener("beforeunload", onUnload);
        return () => window.removeEventListener("beforeunload", onUnload);
    }, [lessonId]);

    // SCORM 1.2 API implementation - only expose after data is loaded
    useEffect(() => {
        if (!isDataLoaded) return;

        const API = {
            LMSInitialize: () => {
                sessionActive.current = true;
                setLoading(false);
                return "true";
            },
            LMSGetValue: (element: string) => getValue(element),
            LMSSetValue: (element: string, value: string) =>
                setValue(element, value),
            LMSCommit: () => {
                commitToServer();
                return "true";
            },
            LMSFinish: async () => {
                // SCORM 1.2: If status is 'not attempted', it becomes 'completed'
                const status = getNestedValue(
                    scormState.current,
                    "cmi.core.lesson_status",
                );
                if (status === "not attempted") {
                    setNestedValue(
                        scormState.current,
                        "cmi.core.lesson_status",
                        "completed",
                    );
                    pendingUpdates.current.set(
                        "cmi.core.lesson_status",
                        "completed",
                    );
                }

                // Always suspend on exit for resume support
                setNestedValue(scormState.current, "cmi.core.exit", "suspend");
                pendingUpdates.current.set("cmi.core.exit", "suspend");

                await forceFlush();
                sessionActive.current = false;
                return "true";
            },
            LMSGetLastError: () => "0",
            LMSGetErrorString: () => "",
            LMSGetDiagnostic: () => "",
        };

        // SCORM 2004
        const API_1484_11 = {
            Initialize: () => {
                sessionActive.current = true;
                setLoading(false);
                return "true";
            },
            GetValue: (element: string) => getValue(element),
            SetValue: (element: string, value: string) =>
                setValue(element, value),
            Commit: () => {
                commitToServer();
                return "true";
            },
            Terminate: async () => {
                // Always suspend on exit for resume support
                setNestedValue(scormState.current, "cmi.exit", "suspend");
                pendingUpdates.current.set("cmi.exit", "suspend");

                await forceFlush();
                sessionActive.current = false;
                return "true";
            },
            GetLastError: () => "0",
            GetErrorString: () => "",
            GetDiagnostic: () => "",
        };

        // Expose APIs on window for SCORM content to find
        (window as any).API = API;
        (window as any).API_1484_11 = API_1484_11;

        return () => {
            delete (window as any).API;
            delete (window as any).API_1484_11;
        };
    }, [isDataLoaded, getValue, setValue, commitToServer, forceFlush]);

    const handleIframeLoad = () => {
        setLoading(false);
    };

    const handleIframeError = () => {
        setError("Failed to load SCORM content");
        setLoading(false);
    };

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        if (iframeRef.current) {
            iframeRef.current.src = iframeRef.current.src;
        }
    };

    // Open in popup window
    const openInPopup = useCallback(() => {
        const url = `/api/scorm/lesson/${lessonId}/content/${launchUrl}`;
        const width = window.screen.width * 0.9;
        const height = window.screen.height * 0.9;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        window.open(
            url,
            "scorm_content",
            `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`,
        );
    }, [lessonId, launchUrl]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 bg-muted rounded-lg">
                <p className="text-destructive mb-4">{error}</p>
                <button
                    onClick={handleRetry}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[85vh] rounded-lg shadow-sm overflow-hidden border bg-background">
            {/* Toolbar with open in popup button */}
            <div className="absolute top-2 right-2 z-20 flex gap-2">
                <button
                    onClick={openInPopup}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-background/90 border rounded-md hover:bg-muted transition-colors shadow-sm"
                    title="Open in fullscreen window"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                    Open Fullscreen
                </button>
            </div>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            )}
            {isDataLoaded && (
                <iframe
                    ref={iframeRef}
                    src={`/api/scorm/lesson/${lessonId}/content/${launchUrl}`}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    title="SCORM Content"
                />
            )}
        </div>
    );
}

// Helper to get nested value from object
function getNestedValue(obj: any, path: string): unknown {
    return path.split(".").reduce((curr, key) => curr?.[key], obj);
}

// Helper to set nested value in object
function setNestedValue(obj: any, path: string, value: unknown): void {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

export default ScormViewer;
