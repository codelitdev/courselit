"use client";

import { Editor, emptyDoc, type TextEditorContent } from "@frontlit/text-editor";
import type { ReactNode } from "react";
import type { BannerSettings } from "../banner/settings";
import type { CurriculumSettings } from "../curriculum/settings";

export function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 last:border-0">
      {title ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const id = `sales-widget-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-xs font-semibold">
      <span>{label}</span>
      <input
        id={id}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="min-h-9 rounded-lg border border-input bg-muted/20 px-3 py-2 text-sm font-normal outline-none focus:border-ring"
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        className="h-9 rounded-lg border border-input bg-muted/20 px-3 py-2 text-sm font-normal outline-none focus:border-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  );
}

export function BannerEditor({
  settings,
  onChange,
}: {
  settings: BannerSettings;
  onChange: (settings: BannerSettings) => void;
}) {
  const update = (partial: Partial<BannerSettings>) =>
    onChange({ ...settings, ...partial });
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Basic">
        <TextField
          label="Custom title"
          value={settings.title ?? settings.customTitle}
          placeholder="Use the resource title"
          onChange={(title) => update({ title })}
        />
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-semibold">Custom description</span>
          <Editor
            initialContent={
              settings.description ?? settings.customDescription ?? emptyDoc
            }
            onChange={(json) => update({ description: json as TextEditorContent })}
            showToolbar={false}
            editorClassName="min-h-24"
          />
        </div>
      </FieldGroup>
      <FieldGroup title="Call to action">
        <TextField
          label="Button caption"
          value={settings.buttonCaption}
          placeholder="Buy now or Join community"
          onChange={(buttonCaption) => update({ buttonCaption })}
        />
      </FieldGroup>
      <FieldGroup title="Design">
        <SelectField
          label="Text content position"
          value={settings.textPosition ?? "left"}
          options={[
            { label: "Left", value: "left" },
            { label: "Right", value: "right" },
            { label: "Top", value: "top" },
            { label: "Bottom", value: "bottom" },
          ]}
          onChange={(textPosition) => update({ textPosition })}
        />
        <SelectField
          label="Text alignment"
          value={settings.textAlignment ?? "left"}
          options={[
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ]}
          onChange={(textAlignment) => update({ textAlignment })}
        />
      </FieldGroup>
    </div>
  );
}

export function CurriculumEditor({
  settings,
  onChange,
}: {
  settings: CurriculumSettings;
  onChange: (settings: CurriculumSettings) => void;
}) {
  const update = (partial: Partial<CurriculumSettings>) =>
    onChange({ ...settings, ...partial });
  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Basic">
        <TextField
          label="Title"
          value={settings.title}
          placeholder="Curriculum"
          onChange={(title) => update({ title })}
        />
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-semibold">Description</span>
          <Editor
            initialContent={settings.description ?? emptyDoc}
            onChange={(json) => update({ description: json as TextEditorContent })}
            showToolbar={false}
            editorClassName="min-h-20"
          />
        </div>
      </FieldGroup>
      <FieldGroup title="Layout">
        <SelectField
          label="Header alignment"
          value={settings.headerAlignment ?? "center"}
          options={[
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ]}
          onChange={(headerAlignment) => update({ headerAlignment })}
        />
        <ToggleField
          label="Open all sections by default"
          value={settings.openByDefault ?? false}
          onChange={(openByDefault) => update({ openByDefault })}
        />
      </FieldGroup>
    </div>
  );
}
