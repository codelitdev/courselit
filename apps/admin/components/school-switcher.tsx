"use client";

import { Button } from "@/components/ui/codelit/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import { type FormEvent, useState } from "react";

type School = { id: string; name: string; selected?: boolean };

export function SchoolSwitcher({ schools }: { schools: School[] }) {
  const [error, setError] = useState<string | null>(null);
  const initialId = schools.find((school) => school.selected)?.id ?? schools[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialId);

  async function switchSchool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const response = await fetch("/api/school/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ schoolId: selectedId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(payload?.message ?? `Unable to switch school (${response.status}).`);
      return;
    }
    window.location.reload();
  }

  return (
    <form onSubmit={switchSchool} className="flex flex-col gap-3">
      <div className="field">
        <span>School</span>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full" aria-label="School switcher">
            <SelectValue placeholder="Select a school" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((school) => (
              <SelectItem key={school.id} value={school.id}>
                {school.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={!selectedId}>Switch school</Button>
      {error ? <span role="alert" className="text-sm text-destructive">{error}</span> : null}
    </form>
  );
}
