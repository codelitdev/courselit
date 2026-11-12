"use client";

import {
  ChevronDown,
  Clock,
  GripVertical,
  Mail,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { type Dispatch, type SetStateAction, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/codelit/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/codelit/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/codelit/dropdown-menu";
import { Input } from "@/components/ui/codelit/input";
import { Label } from "@/components/ui/codelit/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/codelit/select";
import {
  type DripForm,
  type DripMode,
  draftLessonIds,
  dripBody,
  dripFormFor,
  dripLabel,
  lessonCounts,
  lessonMeta,
  lessonShortLabel,
  nextSectionName,
  type ProductPhase,
  plural,
  sectionSummary,
  validateDripForm,
} from "@/lib/product-publishing";
import { cn } from "@/lib/utils";
import type { Lesson, Section } from "./product-types";
import { AddRow, CardHead, WorkspaceCard } from "./product-ui";
import {
  errorText,
  type ProductDetail,
  type WorkspaceRequest,
} from "./product-workspace";

type DropPosition = "before" | "after";

function DropLine({ position }: { position: DropPosition }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 right-0 z-30 flex items-center",
        position === "before" ? "-top-1" : "-bottom-1",
      )}
    >
      <div className="size-2 rounded-full bg-primary shadow-sm" />
      <div className="h-0.5 flex-1 bg-primary shadow-sm" />
    </div>
  );
}

/** The live/draft switch on a lesson row. */
function StatusSwitch({
  live,
  title,
  disabled,
  onToggle,
}: {
  live: boolean;
  title: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={live}
      aria-label={
        live
          ? `${title}: live. Turn off to move it to drafts`
          : `${title}: draft. Turn on to make it live`
      }
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border pl-3 pr-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        live
          ? "border-transparent bg-success-soft text-success-ink"
          : "border-border bg-card text-muted-foreground hover:border-input",
      )}
    >
      <span className="hidden sm:inline">{live ? "Live" : "Draft"}</span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-[18px] w-[30px] rounded-full transition-colors",
          live ? "bg-success" : "bg-input",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-3.5 rounded-full bg-card shadow-[0_1px_2px_oklch(0_0_0/0.2)] transition-transform",
            live && "translate-x-3",
          )}
        />
      </span>
    </button>
  );
}

function DripEditor({
  section,
  productRoot,
  busy,
  onCancel,
  onSave,
}: {
  section: Section;
  productRoot: string;
  busy: boolean;
  onCancel: () => void;
  onSave: (form: DripForm) => void;
}) {
  const [form, setForm] = useState<DripForm>(() => dripFormFor(section));
  const [error, setError] = useState<string | null>(null);
  const idBase = `drip-${section.id}`;

  return (
    <div className="flex flex-col gap-3.5 border-b bg-muted/50 px-5 py-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="field min-w-[200px] flex-[0_1_320px]">
          <Label htmlFor={`${idBase}-mode`}>Release</Label>
          <Select
            value={form.mode}
            onValueChange={(value) => {
              setError(null);
              setForm((current) => ({ ...current, mode: value as DripMode }));
            }}
          >
            <SelectTrigger
              id={`${idBase}-mode`}
              className="w-full bg-card"
              aria-label={`When ${section.title} is released`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="now">Right away</SelectItem>
              <SelectItem value="relative-date">
                Days after the previous section
              </SelectItem>
              <SelectItem value="exact-date">On a date</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.mode === "relative-date" ? (
          <div className="field min-w-[200px] flex-[0_1_320px]">
            <Label htmlFor={`${idBase}-days`}>Days after previous section</Label>
            <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Input
                id={`${idBase}-days`}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className="w-[110px] bg-card"
                value={form.days}
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                  setError(null);
                  setForm((current) => ({ ...current, days: event.target.value }));
                }}
              />
              days
            </span>
          </div>
        ) : null}
        {form.mode === "exact-date" ? (
          <div className="field min-w-[200px] flex-[0_1_320px]">
            <Label htmlFor={`${idBase}-at`}>Release date</Label>
            <Input
              id={`${idBase}-at`}
              type="datetime-local"
              className="bg-card"
              value={form.at}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setError(null);
                setForm((current) => ({ ...current, at: event.target.value }));
              }}
            />
          </div>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2.5 border-t pt-3">
        <p className="flex-[1_1_260px] text-[13px] text-muted-foreground">
          {form.mode === "now"
            ? "Learners can open this section as soon as they join."
            : "Learners see this section locked until then. You can email them when it unlocks."}
        </p>
        {form.mode !== "now" ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={`${productRoot}/content/section/${encodeURIComponent(section.id)}/email`}
            >
              <Mail className="size-4" /> Edit unlock email
            </Link>
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => {
            const problem = validateDripForm(form);
            setError(problem);
            if (!problem) onSave(form);
          }}
        >
          {busy ? "Saving…" : "Done"}
        </Button>
      </div>
    </div>
  );
}

export function ProductContent({
  product,
  setProduct,
  phase,
  productRoot,
  request,
  refresh,
}: {
  product: ProductDetail;
  setProduct: Dispatch<SetStateAction<ProductDetail | null>>;
  phase: ProductPhase;
  productRoot: string;
  request: WorkspaceRequest;
  refresh: () => Promise<void>;
}) {
  const productId = product.id;
  const isDownload = product.kind === "download";
  const noun = isDownload ? "file" : "lesson";
  const [busy, setBusy] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [dripOpen, setDripOpen] = useState<string | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);

  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [dragOverLesson, setDragOverLesson] = useState<{
    id: string;
    position: DropPosition;
  } | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<{
    id: string;
    position: DropPosition;
  } | null>(null);
  const draggedLessonIdRef = useRef<string | null>(null);
  const draggedSectionIdRef = useRef<string | null>(null);
  const wasDraggingRef = useRef(false);

  const counts = lessonCounts(product.lessons);
  const courseLive = phase === "live";
  const lessonsBySection = (sectionId: string) =>
    product.lessons.filter((lesson) => lesson.sectionId === sectionId);

  // ---------------------------------------------------------------------------
  // Lesson status

  async function setLessonStatus(
    ids: string[],
    status: Lesson["status"],
    message: string,
    undoable = true,
  ) {
    if (ids.length === 0 || busy) return;
    const previous = new Map(
      product.lessons
        .filter((lesson) => ids.includes(lesson.id))
        .map((l) => [l.id, l.status]),
    );
    setProduct((current) =>
      current
        ? {
            ...current,
            lessons: current.lessons.map((lesson) =>
              ids.includes(lesson.id) ? { ...lesson, status } : lesson,
            ),
          }
        : current,
    );
    setBusy(true);
    const changed: string[] = [];
    try {
      for (const id of ids) {
        await request(`/api/v1/lessons/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        changed.push(id);
      }
      toast.success(message, {
        action: undoable
          ? {
              label: "Undo",
              onClick: () => {
                const opposite: Lesson["status"] =
                  status === "published" ? "draft" : "published";
                const back = changed.filter((id) => previous.get(id) === opposite);
                void setLessonStatus(back, opposite, "Undone", false);
              },
            }
          : undefined,
      });
    } catch (caught) {
      toast.error(errorText(caught, `Unable to update the ${noun}.`));
    } finally {
      setBusy(false);
      await refresh().catch(() => undefined);
    }
  }

  function toggleLesson(lesson: Lesson) {
    const live = lesson.status === "published";
    void setLessonStatus(
      [lesson.id],
      live ? "draft" : "published",
      live ? `Moved “${lesson.title}” to drafts` : `“${lesson.title}” is live`,
    );
  }

  function makeLive(lessons: Lesson[], where?: string) {
    const ids = draftLessonIds(lessons);
    void setLessonStatus(
      ids,
      "published",
      `Made ${plural(ids.length, noun)}${where ? ` in ${where}` : ""} live`,
    );
  }

  async function setNewLessonStatus(status: Lesson["status"]) {
    if (busy || product.newLessonStatus === status) return;
    setBusy(true);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ newLessonStatus: status }),
      });
      await refresh();
    } catch (caught) {
      toast.error(errorText(caught, "Unable to save the default."));
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Sections

  async function addSection() {
    if (busy) return;
    const title = nextSectionName(product.sections);
    setBusy(true);
    try {
      const created = await request<Section>(
        `/api/v1/products/${encodeURIComponent(productId)}/sections`,
        { method: "POST", body: JSON.stringify({ title }) },
      );
      await refresh();
      setRenaming({ id: created.id, title: created.title });
    } catch (caught) {
      toast.error(errorText(caught, "Unable to add a section."));
    } finally {
      setBusy(false);
    }
  }

  async function patchSection(
    section: Section,
    body: Record<string, unknown>,
    done: string,
  ) {
    setBusy(true);
    try {
      await request(`/api/v1/sections/${encodeURIComponent(section.id)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await refresh();
      toast.success(done);
      return true;
    } catch (caught) {
      toast.error(errorText(caught, "Unable to save the section."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveRename() {
    if (!renaming) return;
    const section = product.sections.find((item) => item.id === renaming.id);
    const title = renaming.title.trim();
    if (!section || !title || title === section.title) {
      setRenaming(null);
      return;
    }
    if (await patchSection(section, { title }, `Renamed to ${title}`))
      setRenaming(null);
  }

  async function saveDrip(section: Section, form: DripForm) {
    if (await patchSection(section, dripBody(form), "Drip release saved"))
      setDripOpen(null);
  }

  async function deleteSection(section: Section) {
    if (busy) return;
    setBusy(true);
    try {
      await request(`/api/v1/sections/${encodeURIComponent(section.id)}`, {
        method: "DELETE",
      });
      await refresh();
      setSectionToDelete(null);
      toast.success(`Deleted ${section.title}`);
    } catch (caught) {
      toast.error(errorText(caught, "Unable to delete the section."));
    } finally {
      setBusy(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Reordering (drag and drop, plus arrow keys on the grips)

  async function reorderSectionsTo(newSections: Section[]) {
    if (busy) return;
    const previous = product.sections;
    setProduct((current) => (current ? { ...current, sections: newSections } : null));
    setBusy(true);
    try {
      await request(
        `/api/v1/products/${encodeURIComponent(productId)}/sections/reorder`,
        {
          method: "POST",
          body: JSON.stringify({ sectionIds: newSections.map((item) => item.id) }),
        },
      );
      await refresh();
    } catch (caught) {
      setProduct((current) => (current ? { ...current, sections: previous } : null));
      toast.error(errorText(caught, "Unable to reorder sections."));
    } finally {
      setBusy(false);
    }
  }

  async function reorderLessonsTo(
    newLessons: Lesson[],
    sectionAssignments: Array<{ lessonId: string; sectionId: string | null }>,
  ) {
    if (busy) return;
    const previous = product.lessons;
    setProduct((current) => (current ? { ...current, lessons: newLessons } : null));
    setBusy(true);
    try {
      await request(
        `/api/v1/products/${encodeURIComponent(productId)}/lessons/reorder`,
        {
          method: "POST",
          body: JSON.stringify({
            lessonIds: newLessons.map((item) => item.id),
            sectionAssignments:
              sectionAssignments.length > 0 ? sectionAssignments : undefined,
          }),
        },
      );
      await refresh();
    } catch (caught) {
      setProduct((current) => (current ? { ...current, lessons: previous } : null));
      toast.error(errorText(caught, `Unable to reorder ${noun}s.`));
    } finally {
      setBusy(false);
    }
  }

  async function moveSection(sectionId: string, direction: -1 | 1) {
    if (busy) return;
    const index = product.sections.findIndex((section) => section.id === sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= product.sections.length) return;
    const reordered = [...product.sections];
    const [section] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, section!);
    await reorderSectionsTo(reordered);
  }

  function clearLessonDrag() {
    draggedLessonIdRef.current = null;
    setDraggedLessonId(null);
    setDragOverLesson(null);
    setDragOverSectionId(null);
  }

  /** Moves a lesson before/after another lesson, or to the end of a section. */
  function placeLesson(
    draggedId: string,
    targetSectionId: string,
    target?: { lessonId: string; position: DropPosition },
  ) {
    const dragged = product.lessons.find((l) => l.id === draggedId);
    clearLessonDrag();
    if (!dragged || target?.lessonId === draggedId) return;
    const sectionChanged = dragged.sectionId !== targetSectionId;
    const updatedDragged: Lesson = { ...dragged, sectionId: targetSectionId };
    const bySection = new Map<string, Lesson[]>();
    for (const sec of product.sections) {
      bySection.set(
        sec.id,
        product.lessons.filter((l) => l.sectionId === sec.id && l.id !== draggedId),
      );
    }
    const targetList = bySection.get(targetSectionId) ?? [];
    const targetIdx = target
      ? targetList.findIndex((l) => l.id === target.lessonId)
      : -1;
    if (target && targetIdx >= 0) {
      targetList.splice(
        target.position === "before" ? targetIdx : targetIdx + 1,
        0,
        updatedDragged,
      );
    } else {
      targetList.push(updatedDragged);
    }
    bySection.set(targetSectionId, targetList);
    const flattened: Lesson[] = [];
    for (const sec of product.sections)
      flattened.push(...(bySection.get(sec.id) ?? []));
    flattened.push(
      ...product.lessons.filter((l) => !l.sectionId && l.id !== draggedId),
    );
    void reorderLessonsTo(
      flattened.map((lesson, idx) => ({ ...lesson, position: idx + 1 })),
      sectionChanged ? [{ lessonId: draggedId, sectionId: targetSectionId }] : [],
    );
  }

  function moveLessonByOffset(lessonId: string, sectionId: string, offset: -1 | 1) {
    if (busy) return;
    const sectionLessons = lessonsBySection(sectionId);
    const index = sectionLessons.findIndex((l) => l.id === lessonId);
    const target = sectionLessons[index + offset];
    if (index < 0 || !target) return;
    placeLesson(lessonId, sectionId, {
      lessonId: target.id,
      position: offset === -1 ? "before" : "after",
    });
  }

  function handleSectionDrop(
    targetSectionId: string,
    position: DropPosition,
    draggedId: string,
  ) {
    draggedSectionIdRef.current = null;
    setDraggedSectionId(null);
    setDragOverSection(null);
    if (draggedId === targetSectionId) return;
    const index = product.sections.findIndex((s) => s.id === draggedId);
    if (index < 0 || !product.sections.some((s) => s.id === targetSectionId)) return;
    const reordered = [...product.sections];
    const [dragged] = reordered.splice(index, 1);
    const newTargetIndex = reordered.findIndex((s) => s.id === targetSectionId);
    reordered.splice(
      position === "before" ? newTargetIndex : newTargetIndex + 1,
      0,
      dragged!,
    );
    void reorderSectionsTo(
      reordered.map((section, pos) => ({ ...section, position: pos + 1 })),
    );
  }

  const activeLessonDrag = () => draggedLessonId || draggedLessonIdRef.current;
  const activeSectionDrag = () => draggedSectionId || draggedSectionIdRef.current;
  const halfOf = (event: React.DragEvent<HTMLElement>): DropPosition => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  };

  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-0 flex-[1_1_260px]">
          <b className="text-base">
            {counts.live} of {plural(counts.total, noun)} live
          </b>
          <p className="mt-0.5 text-[13.5px] text-muted-foreground">
            {courseLive
              ? `Live ${noun}s are visible to learners right away. Drafts stay hidden.`
              : `The ${isDownload ? "download" : "course"} isn't live yet, so nothing here is visible to learners.`}
          </p>
        </div>
        {counts.drafts > 0 ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => makeLive(product.lessons)}
          >
            Make all {counts.drafts} {counts.drafts === 1 ? "draft" : "drafts"} live
          </Button>
        ) : null}
      </div>

      {product.sections.length === 0 ? (
        <WorkspaceCard className="border-dashed px-6 py-14 text-center">
          <b className="text-base">Start with a section</b>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Sections group lessons, like chapters or weeks. Add one, then add lessons to
            it. You can reorder everything later.
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={busy}
            onClick={() => void addSection()}
          >
            Add section
          </Button>
        </WorkspaceCard>
      ) : null}

      {product.sections.map((section) => {
        const collapsed = collapsedSections.includes(section.id);
        const lessons = lessonsBySection(section.id);
        const sectionDrafts = draftLessonIds(lessons);
        const badge = dripLabel(section);
        const isRenaming = renaming?.id === section.id;
        const canDelete = !(isDownload && product.sections.length === 1);
        return (
          <WorkspaceCard
            key={section.id}
            aria-label={section.title}
            className={cn(
              "relative overflow-visible",
              draggedSectionId === section.id &&
                "border-dashed border-primary/30 opacity-30",
            )}
            onDragOver={(event) => {
              const dragged = activeSectionDrag();
              if (!dragged || dragged === section.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const position = halfOf(event);
              if (
                dragOverSection?.id !== section.id ||
                dragOverSection.position !== position
              ) {
                setDragOverSection({ id: section.id, position });
              }
            }}
            onDragLeave={(event) => {
              if (
                activeSectionDrag() &&
                !event.currentTarget.contains(event.relatedTarget as Node | null)
              ) {
                setDragOverSection((current) =>
                  current?.id === section.id ? null : current,
                );
              }
            }}
            onDrop={(event) => {
              const dragged =
                activeSectionDrag() || event.dataTransfer.getData("text/plain");
              if (
                !dragged ||
                dragged === section.id ||
                !product.sections.some((s) => s.id === dragged)
              )
                return;
              event.preventDefault();
              event.stopPropagation();
              const position =
                dragOverSection?.id === section.id
                  ? dragOverSection.position
                  : halfOf(event);
              handleSectionDrop(section.id, position, dragged);
            }}
          >
            {dragOverSection?.id === section.id ? (
              <DropLine position={dragOverSection.position} />
            ) : null}

            <div
              className={cn(
                "flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-t-xl bg-muted/50 py-2.5 pl-3.5 pr-3",
                (!collapsed || dripOpen === section.id) && "border-b",
                collapsed && dripOpen !== section.id && "rounded-b-xl",
              )}
            >
              <button
                type="button"
                draggable={!busy}
                onDragStart={(event) => {
                  event.stopPropagation();
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", section.id);
                  draggedSectionIdRef.current = section.id;
                  wasDraggingRef.current = true;
                  const card = event.currentTarget.closest<HTMLElement>("section");
                  if (card && event.dataTransfer.setDragImage) {
                    const rect = card.getBoundingClientRect();
                    event.dataTransfer.setDragImage(
                      card,
                      event.clientX - rect.left,
                      24,
                    );
                  }
                  requestAnimationFrame(() => setDraggedSectionId(section.id));
                }}
                onDragEnd={() => {
                  draggedSectionIdRef.current = null;
                  setDraggedSectionId(null);
                  setDragOverSection(null);
                  setTimeout(() => {
                    wasDraggingRef.current = false;
                  }, 200);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    void moveSection(section.id, -1);
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    void moveSection(section.id, 1);
                  }
                }}
                className="hidden size-7 cursor-grab select-none items-center justify-center rounded text-input hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:cursor-grabbing sm:flex"
                aria-label={`Drag to reorder section: ${section.title}. Press up or down arrow to move.`}
                title="Drag to reorder section"
              >
                <GripVertical className="pointer-events-none size-4" />
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-8 px-0"
                aria-expanded={!collapsed}
                aria-label={`${collapsed ? "Expand" : "Collapse"} ${section.title}`}
                onClick={() =>
                  setCollapsedSections((current) =>
                    current.includes(section.id)
                      ? current.filter((id) => id !== section.id)
                      : [...current, section.id],
                  )
                }
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    collapsed && "-rotate-90",
                  )}
                />
              </Button>
              {isRenaming ? (
                <form
                  className="flex min-w-0 flex-[0_1_340px] items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void saveRename();
                  }}
                >
                  <Input
                    autoFocus
                    onFocus={(event) => event.currentTarget.select()}
                    aria-label="Section name"
                    className="h-[34px] bg-card font-semibold"
                    maxLength={200}
                    value={renaming.title}
                    onChange={(event) =>
                      setRenaming({ id: section.id, title: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setRenaming(null);
                    }}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !renaming.title.trim()}
                  >
                    Done
                  </Button>
                </form>
              ) : (
                <b className="min-w-0 truncate text-[15.5px]">{section.title}</b>
              )}
              {badge ? (
                <button
                  type="button"
                  title="Drip release"
                  onClick={() => setDripOpen(section.id)}
                  className="inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-full bg-muted px-[9px] text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Clock className="size-[13px]" aria-hidden="true" />
                  {badge}
                </button>
              ) : null}
              <span className="flex-1 text-[13px] text-muted-foreground">
                {sectionSummary(lessons)}
              </span>
              {sectionDrafts.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={busy}
                  onClick={() => makeLive(lessons, section.title)}
                >
                  Make {sectionDrafts.length} live
                </Button>
              ) : null}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-8 px-0"
                    aria-label={`More for ${section.title}`}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() =>
                      setRenaming({ id: section.id, title: section.title })
                    }
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setDripOpen(section.id)}>
                    Drip release
                  </DropdownMenuItem>
                  {canDelete ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={busy}
                        onSelect={() => setSectionToDelete(section)}
                      >
                        Delete section
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {dripOpen === section.id ? (
              <DripEditor
                section={section}
                productRoot={productRoot}
                busy={busy}
                onCancel={() => setDripOpen(null)}
                onSave={(form) => void saveDrip(section, form)}
              />
            ) : null}

            {!collapsed ? (
              <ul
                aria-label={`${isDownload ? "Files" : "Lessons"} in ${section.title}`}
                className={cn(
                  "transition-colors",
                  dragOverSectionId === section.id &&
                    !dragOverLesson &&
                    "bg-[var(--primary-soft)]",
                )}
                onDragOver={(event) => {
                  if (!activeLessonDrag()) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverSectionId !== section.id)
                    setDragOverSectionId(section.id);
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node | null)
                  ) {
                    setDragOverSectionId((current) =>
                      current === section.id ? null : current,
                    );
                  }
                }}
                onDrop={(event) => {
                  const dragged =
                    activeLessonDrag() || event.dataTransfer.getData("text/plain");
                  if (
                    !dragged ||
                    dragOverLesson ||
                    !product.lessons.some((l) => l.id === dragged)
                  )
                    return;
                  event.preventDefault();
                  placeLesson(dragged, section.id);
                }}
              >
                {lessons.length === 0 ? (
                  <li
                    aria-label={`Empty section: ${section.title}`}
                    className={cn(
                      "px-5 pt-3.5 text-[13px] text-muted-foreground",
                      dragOverSectionId === section.id && "font-medium text-primary",
                    )}
                  >
                    No {noun}s in this section yet.
                    {dragOverSectionId === section.id ? ` Drop the ${noun} here.` : ""}
                  </li>
                ) : null}
                {lessons.map((lesson) => {
                  const live = lesson.status === "published";
                  const over =
                    dragOverLesson?.id === lesson.id ? dragOverLesson.position : null;
                  return (
                    <li
                      key={lesson.id}
                      data-lesson-row
                      className={cn(
                        "relative grid min-h-[58px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-2.5 sm:grid-cols-[18px_34px_minmax(0,1fr)_auto] sm:px-5",
                        draggedLessonId === lesson.id &&
                          "border-dashed bg-muted/60 opacity-30",
                      )}
                      onDragOver={(event) => {
                        const dragged = activeLessonDrag();
                        if (!dragged || dragged === lesson.id) return;
                        event.preventDefault();
                        event.stopPropagation();
                        event.dataTransfer.dropEffect = "move";
                        const position = halfOf(event);
                        if (
                          dragOverLesson?.id !== lesson.id ||
                          dragOverLesson.position !== position
                        ) {
                          setDragOverLesson({ id: lesson.id, position });
                        }
                        if (dragOverSectionId !== null) setDragOverSectionId(null);
                      }}
                      onDragLeave={(event) => {
                        if (
                          !event.currentTarget.contains(
                            event.relatedTarget as Node | null,
                          )
                        ) {
                          setDragOverLesson((current) =>
                            current?.id === lesson.id ? null : current,
                          );
                        }
                      }}
                      onDrop={(event) => {
                        const dragged =
                          activeLessonDrag() ||
                          event.dataTransfer.getData("text/plain");
                        if (
                          !dragged ||
                          dragged === lesson.id ||
                          !product.lessons.some((l) => l.id === dragged)
                        )
                          return;
                        event.preventDefault();
                        event.stopPropagation();
                        placeLesson(dragged, section.id, {
                          lessonId: lesson.id,
                          position:
                            dragOverLesson?.id === lesson.id
                              ? dragOverLesson.position
                              : halfOf(event),
                        });
                      }}
                    >
                      {over ? <DropLine position={over} /> : null}
                      <button
                        type="button"
                        draggable={!busy}
                        onDragStart={(event) => {
                          event.stopPropagation();
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", lesson.id);
                          draggedLessonIdRef.current = lesson.id;
                          wasDraggingRef.current = true;
                          const row =
                            event.currentTarget.closest<HTMLElement>(
                              "[data-lesson-row]",
                            );
                          if (row && event.dataTransfer.setDragImage) {
                            const rect = row.getBoundingClientRect();
                            event.dataTransfer.setDragImage(
                              row,
                              event.clientX - rect.left,
                              event.clientY - rect.top,
                            );
                          }
                          requestAnimationFrame(() => setDraggedLessonId(lesson.id));
                        }}
                        onDragEnd={() => {
                          clearLessonDrag();
                          setTimeout(() => {
                            wasDraggingRef.current = false;
                          }, 200);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            moveLessonByOffset(lesson.id, section.id, -1);
                          } else if (event.key === "ArrowDown") {
                            event.preventDefault();
                            moveLessonByOffset(lesson.id, section.id, 1);
                          }
                        }}
                        className="hidden h-7 w-[18px] cursor-grab select-none items-center justify-center rounded text-input hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:cursor-grabbing sm:flex"
                        aria-label={`Drag to reorder ${noun}: ${lesson.title}. Press up or down arrow to move.`}
                        title={`Drag to reorder ${noun}`}
                      >
                        <GripVertical className="pointer-events-none size-4" />
                      </button>
                      <span
                        aria-hidden="true"
                        className="grid size-[34px] place-items-center rounded-[8px] bg-muted font-mono text-[10.5px] font-semibold text-muted-foreground"
                      >
                        {lessonShortLabel(lesson.type)}
                      </span>
                      <Link
                        href={`${productRoot}/content/section/${section.id}/lesson?id=${encodeURIComponent(lesson.id)}`}
                        className={cn(
                          "flex min-w-0 flex-col gap-0.5 rounded focus-visible:outline-2 focus-visible:outline-ring",
                          activeLessonDrag() && "pointer-events-none select-none",
                        )}
                        onClick={(event) => {
                          if (wasDraggingRef.current) event.preventDefault();
                        }}
                      >
                        <b className="truncate text-[15px] font-medium hover:underline">
                          {lesson.title}
                        </b>
                        <span className="text-[12.5px] text-muted-foreground">
                          {lessonMeta(lesson, product.kind)}
                        </span>
                      </Link>
                      <StatusSwitch
                        live={live}
                        title={lesson.title}
                        disabled={busy}
                        onToggle={() => toggleLesson(lesson)}
                      />
                    </li>
                  );
                })}
                <li>
                  <Link
                    href={`${productRoot}/content/section/${section.id}/lesson`}
                    className="flex items-center gap-2.5 rounded-b-xl px-5 pb-3.5 pt-3 text-sm font-semibold text-muted-foreground hover:bg-muted/50 hover:text-[var(--primary-ink)] sm:pl-[50px]"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add {noun}
                  </Link>
                </li>
              </ul>
            ) : null}
          </WorkspaceCard>
        );
      })}

      {product.sections.length > 0 && !isDownload ? (
        <AddRow
          title="Add section"
          description="Group lessons into chapters, modules or weeks."
          icon={<Plus className="size-4" />}
          disabled={busy}
          onClick={() => void addSection()}
        />
      ) : null}

      <WorkspaceCard>
        <CardHead
          className="pb-5"
          title={`New ${noun}s start as`}
          description={
            product.newLessonStatus === "published"
              ? `Live: new ${noun}s are visible as soon as you save them.`
              : `Draft: new ${noun}s stay hidden until you make them live.`
          }
          action={
            <div
              role="group"
              aria-label={`New ${noun}s start as`}
              className="inline-flex rounded-[var(--radius)] bg-muted p-[3px]"
            >
              {(["draft", "published"] as const).map((status) => {
                const on = (product.newLessonStatus ?? "draft") === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={on}
                    disabled={busy}
                    onClick={() => void setNewLessonStatus(status)}
                    className={cn(
                      "h-[30px] rounded-[calc(var(--radius)-3px)] px-3 text-[13px] font-semibold transition-colors",
                      on
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {status === "draft" ? "Draft" : "Live"}
                  </button>
                );
              })}
            </div>
          }
        />
      </WorkspaceCard>

      <Dialog
        open={Boolean(sectionToDelete)}
        onOpenChange={(open) => !open && setSectionToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {sectionToDelete?.title}?</DialogTitle>
            <DialogDescription>
              {sectionToDelete && lessonsBySection(sectionToDelete.id).length > 0
                ? `It still has ${plural(lessonsBySection(sectionToDelete.id).length, noun)}. Move or delete them first.`
                : "This can't be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSectionToDelete(null)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (sectionToDelete) void deleteSection(sectionToDelete);
              }}
              disabled={busy || !sectionToDelete}
            >
              {busy ? "Deleting…" : "Delete section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
