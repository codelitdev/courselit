"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/codelit/checkbox";

type SearchSettingKey = "hideFromSearch" | "blockAiTraining";

type SchoolSearchSettings = {
  id: string;
  selected?: boolean;
  hideFromSearch?: boolean;
  blockAiTraining?: boolean;
};

const SETTINGS: Array<{
  key: SearchSettingKey;
  label: string;
  description: string;
  on: string;
  off: string;
}> = [
  {
    key: "hideFromSearch",
    label: "Hide from search engines",
    description:
      "Ask every crawler, search engines included, to stay away from your site. Use it while you get ready to launch.",
    on: "Your site is hidden from search engines.",
    off: "Search engines can find your site.",
  },
  {
    key: "blockAiTraining",
    label: "Block AI training crawlers",
    description:
      "Ask crawlers that collect content to train AI models (GPTBot, ClaudeBot, Google-Extended, CCBot and others) to stay away. AI search tools such as ChatGPT search and Perplexity can still find and cite your site.",
    on: "AI training crawlers are blocked.",
    off: "AI training crawlers are allowed.",
  },
];

export function SearchSettings() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<SearchSettingKey, boolean>>({
    hideFromSearch: false,
    blockAiTraining: true,
  });
  const [saving, setSaving] = useState<SearchSettingKey | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: SchoolSearchSettings[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!active || !selected) return;
        setSchoolId(selected.id);
        setValues({
          hideFromSearch: selected.hideFromSearch === true,
          blockAiTraining: selected.blockAiTraining !== false,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function save(key: SearchSettingKey, value: boolean) {
    if (!schoolId || saving) return;
    const setting = SETTINGS.find((item) => item.key === key)!;
    setSaving(key);
    setValues((current) => ({ ...current, [key]: value }));
    try {
      const response = await fetch(`/api/v1/schools/${encodeURIComponent(schoolId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json", "x-school-id": schoolId },
        body: JSON.stringify({ [key]: value }),
      });
      if (!response.ok) throw new Error();
      toast.success(value ? setting.on : setting.off);
    } catch {
      setValues((current) => ({ ...current, [key]: !value }));
      toast.error("Unable to save the setting.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="w-full space-y-6">
      {SETTINGS.map((setting) => (
        <div key={setting.key} className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{setting.label}</p>
            <p className="text-sm text-muted-foreground">{setting.description}</p>
          </div>
          <Checkbox
            checked={values[setting.key]}
            disabled={!schoolId || saving !== null}
            onCheckedChange={(value) => void save(setting.key, value === true)}
            aria-label={setting.label}
          />
        </div>
      ))}
    </div>
  );
}
