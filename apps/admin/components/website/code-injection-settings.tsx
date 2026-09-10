"use client";

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/codelit/button";
import { Label } from "@/components/ui/codelit/label";
import { Textarea } from "@/components/ui/codelit/textarea";

type CodeInjectionSettingsResponse = {
  codeInjectionHead?: string;
  codeInjectionBody?: string;
};

export function CodeInjectionSettings() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [codeInjectionHead, setCodeInjectionHead] = useState("");
  const [savedCodeInjectionHead, setSavedCodeInjectionHead] = useState("");
  const [codeInjectionBody, setCodeInjectionBody] = useState("");
  const [savedCodeInjectionBody, setSavedCodeInjectionBody] = useState("");
  const [saving, setSaving] = useState(false);

  const changed =
    codeInjectionHead !== savedCodeInjectionHead ||
    codeInjectionBody !== savedCodeInjectionBody;

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: Array<{ id: string; selected?: boolean }> }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (active && selected) setSchoolId(selected.id);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    void fetch("/api/v1/school/code-injection", {
      credentials: "include",
      cache: "no-store",
      headers: { "x-school-id": schoolId },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: CodeInjectionSettingsResponse | null) => {
        if (!active || !data) return;
        const nextHead = data.codeInjectionHead ?? "";
        const nextBody = data.codeInjectionBody ?? "";
        setCodeInjectionHead(nextHead);
        setSavedCodeInjectionHead(nextHead);
        setCodeInjectionBody(nextBody);
        setSavedCodeInjectionBody(nextBody);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [schoolId]);

  async function saveCodeInjection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolId || saving || !changed) return;
    setSaving(true);
    try {
      const response = await fetch("/api/v1/school/code-injection", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-school-id": schoolId,
        },
        body: JSON.stringify({ codeInjectionHead, codeInjectionBody }),
      });
      const body = (await response.json().catch(() => null)) as
        | CodeInjectionSettingsResponse
        | { message?: string }
        | null;
      if (!response.ok) {
        throw new Error(body && "message" in body ? body.message : undefined);
      }
      const saved = body && "codeInjectionHead" in body ? body : null;
      const nextHead = saved?.codeInjectionHead ?? codeInjectionHead;
      const nextBody = saved?.codeInjectionBody ?? codeInjectionBody;
      setCodeInjectionHead(nextHead);
      setSavedCodeInjectionHead(nextHead);
      setCodeInjectionBody(nextBody);
      setSavedCodeInjectionBody(nextBody);
      toast.success("Code injection saved.");
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Unable to save code injection.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="w-full space-y-6" onSubmit={(event) => void saveCodeInjection(event)}>
      <div className="space-y-1.5">
        <Label htmlFor="website-code-head">Code Injection in &lt;head&gt;</Label>
        <Textarea
          id="website-code-head"
          rows={10}
          value={codeInjectionHead}
          onChange={(event) => setCodeInjectionHead(event.target.value)}
          className="w-full font-mono text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="website-code-body">Code Injection in &lt;body&gt;</Label>
        <Textarea
          id="website-code-body"
          rows={10}
          value={codeInjectionBody}
          onChange={(event) => setCodeInjectionBody(event.target.value)}
          className="w-full font-mono text-sm"
        />
      </div>
      <Button type="submit" disabled={!schoolId || saving || !changed}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
