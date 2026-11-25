"use client";

import { Textarea } from "@/components/ui/codelit/textarea";

type WritingEditorDocumentHeaderProps = {
  title: string;
  onTitleChange: (value: string) => void;
  titlePlaceholder?: string;
  /** Shown only with `onDescriptionChange`. */
  description?: string;
  onDescriptionChange?: (value: string) => void;
  titleError?: string | null;
};

export function WritingEditorDocumentHeader({
  title,
  onTitleChange,
  titlePlaceholder = "Blog title",
  description = "",
  onDescriptionChange,
  titleError,
}: WritingEditorDocumentHeaderProps) {
  return (
    <div className="px-6 pb-7 pt-12 sm:px-10">
      <Textarea
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder={titlePlaceholder}
        aria-label={titlePlaceholder}
        aria-invalid={Boolean(titleError)}
        aria-describedby={titleError ? "writing-editor-title-error" : undefined}
        rows={1}
        className="min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-3xl font-bold leading-tight tracking-tight shadow-none [field-sizing:content] focus-visible:border-transparent focus-visible:shadow-none lg:text-4xl"
      />
      {titleError ? (
        <p
          id="writing-editor-title-error"
          role="alert"
          className="mt-2 text-sm text-destructive"
        >
          {titleError}
        </p>
      ) : null}
      {onDescriptionChange ? (
        <Textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Add a short description…"
          rows={2}
          className="mt-4 min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-lg leading-relaxed text-muted-foreground shadow-none focus-visible:border-transparent focus-visible:shadow-none"
        />
      ) : null}
    </div>
  );
}
