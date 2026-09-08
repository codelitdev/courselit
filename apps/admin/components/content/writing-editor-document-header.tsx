"use client";

import { Textarea } from "@/components/ui/codelit/textarea";

type WritingEditorDocumentHeaderProps = {
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

export function WritingEditorDocumentHeader({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: WritingEditorDocumentHeaderProps) {
  return (
    <div className="px-6 pb-7 pt-12 sm:px-10">
      <Textarea
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="Blog title"
        rows={1}
        className="min-h-0 resize-none overflow-hidden border-0 bg-transparent px-0 py-0 text-3xl font-bold leading-tight tracking-tight shadow-none [field-sizing:content] focus-visible:border-transparent focus-visible:shadow-none lg:text-4xl"
      />
      <Textarea
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Add a short description…"
        rows={2}
        className="mt-4 min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-lg leading-relaxed text-muted-foreground shadow-none focus-visible:border-transparent focus-visible:shadow-none"
      />
    </div>
  );
}
