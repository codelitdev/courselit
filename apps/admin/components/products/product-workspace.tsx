"use client";

import type { Editor } from "@frontlit/text-editor";
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDashed,
  Download,
  Droplets,
  Eye,
  File,
  FileImage,
  FileText,
  GripVertical,
  Globe,
  Headphones,
  HelpCircle,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Save,
  Settings,
  Share2,
  Trash2,
  Tv,
  UserPlus,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  type ComponentProps,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AuthGate } from "@/components/auth-gate";
import { useSetBreadcrumb } from "@/components/layout/breadcrumb-context";
import { PageHeader } from "@/components/layout/page-header";
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
import { Switch } from "@/components/ui/codelit/switch";
import { learnerUrl } from "@/lib/learner-url";
import { cn } from "@/lib/utils";
import { PaymentPlanList } from "./payment-plan-list";
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
  ProductAnalytics,
} from "./product-analytics";
import { ProductCertificates } from "./product-certificates";
import { ProductFeaturedImage } from "./product-featured-image";
import type {
  Lesson,
  Product,
  ProductKind,
  School,
  Section,
  StorefrontPlan,
} from "./product-types";
import { RichTextEditor } from "./rich-text-editor";

export type ProductWorkspaceView = "overview" | "content" | "manage";

type ProductDetail = Product & {
  sections: Section[];
  lessons: Lesson[];
};

type ApiError = {
  message?: string;
  details?: { reason?: string };
};

function kindLabel(kind: ProductKind) {
  return kind === "course" ? "Course" : "Digital download";
}

function LessonTypeIcon({ type }: { type: Lesson["type"] }) {
  switch (type) {
    case "text":
      return <FileText className="size-4 text-muted-foreground" />;
    case "video":
      return <Video className="size-4 text-muted-foreground" />;
    case "audio":
      return <Headphones className="size-4 text-muted-foreground" />;
    case "pdf":
      return <FileImage className="size-4 text-muted-foreground" />;
    case "file":
      return <File className="size-4 text-muted-foreground" />;
    case "embed":
      return <Tv className="size-4 text-muted-foreground" />;
    case "quiz":
      return <HelpCircle className="size-4 text-muted-foreground" />;
    case "scorm":
      return <Package className="size-4 text-muted-foreground" />;
  }
}

function formatUpdatedAt(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "recently";

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "less than a minute ago";
  if (seconds < 60 * 60) {
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (seconds < 60 * 60 * 24) {
    const hours = Math.round(seconds / (60 * 60));
    return `about ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (seconds < 60 * 60 * 24 * 30) {
    const days = Math.round(seconds / (60 * 60 * 24));
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  if (seconds < 60 * 60 * 24 * 365) {
    const months = Math.round(seconds / (60 * 60 * 24 * 30));
    return `about ${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.round(seconds / (60 * 60 * 24 * 365));
  return `about ${years} year${years === 1 ? "" : "s"} ago`;
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      {children}
    </p>
  );
}

function editorContent(value: string): ComponentProps<typeof Editor>["initialContent"] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // Legacy and newly-created plain-text descriptions are valid editor input.
  }
  return value;
}

export function ProductWorkspace({
  productId,
  view,
}: {
  productId: string;
  view: ProductWorkspaceView;
}) {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [plans, setPlans] = useState<StorefrontPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("7d");

  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [dragOverLesson, setDragOverLesson] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<{
    id: string;
    position: "before" | "after";
  } | null>(null);
  const draggedLessonIdRef = useRef<string | null>(null);
  const draggedSectionIdRef = useRef<string | null>(null);
  const wasDraggingRef = useRef(false);

  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [slugDraft, setSlugDraft] = useState("");
  const [discussionsDraft, setDiscussionsDraft] = useState(false);
  const [publishStatus, setPublishStatus] = useState<Product["status"]>("draft");
  const [privacyDraft, setPrivacyDraft] = useState<Product["privacy"]>("unlisted");
  const [leadMagnetDraft, setLeadMagnetDraft] = useState(false);
  const [certificateDraft, setCertificateDraft] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [sectionDeleteDialogOpen, setSectionDeleteDialogOpen] = useState(false);

  const request = useCallback(
    async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const requestHeaders = new Headers(init.headers);
      requestHeaders.set("x-school-id", school?.id ?? "");
      if (init.body && !requestHeaders.has("content-type")) {
        requestHeaders.set("content-type", "application/json");
      }
      const response = await fetch(path, {
        ...init,
        credentials: "include",
        cache: "no-store",
        headers: requestHeaders,
      });
      const body = (await response.json().catch(() => null)) as T & ApiError;
      if (!response.ok) {
        const message =
          body?.details?.reason === "section_not_empty"
            ? "This section has lessons. Delete them before proceeding."
            : body?.details?.reason === "download_last_section"
              ? "A digital download must keep at least one section."
              : body?.details?.reason === "default_plan_cannot_be_archived"
                ? "The default payment plan cannot be archived. Select another default first."
                : body?.details?.reason === "duplicate_payment_plan"
                  ? "A payment plan with this type and frequency already exists."
                  : body?.details?.reason === "included_products_not_allowed"
                    ? "Product payment plans cannot include other products."
                    : body?.details?.reason === "product_financial_history"
                      ? "This product has financial history and cannot be deleted."
                      : (body?.message ?? "The request could not be completed.");
        throw new Error(message);
      }
      return body as T;
    },
    [school],
  );

  const loadProduct = useCallback(
    async (activeSchool: School, active = true) => {
      const loaded = await fetch(`/api/v1/products/${encodeURIComponent(productId)}`, {
        credentials: "include",
        cache: "no-store",
        headers: { "x-school-id": activeSchool.id },
      });
      if (!active) return;
      if (!loaded.ok) {
        if (loaded.status === 404) {
          router.replace("/products");
          return;
        }
        throw new Error("Unable to load the product.");
      }
      const detail = (await loaded.json()) as ProductDetail;
      const salesPageResponse = await fetch(
        `/api/v1/sales-pages/product/${encodeURIComponent(productId)}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { "x-school-id": activeSchool.id },
        },
      );
      const salesPage = salesPageResponse.ok
        ? ((await salesPageResponse.json()) as ProductDetail["salesPage"])
        : null;
      const detailWithSalesPage = { ...detail, salesPage };
      setProduct(detailWithSalesPage);
      setTitleDraft(detailWithSalesPage.title);
      setDescriptionDraft(detailWithSalesPage.description);
      setSlugDraft(detailWithSalesPage.slug);
      setDiscussionsDraft(detailWithSalesPage.discussions);
      setPublishStatus(detailWithSalesPage.status);
      setPrivacyDraft(detailWithSalesPage.privacy);
      setLeadMagnetDraft(detailWithSalesPage.leadMagnet);
      setCertificateDraft(detailWithSalesPage.certificate);
    },
    [productId, router],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then(async (body: { items?: School[] }) => {
        const selected = body.items?.find((item) => item.selected) ?? body.items?.[0];
        if (!selected) throw new Error("Create a school before managing products.");
        if (active) setSchool(selected);
        await loadProduct(selected, active);
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error ? caught.message : "Unable to load the product.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadProduct]);

  useEffect(() => {
    if (!school || view !== "manage") return;
    void request<{ items?: StorefrontPlan[] }>(
      `/api/v1/products/${encodeURIComponent(productId)}/plans`,
    )
      .then((body) => setPlans(body.items ?? []))
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load payment plans.",
        ),
      );
  }, [productId, request, school, view]);

  async function refresh() {
    if (!school) return;
    await loadProduct(school);
    if (view === "manage") {
      const body = await request<{ items?: StorefrontPlan[] }>(
        `/api/v1/products/${encodeURIComponent(productId)}/plans`,
      );
      setPlans(body.items ?? []);
    }
  }

  async function reorderSectionsTo(newSections: Section[]) {
    if (!product || saving) return;
    const previous = product.sections;
    setProduct((current) => (current ? { ...current, sections: newSections } : null));
    setSaving(true);
    setError(null);
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
      setError(
        caught instanceof Error ? caught.message : "Unable to reorder sections.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function reorderLessonsTo(
    newLessons: Lesson[],
    sectionAssignments: Array<{ lessonId: string; sectionId: string | null }>,
  ) {
    if (!product || saving) return;
    const previous = product.lessons;
    setProduct((current) => (current ? { ...current, lessons: newLessons } : null));
    setSaving(true);
    setError(null);
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
      setError(caught instanceof Error ? caught.message : "Unable to reorder lessons.");
    } finally {
      setSaving(false);
    }
  }

  async function moveSection(sectionId: string, direction: -1 | 1) {
    if (!product || saving) return;
    const index = product.sections.findIndex((section) => section.id === sectionId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= product.sections.length) return;
    const reordered = [...product.sections];
    const [section] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, section!);
    await reorderSectionsTo(reordered);
  }

  function moveLessonByOffset(lessonId: string, sectionId: string, offset: -1 | 1) {
    if (!product || saving) return;
    const sectionLessons = lessonsBySection(sectionId);
    const index = sectionLessons.findIndex((l) => l.id === lessonId);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= sectionLessons.length) return;
    const targetLesson = sectionLessons[nextIndex];
    if (!targetLesson) return;
    handleLessonDrop(
      targetLesson.id,
      sectionId,
      offset === -1 ? "before" : "after",
      lessonId,
    );
  }

  function handleLessonDrop(
    targetLessonId: string,
    targetSectionId: string,
    position: "before" | "after",
    explicitDraggedId?: string,
  ) {
    const currentDraggedId =
      explicitDraggedId || draggedLessonId || draggedLessonIdRef.current;
    if (!currentDraggedId || !product) return;
    if (currentDraggedId === targetLessonId) {
      draggedLessonIdRef.current = null;
      setDraggedLessonId(null);
      setDragOverLesson(null);
      setDragOverSectionId(null);
      return;
    }

    const dragged = product.lessons.find((l) => l.id === currentDraggedId);
    if (!dragged) return;

    const sourceSectionId = dragged.sectionId;
    const sectionChanged = sourceSectionId !== targetSectionId;

    const updatedDragged: Lesson = { ...dragged, sectionId: targetSectionId };
    const allSections = product.sections;
    const sectionLessonsMap = new Map<string, Lesson[]>();

    for (const sec of allSections) {
      sectionLessonsMap.set(
        sec.id,
        product.lessons.filter(
          (l) => l.sectionId === sec.id && l.id !== currentDraggedId,
        ),
      );
    }

    const targetList = sectionLessonsMap.get(targetSectionId) ?? [];
    const targetIdx = targetList.findIndex((l) => l.id === targetLessonId);

    if (targetIdx >= 0) {
      const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
      targetList.splice(insertIdx, 0, updatedDragged);
    } else {
      targetList.push(updatedDragged);
    }
    sectionLessonsMap.set(targetSectionId, targetList);

    const unsectioned = product.lessons.filter(
      (l) => !l.sectionId && l.id !== currentDraggedId,
    );

    const flattened: Lesson[] = [];
    for (const sec of allSections) {
      flattened.push(...(sectionLessonsMap.get(sec.id) ?? []));
    }
    flattened.push(...unsectioned);

    const newLessons = flattened.map((lesson, idx) => ({
      ...lesson,
      position: idx + 1,
    }));

    const assignments = sectionChanged
      ? [{ lessonId: currentDraggedId, sectionId: targetSectionId }]
      : [];

    draggedLessonIdRef.current = null;
    setDraggedLessonId(null);
    setDragOverLesson(null);
    setDragOverSectionId(null);

    void reorderLessonsTo(newLessons, assignments);
  }

  function handleSectionDropOnEmpty(
    targetSectionId: string,
    explicitDraggedId?: string,
  ) {
    const currentDraggedId =
      explicitDraggedId || draggedLessonId || draggedLessonIdRef.current;
    if (!currentDraggedId || !product) return;
    const dragged = product.lessons.find((l) => l.id === currentDraggedId);
    if (!dragged) return;

    const sourceSectionId = dragged.sectionId;
    const sectionChanged = sourceSectionId !== targetSectionId;
    const updatedDragged: Lesson = { ...dragged, sectionId: targetSectionId };

    const allSections = product.sections;
    const sectionLessonsMap = new Map<string, Lesson[]>();

    for (const sec of allSections) {
      sectionLessonsMap.set(
        sec.id,
        product.lessons.filter(
          (l) => l.sectionId === sec.id && l.id !== currentDraggedId,
        ),
      );
    }

    const targetList = sectionLessonsMap.get(targetSectionId) ?? [];
    targetList.push(updatedDragged);
    sectionLessonsMap.set(targetSectionId, targetList);

    const unsectioned = product.lessons.filter(
      (l) => !l.sectionId && l.id !== currentDraggedId,
    );

    const flattened: Lesson[] = [];
    for (const sec of allSections) {
      flattened.push(...(sectionLessonsMap.get(sec.id) ?? []));
    }
    flattened.push(...unsectioned);

    const newLessons = flattened.map((lesson, idx) => ({
      ...lesson,
      position: idx + 1,
    }));

    const assignments = sectionChanged
      ? [{ lessonId: currentDraggedId, sectionId: targetSectionId }]
      : [];

    draggedLessonIdRef.current = null;
    setDraggedLessonId(null);
    setDragOverLesson(null);
    setDragOverSectionId(null);

    void reorderLessonsTo(newLessons, assignments);
  }

  function handleSectionDrop(
    targetSectionId: string,
    position: "before" | "after",
    explicitDraggedId?: string,
  ) {
    const currentDraggedId =
      explicitDraggedId || draggedSectionId || draggedSectionIdRef.current;
    if (!currentDraggedId || !product) return;
    if (currentDraggedId === targetSectionId) {
      draggedSectionIdRef.current = null;
      setDraggedSectionId(null);
      setDragOverSection(null);
      return;
    }

    const index = product.sections.findIndex((s) => s.id === currentDraggedId);
    const targetIndex = product.sections.findIndex((s) => s.id === targetSectionId);
    if (index < 0 || targetIndex < 0) return;

    const reordered = [...product.sections];
    const [dragged] = reordered.splice(index, 1);
    const newTargetIndex = reordered.findIndex((s) => s.id === targetSectionId);
    const insertIndex = position === "before" ? newTargetIndex : newTargetIndex + 1;
    reordered.splice(insertIndex, 0, dragged!);

    const newSections = reordered.map((section, pos) => ({
      ...section,
      position: pos + 1,
    }));

    draggedSectionIdRef.current = null;
    setDraggedSectionId(null);
    setDragOverSection(null);

    void reorderSectionsTo(newSections);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !hasProductDetailsChanges ||
      !titleDraft.trim() ||
      !slugDraft.trim() ||
      saving ||
      !school
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: titleDraft.trim(),
          description: descriptionDraft,
          slug: slugDraft.trim(),
          ...(product?.kind === "course" ? { discussions: discussionsDraft } : {}),
        }),
      });
      await refresh();
      toast.success("Product details saved.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to save product details.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePublishStatus(status: Product["status"]) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await refresh();
      setPublishStatus(status);
      setNotice(
        status === "published" ? "Product published." : "Product moved to draft.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update publication status.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePrivacy(privacy: Product["privacy"]) {
    if (saving || privacy === privacyDraft) return;
    const previous = privacyDraft;
    setPrivacyDraft(privacy);
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ privacy }),
      });
      await refresh();
      setNotice(
        privacy === "unlisted"
          ? "Product is now accessible only by direct link."
          : "Product visibility set to public.",
      );
    } catch (caught) {
      setPrivacyDraft(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update product visibility.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeDiscussions(enabled: boolean) {
    if (saving || enabled === discussionsDraft) return;
    const previous = discussionsDraft;
    setDiscussionsDraft(enabled);
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ discussions: enabled }),
      });
      await refresh();
      setNotice(enabled ? "Discussions enabled." : "Discussions disabled.");
    } catch (caught) {
      setDiscussionsDraft(previous);
      setError(
        caught instanceof Error ? caught.message : "Unable to update discussions.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeLeadMagnet(enabled: boolean) {
    if (saving || enabled === leadMagnetDraft) return;
    const previous = leadMagnetDraft;
    setLeadMagnetDraft(enabled);
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ leadMagnet: enabled }),
      });
      await refresh();
      setNotice(enabled ? "Lead Magnet enabled." : "Lead Magnet disabled.");
    } catch (caught) {
      setLeadMagnetDraft(previous);
      setError(
        caught instanceof Error ? caught.message : "Unable to update Lead Magnet.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeFeaturedMedia(mediaId: string | null) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ featuredMediaId: mediaId }),
      });
      await refresh();
      setNotice(mediaId ? "Featured image saved." : "Featured image removed.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to update the featured image.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeCertificate(enabled: boolean) {
    if (saving || enabled === certificateDraft) return;
    const previous = certificateDraft;
    setCertificateDraft(enabled);
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: JSON.stringify({ certificate: enabled }),
      });
      await refresh();
      setNotice(enabled ? "Certificates enabled." : "Certificates disabled.");
    } catch (caught) {
      setCertificateDraft(previous);
      setError(
        caught instanceof Error ? caught.message : "Unable to update certificates.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function createPreview() {
    setSaving(true);
    setError(null);
    try {
      const grant = await request<{ token: string; expiresAt: string }>(
        `/api/v1/products/${encodeURIComponent(productId)}/preview`,
        { method: "POST", body: JSON.stringify({ ttlSeconds: 900 }) },
      );
      const learnerOrigin = process.env.NEXT_PUBLIC_LEARNER_ORIGIN;
      if (!learnerOrigin) {
        setNotice(
          "Preview token created. Set NEXT_PUBLIC_LEARNER_ORIGIN to open it automatically.",
        );
      } else {
        window.open(
          `${learnerOrigin.replace(/\/$/, "")}/courses/${encodeURIComponent(productId)}#preview=${encodeURIComponent(grant.token)}`,
          "_blank",
          "noopener,noreferrer",
        );
        setNotice(
          `Preview opened; it expires ${new Date(grant.expiresAt).toLocaleTimeString()}.`,
        );
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to create a preview.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function inviteCustomer() {
    if (saving || !inviteEmail.trim() || !school) return;
    setSaving(true);
    setError(null);
    try {
      await request("/api/v1/enrollments", {
        method: "POST",
        body: JSON.stringify({
          productId,
          email: inviteEmail.trim(),
          name: inviteName.trim() || "Learner",
        }),
      });
      setInviteDialogOpen(false);
      setInviteName("");
      setInviteEmail("");
      setNotice(`${inviteEmail.trim()} now has access to this product.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to invite the customer.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function shareProduct() {
    if (!product) return;
    const url = learnerUrl(
      `/product/${encodeURIComponent(product.id)}`,
      school?.subdomain,
    );
    if (!url) {
      setError("Unable to build the public product URL.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setError(null);
      setNotice("Product URL copied to clipboard.");
    } catch {
      setError("Unable to copy the product URL.");
    }
  }

  async function deleteProduct() {
    if (saving || deleteConfirmation !== "delete") return;
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
      });
      router.replace("/products");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete the product.",
      );
      setSaving(false);
    }
  }

  async function deleteSection(section: Section) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await request(`/api/v1/sections/${encodeURIComponent(section.id)}`, {
        method: "DELETE",
      });
      await refresh();
      setSectionDeleteDialogOpen(false);
      setSectionToDelete(null);
      setNotice(`Section "${section.title}" deleted.`);
    } catch (caught) {
      const reason =
        caught instanceof Error ? caught.message : "Unable to delete the section.";
      setError(reason);
    } finally {
      setSaving(false);
    }
  }

  const lessonsBySection = (sectionId: string) =>
    product?.lessons.filter((lesson) => lesson.sectionId === sectionId) ?? [];

  const productRoot = product
    ? `/products/${encodeURIComponent(product.id)}`
    : "/products";
  const hasProductDetailsChanges =
    product !== null &&
    (titleDraft.trim() !== product.title ||
      slugDraft.trim() !== product.slug ||
      descriptionDraft !== product.description);
  const breadcrumbItems = !product
    ? [{ label: "Products", href: "/products" }]
    : view === "overview"
      ? [{ label: "Products", href: "/products" }, { label: product.title }]
      : [
          { label: "Products", href: "/products" },
          { label: product.title, href: productRoot },
          { label: view === "content" ? "Content" : "Settings" },
        ];

  useSetBreadcrumb(breadcrumbItems);

  if (loading) {
    return (
      <AuthGate>
        <main className="page-shell">
          <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
            Loading product…
          </div>
        </main>
      </AuthGate>
    );
  }

  if (error && !product) {
    return (
      <AuthGate>
        <main className="page-shell">
          <ErrorMessage>{error}</ErrorMessage>
        </main>
      </AuthGate>
    );
  }

  if (!product || !school) return null;

  const TypeIcon = product.kind === "course" ? BookOpen : Download;

  return (
    <AuthGate>
      <main className="page-shell">
        {view === "overview" && product.status === "draft" ? (
          <div className="mb-5 rounded-md bg-destructive px-3 py-2 text-sm text-destructive-foreground">
            This product is unpublished.{" "}
            <Link href={`${productRoot}/manage#publish`} className="underline">
              Manage publishing
            </Link>
          </div>
        ) : null}
        {view === "overview" ? (
          <header className="app-header items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {product.title}
                </h1>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Share product"
                  title="Share product"
                  onClick={() => void shareProduct()}
                >
                  <Share2 className="size-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium text-foreground">
                  <TypeIcon className="size-4" /> {kindLabel(product.kind)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1">
                  {product.status === "published" ? (
                    <CheckCircle className="size-3.5" />
                  ) : (
                    <CircleDashed className="size-3.5" />
                  )}
                  {product.status === "published" ? "Published" : "Draft"}
                </span>
                {product.updatedAt ? (
                  <span>Last updated {formatUpdatedAt(product.updatedAt)}</span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={analyticsRange}
                onValueChange={(value) => setAnalyticsRange(value as AnalyticsRange)}
              >
                <SelectTrigger className="w-[140px]" aria-label="Analytics time range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANALYTICS_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button asChild variant="outline">
                <Link href={`${productRoot}/content`}>
                  <Pencil className="size-4" /> Edit content
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Actions <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {product.kind === "course" ? (
                    <>
                      <DropdownMenuItem onSelect={() => void createPreview()}>
                        <BookOpen className="size-4" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <DropdownMenuItem onSelect={() => setInviteDialogOpen(true)}>
                    <UserPlus className="size-4" /> Invite a customer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {product.salesPage?.pageId ? (
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/pages/${encodeURIComponent(product.salesPage.pageId)}/edit?redirectTo=${encodeURIComponent(productRoot)}`}
                      >
                        <Globe className="size-4" /> Edit page
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link href={`${productRoot}/manage`}>
                      <Settings className="size-4" /> Manage
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        ) : (
          <PageHeader
            title={view === "content" ? "Content" : "Manage"}
            description={view === "manage" ? "Manage your product settings" : undefined}
          />
        )}

        {error ? <ErrorMessage>{error}</ErrorMessage> : null}
        {notice ? (
          <p role="status" className="text-sm text-primary">
            {notice}
          </p>
        ) : null}

        {view === "overview" ? (
          <ProductAnalytics
            productId={product.id}
            school={school}
            productKind={product.kind}
            contentCount={product.lessons.length}
            range={analyticsRange}
          />
        ) : null}

        {view === "content" ? (
          <section className="space-y-4">
            {product.sections.map((section, index) => {
              const collapsed = collapsedSections.includes(section.id);
              const lessons = lessonsBySection(section.id);
              return (
                <article
                  className={cn(
                    "relative mb-7 rounded-lg transition-all",
                    draggedSectionId === section.id &&
                      "opacity-30 bg-muted/40 border border-dashed border-primary/30",
                  )}
                  key={section.id}
                  onDragOver={(e) => {
                    const activeDraggedSectionId =
                      draggedSectionId || draggedSectionIdRef.current;
                    if (
                      activeDraggedSectionId &&
                      activeDraggedSectionId !== section.id
                    ) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const rect = e.currentTarget.getBoundingClientRect();
                      const position =
                        e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                      if (
                        dragOverSection?.id !== section.id ||
                        dragOverSection?.position !== position
                      ) {
                        setDragOverSection({ id: section.id, position });
                      }
                    }
                  }}
                  onDragLeave={(e) => {
                    if (
                      (draggedSectionId || draggedSectionIdRef.current) &&
                      !e.currentTarget.contains(e.relatedTarget as Node | null)
                    ) {
                      setDragOverSection((current) =>
                        current?.id === section.id ? null : current,
                      );
                    }
                  }}
                  onDrop={(e) => {
                    const activeDraggedSectionId =
                      draggedSectionId ||
                      draggedSectionIdRef.current ||
                      e.dataTransfer.getData("text/plain");
                    if (
                      activeDraggedSectionId &&
                      activeDraggedSectionId !== section.id
                    ) {
                      e.preventDefault();
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      const position =
                        dragOverSection?.id === section.id
                          ? dragOverSection.position
                          : e.clientY < rect.top + rect.height / 2
                            ? "before"
                            : "after";
                      handleSectionDrop(section.id, position, activeDraggedSectionId);
                    }
                  }}
                >
                  {/* Drop indicator lines for section */}
                  {dragOverSection?.id === section.id &&
                    dragOverSection.position === "before" && (
                      <div className="pointer-events-none absolute -top-1.5 left-0 right-0 z-30 flex items-center">
                        <div className="size-2.5 rounded-full bg-primary shadow-sm" />
                        <div className="h-0.5 flex-1 bg-primary shadow-sm" />
                      </div>
                    )}
                  {dragOverSection?.id === section.id &&
                    dragOverSection.position === "after" && (
                      <div className="pointer-events-none absolute -bottom-1.5 left-0 right-0 z-30 flex items-center">
                        <div className="size-2.5 rounded-full bg-primary shadow-sm" />
                        <div className="h-0.5 flex-1 bg-primary shadow-sm" />
                      </div>
                    )}

                  <div className="flex items-center justify-between gap-3 border-b pb-3">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <button
                        type="button"
                        draggable={!saving}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", section.id);
                          draggedSectionIdRef.current = section.id;
                          wasDraggingRef.current = true;
                          const article =
                            e.currentTarget.closest<HTMLElement>("article");
                          if (article && e.dataTransfer.setDragImage) {
                            const rect = article.getBoundingClientRect();
                            e.dataTransfer.setDragImage(
                              article,
                              e.clientX - rect.left,
                              24,
                            );
                          }
                          requestAnimationFrame(() => {
                            setDraggedSectionId(section.id);
                          });
                        }}
                        onDragEnd={() => {
                          draggedSectionIdRef.current = null;
                          setDraggedSectionId(null);
                          setDragOverSection(null);
                          setTimeout(() => {
                            wasDraggingRef.current = false;
                          }, 200);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            void moveSection(section.id, -1);
                          } else if (e.key === "ArrowDown") {
                            e.preventDefault();
                            void moveSection(section.id, 1);
                          }
                        }}
                        className="flex size-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring select-none"
                        aria-label={`Drag to reorder section: ${section.title}. Press up or down arrow to move.`}
                        title="Drag to reorder section"
                      >
                        <GripVertical className="size-4 pointer-events-none" />
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-1"
                        aria-label={collapsed ? "Expand section" : "Collapse section"}
                        onClick={() =>
                          setCollapsedSections((current) =>
                            current.includes(section.id)
                              ? current.filter((id) => id !== section.id)
                              : [...current, section.id],
                          )
                        }
                      >
                        {collapsed ? (
                          <ChevronRight className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-xl font-semibold">
                          {section.title}
                        </h2>
                        {section.dripEnabled ? (
                          <span
                            role="img"
                            title="This section has scheduled release"
                            aria-label="This section has scheduled release"
                          >
                            <Droplets className="size-4 text-muted-foreground" />
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-1"
                        onClick={() => void moveSection(section.id, -1)}
                        disabled={saving || index === 0}
                        aria-label="Move section up"
                        title="Move section up"
                      >
                        <ChevronUp className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-1"
                        onClick={() => void moveSection(section.id, 1)}
                        disabled={saving || index === product.sections.length - 1}
                        aria-label="Move section down"
                        title="Move section down"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Section actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`${productRoot}/content/section/${section.id}`}>
                              <Pencil className="size-4" /> Edit section
                            </Link>
                          </DropdownMenuItem>
                          {!(
                            product.kind === "download" && product.sections.length === 1
                          ) ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={saving}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setSectionToDelete(section);
                                  setSectionDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="size-4" /> Delete Section
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {!collapsed ? (
                    <ul
                      aria-label={`Lessons in ${section.title}`}
                      className={cn(
                        "ml-8 mt-3 space-y-1 rounded-md transition-colors",
                        dragOverSectionId === section.id &&
                          !dragOverLesson &&
                          "bg-muted/30 p-1.5 ring-1 ring-primary/40",
                      )}
                      onDragOver={(e) => {
                        const activeDraggedLessonId =
                          draggedLessonId || draggedLessonIdRef.current;
                        if (activeDraggedLessonId) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverSectionId !== section.id) {
                            setDragOverSectionId(section.id);
                          }
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setDragOverSectionId((current) =>
                            current === section.id ? null : current,
                          );
                        }
                      }}
                      onDrop={(e) => {
                        const activeDraggedLessonId =
                          draggedLessonId ||
                          draggedLessonIdRef.current ||
                          e.dataTransfer.getData("text/plain");
                        if (activeDraggedLessonId && !dragOverLesson) {
                          e.preventDefault();
                          handleSectionDropOnEmpty(section.id, activeDraggedLessonId);
                        }
                      }}
                    >
                      {lessons.map((lesson) => {
                        const isDraggingThis = draggedLessonId === lesson.id;
                        const isOverThisBefore =
                          dragOverLesson?.id === lesson.id &&
                          dragOverLesson.position === "before";
                        const isOverThisAfter =
                          dragOverLesson?.id === lesson.id &&
                          dragOverLesson.position === "after";

                        return (
                          <li
                            key={lesson.id}
                            data-lesson-row
                            className={cn(
                              "group relative flex items-center gap-1 rounded-md px-1 py-0.5 text-sm transition-colors",
                              isDraggingThis
                                ? "opacity-30 bg-muted/60 border border-dashed border-primary/40"
                                : "hover:bg-muted",
                            )}
                            onDragOver={(e) => {
                              const activeDraggedLessonId =
                                draggedLessonId || draggedLessonIdRef.current;
                              if (
                                activeDraggedLessonId &&
                                activeDraggedLessonId !== lesson.id
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = "move";
                                const rect = e.currentTarget.getBoundingClientRect();
                                const position =
                                  e.clientY < rect.top + rect.height / 2
                                    ? "before"
                                    : "after";
                                if (
                                  dragOverLesson?.id !== lesson.id ||
                                  dragOverLesson?.position !== position
                                ) {
                                  setDragOverLesson({ id: lesson.id, position });
                                }
                                if (dragOverSectionId !== null) {
                                  setDragOverSectionId(null);
                                }
                              }
                            }}
                            onDragLeave={(e) => {
                              if (
                                !e.currentTarget.contains(
                                  e.relatedTarget as Node | null,
                                )
                              ) {
                                setDragOverLesson((current) =>
                                  current?.id === lesson.id ? null : current,
                                );
                              }
                            }}
                            onDrop={(e) => {
                              const activeDraggedLessonId =
                                draggedLessonId ||
                                draggedLessonIdRef.current ||
                                e.dataTransfer.getData("text/plain");
                              if (
                                activeDraggedLessonId &&
                                activeDraggedLessonId !== lesson.id
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                const position =
                                  dragOverLesson?.id === lesson.id
                                    ? dragOverLesson.position
                                    : e.clientY < rect.top + rect.height / 2
                                      ? "before"
                                      : "after";
                                handleLessonDrop(
                                  lesson.id,
                                  section.id,
                                  position,
                                  activeDraggedLessonId,
                                );
                              }
                            }}
                          >
                            {/* Drop position indicator lines */}
                            {isOverThisBefore && (
                              <div className="pointer-events-none absolute -top-1 left-0 right-0 z-30 flex items-center">
                                <div className="size-2 rounded-full bg-primary shadow-sm" />
                                <div className="h-0.5 flex-1 bg-primary shadow-sm" />
                              </div>
                            )}
                            {isOverThisAfter && (
                              <div className="pointer-events-none absolute -bottom-1 left-0 right-0 z-30 flex items-center">
                                <div className="size-2 rounded-full bg-primary shadow-sm" />
                                <div className="h-0.5 flex-1 bg-primary shadow-sm" />
                              </div>
                            )}

                            <button
                              type="button"
                              draggable={!saving}
                              onDragStart={(e) => {
                                e.stopPropagation();
                                e.dataTransfer.effectAllowed = "move";
                                e.dataTransfer.setData("text/plain", lesson.id);
                                draggedLessonIdRef.current = lesson.id;
                                wasDraggingRef.current = true;
                                const row =
                                  e.currentTarget.closest<HTMLElement>(
                                    "[data-lesson-row]",
                                  );
                                if (row && e.dataTransfer.setDragImage) {
                                  const rect = row.getBoundingClientRect();
                                  e.dataTransfer.setDragImage(
                                    row,
                                    e.clientX - rect.left,
                                    e.clientY - rect.top,
                                  );
                                }
                                requestAnimationFrame(() => {
                                  setDraggedLessonId(lesson.id);
                                });
                              }}
                              onDragEnd={() => {
                                draggedLessonIdRef.current = null;
                                setDraggedLessonId(null);
                                setDragOverLesson(null);
                                setDragOverSectionId(null);
                                setTimeout(() => {
                                  wasDraggingRef.current = false;
                                }, 200);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  moveLessonByOffset(lesson.id, section.id, -1);
                                } else if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  moveLessonByOffset(lesson.id, section.id, 1);
                                }
                              }}
                              className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-background/80 hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring select-none"
                              aria-label={`Drag to reorder lesson: ${lesson.title}. Press up or down arrow to move.`}
                              title="Drag to reorder lesson"
                            >
                              <GripVertical className="size-4 pointer-events-none" />
                            </button>
                            <Link
                              href={`${productRoot}/content/section/${section.id}/lesson?id=${encodeURIComponent(lesson.id)}`}
                              className={cn(
                                "flex min-w-0 flex-1 items-center gap-3 py-1.5 pr-2",
                                (draggedLessonId || draggedLessonIdRef.current) &&
                                  "pointer-events-none select-none",
                              )}
                              onClick={(e) => {
                                if (wasDraggingRef.current) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate font-medium">
                                <span className="mr-3 inline-flex align-middle">
                                  <LessonTypeIcon type={lesson.type} />
                                </span>
                                {lesson.title}
                              </span>
                              {lesson.status === "draft" ? (
                                <span className="rounded-full border px-2 py-0.5 text-xs">
                                  Draft
                                </span>
                              ) : null}
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </Link>
                          </li>
                        );
                      })}
                      {dragOverSectionId === section.id &&
                        !dragOverLesson &&
                        lessons.length > 0 && (
                          <div className="pointer-events-none relative flex items-center py-1">
                            <div className="size-2 rounded-full bg-primary shadow-sm" />
                            <div className="h-0.5 flex-1 bg-primary shadow-sm" />
                          </div>
                        )}
                      {lessons.length === 0 ? (
                        <li
                          aria-label={`Empty section: ${section.title}`}
                          onDragOver={(e) => {
                            if (draggedLessonId || draggedLessonIdRef.current) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (dragOverSectionId !== section.id) {
                                setDragOverSectionId(section.id);
                              }
                            }
                          }}
                          onDrop={(e) => {
                            const activeDraggedLessonId =
                              draggedLessonId ||
                              draggedLessonIdRef.current ||
                              e.dataTransfer.getData("text/plain");
                            if (activeDraggedLessonId) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSectionDropOnEmpty(
                                section.id,
                                activeDraggedLessonId,
                              );
                            }
                          }}
                          className={cn(
                            "rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors",
                            dragOverSectionId === section.id &&
                              "border-primary bg-primary/5 font-medium text-primary",
                          )}
                        >
                          No lessons in this section. Drop a lesson here or add a new
                          one.
                        </li>
                      ) : null}
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-muted-foreground"
                      >
                        <Link
                          href={`${productRoot}/content/section/${section.id}/lesson`}
                        >
                          <Plus className="size-4" />
                          {product.kind === "download" ? "Add File" : "Add Lesson"}
                        </Link>
                      </Button>
                    </ul>
                  ) : null}
                </article>
              );
            })}
            {product.sections.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">
                Add a section to start organizing this{" "}
                {product.kind === "download" ? "digital download" : "course"}.
              </div>
            ) : null}
            {product.kind === "course" ? (
              <div className="flex justify-center pt-2">
                <Button asChild variant="outline">
                  <Link href={`${productRoot}/content/section/new`}>
                    <Plus className="size-4" /> Add Section
                  </Link>
                </Button>
              </div>
            ) : null}
            <Dialog
              open={sectionDeleteDialogOpen}
              onOpenChange={(open) => {
                setSectionDeleteDialogOpen(open);
                if (!open) setSectionToDelete(null);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Deletion</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete the section “
                    {sectionToDelete?.title}”? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSectionDeleteDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (sectionToDelete) void deleteSection(sectionToDelete);
                    }}
                    disabled={saving || !sectionToDelete}
                  >
                    {saving ? "Deleting…" : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>
        ) : null}

        {view === "manage" ? (
          <div className="space-y-6">
            <form onSubmit={saveProduct} className="card stack">
              <div>
                <h2 className="font-semibold">Product details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update the product title, description, and public URL.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-title">Name</Label>
                <Input
                  id="product-title"
                  required
                  maxLength={200}
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-slug">Slug</Label>
                <Input
                  id="product-slug"
                  required
                  maxLength={200}
                  value={slugDraft}
                  onChange={(event) => setSlugDraft(event.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  The URL-friendly identifier for this product page.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <RichTextEditor
                  school={school}
                  purpose="product_content"
                  initialContent={editorContent(descriptionDraft)}
                  refresh={
                    product.updatedAt ? new Date(product.updatedAt).getTime() : 0
                  }
                  onChange={(document) => setDescriptionDraft(JSON.stringify(document))}
                  placeholder="Write something…"
                  className="rounded-md border bg-card"
                  contentClassName="max-w-none"
                  editorClassName="min-h-[200px]"
                />
              </div>
              <div>
                <Button
                  type="submit"
                  disabled={
                    !titleDraft.trim() ||
                    !slugDraft.trim() ||
                    !hasProductDetailsChanges ||
                    saving
                  }
                >
                  <Save className="size-4" /> Save details
                </Button>
              </div>
            </form>

            <ProductFeaturedImage
              school={school}
              value={product.featuredMedia}
              onChange={(mediaId) => void changeFeaturedMedia(mediaId)}
            />

            <PaymentPlanList
              listPath={`/api/v1/products/${encodeURIComponent(productId)}/plans`}
              createPath={`/api/v1/products/${encodeURIComponent(productId)}/plans`}
              planPath={(planId) => `/api/v1/plans/${encodeURIComponent(planId)}`}
              defaultPath={(planId) =>
                `/api/v1/plans/${encodeURIComponent(planId)}/default`
              }
              archivePath={(planId) =>
                `/api/v1/plans/${encodeURIComponent(planId)}/archive`
              }
              school={school}
              plans={plans}
              request={request}
              onChanged={setPlans}
            />

            {product.kind === "course" ? (
              <section className="card stack">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">Discussions</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enable lesson-specific discussions for this course
                    </p>
                  </div>
                  <Switch
                    checked={discussionsDraft}
                    onCheckedChange={(checked) =>
                      void changeDiscussions(checked === true)
                    }
                    disabled={saving}
                  />
                </div>
                {discussionsDraft ? (
                  <div>
                    <Button asChild variant="outline">
                      <Link href={`${productRoot}/manage/discussions/reports`}>
                        Manage reported content
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {product.kind === "download" ? (
              <section className="card stack">
                {(() => {
                  const activePlans = plans.filter((plan) => plan.status === "active");
                  const hasExactlyOneFreePlan =
                    activePlans.length === 1 && activePlans[0]?.kind === "free";
                  return (
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <h2
                          className={`font-semibold ${!hasExactlyOneFreePlan ? "text-muted-foreground" : ""}`}
                        >
                          Lead Magnet
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Send the product to user for free in exchange for their email
                          address
                        </p>
                        {!hasExactlyOneFreePlan ? (
                          <div className="flex items-start gap-2 text-xs text-destructive">
                            <AlertCircle className="mt-0.5 size-4 shrink-0" />
                            <p className="leading-5">
                              Product must have exactly one free payment plan to enable
                              lead magnet
                            </p>
                          </div>
                        ) : null}
                      </div>
                      <Switch
                        checked={leadMagnetDraft}
                        onCheckedChange={(checked) =>
                          void changeLeadMagnet(checked === true)
                        }
                        disabled={saving || !hasExactlyOneFreePlan}
                      />
                    </div>
                  );
                })()}
              </section>
            ) : null}

            <section className="card stack" id="publish">
              <div>
                <h2 className="font-semibold">Publishing</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Control whether learners can access this{" "}
                  {kindLabel(product.kind).toLowerCase()}.
                </p>
              </div>
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="space-y-1">
                    <span className="block font-semibold">Published</span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      Make this product available to learners.
                    </span>
                  </span>
                  <Switch
                    checked={publishStatus === "published"}
                    onCheckedChange={(checked) =>
                      void changePublishStatus(checked === true ? "published" : "draft")
                    }
                    disabled={saving}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span
                    className={cn(
                      "space-y-1",
                      publishStatus !== "published" && "opacity-60",
                    )}
                  >
                    <span className="block font-semibold">Visibility</span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      Only accessible via direct link.
                    </span>
                  </span>
                  <Switch
                    checked={privacyDraft === "unlisted"}
                    onCheckedChange={(checked) =>
                      void changePrivacy(checked === true ? "unlisted" : "public")
                    }
                    disabled={saving || publishStatus !== "published"}
                  />
                </div>
              </div>
            </section>

            {product.kind === "course" ? (
              <ProductCertificates
                school={school}
                productId={productId}
                productTitle={product.title}
                enabled={certificateDraft}
                onToggle={(enabled) => void changeCertificate(enabled)}
              />
            ) : null}

            <section className="card stack border-destructive/40">
              <div>
                <h2 className="font-semibold text-destructive">Danger zone</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deleting a product removes its content, plans, and learner access.
                </p>
              </div>
              <div>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    setDeleteConfirmation("");
                    setDeleteDialogOpen(true);
                  }}
                  disabled={saving}
                >
                  <Trash2 className="size-4" /> Delete product
                </Button>
              </div>
            </section>

            <Dialog
              open={inviteDialogOpen}
              onOpenChange={(open) => {
                setInviteDialogOpen(open);
                if (!open) {
                  setInviteName("");
                  setInviteEmail("");
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a customer</DialogTitle>
                  <DialogDescription>
                    Grant a learner access to {product.title}. They can sign in with
                    this email address.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-customer-name">Name</Label>
                    <Input
                      id="invite-customer-name"
                      value={inviteName}
                      onChange={(event) => setInviteName(event.target.value)}
                      placeholder="Learner name"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-customer-email">Email</Label>
                    <Input
                      id="invite-customer-email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="learner@example.com"
                      disabled={saving}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void inviteCustomer()}
                    disabled={saving || !inviteEmail.trim()}
                  >
                    {saving ? "Inviting…" : "Invite customer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) setDeleteConfirmation("");
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action is irreversible. All product data, payment plans, and
                    learner access will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="delete-product-confirmation">
                    Type &quot;delete&quot; to confirm
                  </Label>
                  <Input
                    id="delete-product-confirmation"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder="Type 'delete' to confirm"
                    autoComplete="off"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void deleteProduct()}
                    disabled={deleteConfirmation !== "delete" || saving}
                  >
                    {saving ? "Deleting…" : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </main>
    </AuthGate>
  );
}
