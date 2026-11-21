"use client";

import { FileText, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import { COURSE_LESSON_TYPES } from "@/lib/lesson-page";
import { PLAN_FEATURE_COPY } from "@/lib/plan-features";

export type CourseLessonType = (typeof COURSE_LESSON_TYPES)[number];

const lessonTypeDetails: Record<
  CourseLessonType,
  { label: string; description: string; icon: typeof FileText }
> = {
  page: {
    label: "Page",
    description: "Write the lesson: text, video, audio, files, embeds and a quiz.",
    icon: FileText,
  },
  scorm: {
    label: "SCORM",
    description: "Upload a SCORM package made in an authoring tool.",
    icon: Package,
  },
};

/** "Add lesson" in a course: what kind of lesson to create. */
export function LessonTypeDialog({
  open,
  onOpenChange,
  scormIncluded,
  busy,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** False when the school's plan doesn't include SCORM. */
  scormIncluded: boolean;
  busy: boolean;
  onChoose: (type: CourseLessonType) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a lesson</DialogTitle>
          <DialogDescription>
            Choose the lesson type. It can&apos;t change after the lesson is created.
          </DialogDescription>
        </DialogHeader>
        <fieldset aria-label="Lesson type" className="grid gap-2 border-0 p-0">
          {COURSE_LESSON_TYPES.map((value) => {
            const { label, description, icon: Icon } = lessonTypeDetails[value];
            const locked = value === "scorm" && !scormIncluded;
            return (
              <button
                key={value}
                type="button"
                disabled={busy || locked}
                title={locked ? PLAN_FEATURE_COPY.scorm : undefined}
                onClick={() => onChoose(value)}
                className="flex items-start gap-3 rounded-[var(--radius)] border bg-card px-4 py-3 text-left transition-colors hover:border-primary hover:bg-[var(--primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card"
              >
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 space-y-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    {label}
                    {value === "scorm" ? (
                      <span className="rounded border px-1 text-[10px] font-medium text-muted-foreground">
                        {locked ? "Business" : "Alpha"}
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {locked ? PLAN_FEATURE_COPY.scorm : description}
                  </span>
                </span>
              </button>
            );
          })}
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
