"use client";

import {
  Editor,
  type EditorProps,
  type TextEditorContent,
} from "@frontlit/text-editor";

type LearnerDiscussionEditorProps = Omit<EditorProps, "initialContent" | "onChange"> & {
  initialContent: TextEditorContent;
  onChange: (content: TextEditorContent) => void;
};

/**
 * Course discussions intentionally do not expose media uploads, but they use
 * the same TipTap document format as the production discussion editor.
 */
export function LearnerDiscussionEditor({
  initialContent,
  onChange,
  ...editorProps
}: LearnerDiscussionEditorProps) {
  return (
    <div className="max-h-[200px] overflow-y-auto rounded-[inherit]">
      <Editor
        {...editorProps}
        initialContent={initialContent}
        onChange={(value) => onChange(value as TextEditorContent)}
        showToolbar={false}
        editorClassName="min-h-[80px] max-w-none"
      />
    </div>
  );
}
