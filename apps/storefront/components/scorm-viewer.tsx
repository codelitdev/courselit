"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LearnerButton as Button,
  LearnerText2,
} from "@/components/themed-page-builder";
import { learnerHeaders } from "@/lib/school";

type ScormState = Record<string, unknown>;

function isUnsafeKey(key: string) {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

function getNestedValue(state: ScormState, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (isUnsafeKey(key) || !current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, state);
}

function setNestedValue(state: ScormState, path: string, value: string) {
  const parts = path.split(".");
  if (parts.length === 0 || parts.some(isUnsafeKey)) return false;
  let current: Record<string, unknown> = state;
  for (const [index, part] of parts.slice(0, -1).entries()) {
    const next = current[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[part] = /^\d+$/.test(parts[index + 1]!) ? [] : {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
  return true;
}

export function ScormViewer({
  productId,
  lessonId,
  launchUrl,
}: {
  productId: string;
  lessonId: string;
  launchUrl: string;
}) {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const scormState = useRef<ScormState>({ cmi: {} });
  const pendingUpdates = useRef<Map<string, string>>(new Map());
  const sessionActive = useRef(false);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runtimeUrl = `/api/v1/learner/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/scorm/runtime`;

  const forceFlush = useCallback(async () => {
    if (pendingUpdates.current.size === 0) return;
    const updates = Object.fromEntries(pendingUpdates.current);
    pendingUpdates.current.clear();
    try {
      const response = await fetch(runtimeUrl, {
        method: "POST",
        credentials: "include",
        headers: learnerHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) throw new Error("scorm_runtime_save_failed");
    } catch {
      for (const [key, value] of Object.entries(updates)) {
        pendingUpdates.current.set(key, value);
      }
    }
  }, [runtimeUrl]);

  const scheduleCommit = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null;
      void forceFlush();
    }, 500);
  }, [forceFlush]);

  const getValue = useCallback((element: string) => {
    if (!sessionActive.current) return "";
    const value = getNestedValue(scormState.current, element);
    return value === undefined || value === null ? "" : String(value);
  }, []);

  const setValue = useCallback(
    (element: string, value: string) => {
      if (!sessionActive.current) return "false";
      let safeValue = value;
      if (element === "cmi.suspend_data" || element === "cmi.core.suspend_data") {
        safeValue = value.slice(0, 4096);
      }
      if (!setNestedValue(scormState.current, element, safeValue)) return "false";
      pendingUpdates.current.set(element, safeValue);
      scheduleCommit();
      return "true";
    },
    [scheduleCommit],
  );

  useEffect(() => {
    let active = true;
    void fetch(runtimeUrl, {
      credentials: "include",
      cache: "no-store",
      headers: learnerHeaders(),
    })
      .then(async (response) => {
        if (!active) return;
        if (response.ok) {
          const loaded = (await response.json()) as unknown;
          if (loaded && typeof loaded === "object" && !Array.isArray(loaded)) {
            scormState.current = loaded as ScormState;
          }
        }
        const hasSuspend = Boolean(
          getNestedValue(scormState.current, "cmi.suspend_data") ??
            getNestedValue(scormState.current, "cmi.core.suspend_data"),
        );
        const entry = hasSuspend ? "resume" : "ab-initio";
        setNestedValue(scormState.current, "cmi.core.entry", entry);
        setNestedValue(scormState.current, "cmi.core.lesson_mode", "normal");
        setNestedValue(scormState.current, "cmi.core.credit", "credit");
        setNestedValue(scormState.current, "cmi.entry", entry);
        setNestedValue(scormState.current, "cmi.mode", "normal");
        setNestedValue(scormState.current, "cmi.credit", "credit");
        if (!getNestedValue(scormState.current, "cmi.core.lesson_status")) {
          setNestedValue(scormState.current, "cmi.core.lesson_status", "not attempted");
        }
        if (!getNestedValue(scormState.current, "cmi.completion_status")) {
          setNestedValue(scormState.current, "cmi.completion_status", "unknown");
        }
        setIsDataLoaded(true);
      })
      .catch(() => {
        if (active) setIsDataLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [runtimeUrl]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const finish = async (terminateElement: "cmi.core.exit" | "cmi.exit") => {
      setNestedValue(scormState.current, terminateElement, "suspend");
      pendingUpdates.current.set(terminateElement, "suspend");
      await forceFlush();
      sessionActive.current = false;
    };
    const api = {
      LMSInitialize: () => {
        sessionActive.current = true;
        return "true";
      },
      LMSGetValue: getValue,
      LMSSetValue: setValue,
      LMSCommit: () => {
        void forceFlush();
        return "true";
      },
      LMSFinish: async () => {
        if (getNestedValue(scormState.current, "cmi.core.lesson_status") === "not attempted") {
          setNestedValue(scormState.current, "cmi.core.lesson_status", "completed");
          pendingUpdates.current.set("cmi.core.lesson_status", "completed");
        }
        await finish("cmi.core.exit");
        return "true";
      },
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "",
      LMSGetDiagnostic: () => "",
    };
    const api2004 = {
      Initialize: () => {
        sessionActive.current = true;
        return "true";
      },
      GetValue: getValue,
      SetValue: setValue,
      Commit: () => {
        void forceFlush();
        return "true";
      },
      Terminate: async () => {
        await finish("cmi.exit");
        return "true";
      },
      GetLastError: () => "0",
      GetErrorString: () => "",
      GetDiagnostic: () => "",
    };
    (window as unknown as { API?: unknown }).API = api;
    (window as unknown as { API_1484_11?: unknown }).API_1484_11 = api2004;
    return () => {
      delete (window as unknown as { API?: unknown }).API;
      delete (window as unknown as { API_1484_11?: unknown }).API_1484_11;
    };
  }, [forceFlush, getValue, isDataLoaded, setValue]);

  useEffect(() => {
    const onUnload = () => {
      if (!sessionActive.current || pendingUpdates.current.size === 0) return;
      setNestedValue(scormState.current, "cmi.core.exit", "suspend");
      pendingUpdates.current.set("cmi.core.exit", "suspend");
      const body = new Blob(
        [JSON.stringify({ updates: Object.fromEntries(pendingUpdates.current) })],
        { type: "application/json" },
      );
      navigator.sendBeacon(runtimeUrl, body);
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [runtimeUrl]);

  const openInPopup = useCallback(() => {
    const contentPath = launchUrl
      .split("/")
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join("/");
    const url = `/api/scorm/products/${encodeURIComponent(productId)}/lessons/${encodeURIComponent(lessonId)}/content/${contentPath}`;
    window.open(url, "scorm_content", "width=1200,height=800,resizable=yes,scrollbars=yes");
  }, [launchUrl, lessonId, productId]);

  return (
    <div className="grid gap-4">
      <LearnerText2 className="text-muted-foreground">Launch the SCORM learning activity in a separate window.</LearnerText2>
      <div>
        <Button type="button" onClick={openInPopup} disabled={!isDataLoaded}>
          Enter SCORM content
        </Button>
      </div>
    </div>
  );
}
