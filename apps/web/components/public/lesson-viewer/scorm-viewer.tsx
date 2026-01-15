"use client";

import { useEffect, useRef, useCallback, useState, useContext } from "react";
import { debounce } from "@courselit/utils";
import { Button } from "@courselit/page-primitives";
import { ThemeContext } from "@components/contexts";

interface ScormViewerProps {
    lessonId: string;
    launchUrl: string;
}

interface CMIData {
    [key: string]: unknown;
}

export function ScormViewer({ lessonId, launchUrl }: ScormViewerProps) {
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const scormState = useRef<CMIData>({});
    const pendingUpdates = useRef<Map<string, unknown>>(new Map());
    const sessionActive = useRef(false);
    const { theme } = useContext(ThemeContext);

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

    return (
        <div>
            <Button theme={theme.theme} onClick={openInPopup}>
                Enter
            </Button>
        </div>
    );
}

// Helper to get nested value from object
function getNestedValue(obj: any, path: string): unknown {
    return path.split(".").reduce((curr, key) => curr?.[key], obj);
}

// Guard against prototype pollution by blocking dangerous keys
function isUnsafeKey(key: string): boolean {
    return key === "__proto__" || key === "constructor" || key === "prototype";
}

// Helper to set nested value in object
function setNestedValue(obj: any, path: string, value: unknown): void {
    const parts = path.split(".");
    let current: any = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];

        // Prevent prototype pollution via unsafe keys
        if (isUnsafeKey(part)) {
            return;
        }

        if (current[part] === undefined || current[part] === null) {
            current[part] = {};
        }

        current = current[part];
        if (typeof current !== "object") {
            // Cannot safely nest further into non-object
            return;
        }
    }

    const lastPart = parts[parts.length - 1];
    if (isUnsafeKey(lastPart)) {
        return;
    }

    current[lastPart] = value;
}

export default ScormViewer;
