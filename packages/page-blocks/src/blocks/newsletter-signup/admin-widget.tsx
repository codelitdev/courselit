"use client";

import type { WidgetEditorProps } from "@frontlit/page-builder/models";
import { FieldGroup, SelectField, TextField } from "../_shared/fields";
import type { NewsletterSignupSettings } from "./settings";

export default function NewsletterSignupAdminWidget({
  settings,
  onChange,
}: WidgetEditorProps<NewsletterSignupSettings>) {
  const update = (partial: Partial<NewsletterSignupSettings>) =>
    onChange({ ...settings, ...partial });

  return (
    <div className="flex flex-col gap-5">
      <FieldGroup title="Content">
        <TextField
          label="Title"
          value={settings.title}
          onChange={(title) => update({ title })}
        />
        <TextField
          label="Description"
          value={settings.subtitle}
          onChange={(subtitle) => update({ subtitle })}
        />
        <TextField
          label="Button text"
          value={settings.btnText}
          onChange={(btnText) => update({ btnText })}
        />
      </FieldGroup>
      <FieldGroup title="Feedback">
        <TextField
          label="Success message"
          value={settings.successMessage}
          onChange={(successMessage) => update({ successMessage })}
        />
        <TextField
          label="Failure message"
          value={settings.failureMessage}
          onChange={(failureMessage) => update({ failureMessage })}
        />
      </FieldGroup>
      <FieldGroup title="Design">
        <SelectField
          label="Alignment"
          value={settings.alignment ?? "left"}
          options={[
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ]}
          onChange={(alignment) => update({ alignment })}
        />
      </FieldGroup>
    </div>
  );
}
