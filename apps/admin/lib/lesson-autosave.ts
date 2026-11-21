import type { LessonDiagnostic, LessonSaveFailure } from "./lesson-page";

/**
 * Autosave for a lesson page (docs/wip/lesson-pages.md, section 7). Every
 * save sends the whole document with the `contentVersion` it is based on.
 * One request at a time; edits made meanwhile are sent next, as one save.
 * A version conflict stops autosaving for good: the author must reload, so
 * nobody's work is overwritten silently.
 */
export type AutosaveState =
  | { status: "saved" }
  | { status: "pending" }
  | { status: "saving" }
  | { status: "conflict" }
  | { status: "invalid"; diagnostics: LessonDiagnostic[] }
  | { status: "error"; message: string };

export type AutosaveSendResult =
  | { ok: true; contentVersion: number }
  | { ok: false; failure: LessonSaveFailure };

export type AutosaveSend = (
  content: unknown,
  expectedContentVersion: number,
) => Promise<AutosaveSendResult>;

export type LessonAutosave = {
  /** The editor's latest document. */
  change(content: unknown): void;
  /** Resends the last refused document (after a network error, for example). */
  retry(): void;
  /** Waits for every change to be sent; resolves with the resulting state. */
  flush(): Promise<AutosaveState>;
  /**
   * Starts over from content saved elsewhere (a discarded draft): drops
   * pending and refused edits and bases the next save on `contentVersion`.
   * Call after `flush`, so no save is in flight.
   */
  reset(next: { contentVersion: number; savedContent: unknown }): void;
  /** Another write (a publish) found the content changed elsewhere; stop saving. */
  markConflict(): void;
  readonly state: AutosaveState;
  readonly contentVersion: number;
};

export function createLessonAutosave(options: {
  contentVersion: number;
  /** The document as loaded, so an unchanged document isn't sent. */
  savedContent?: unknown;
  send: AutosaveSend;
  onState?: (state: AutosaveState) => void;
}): LessonAutosave {
  let version = options.contentVersion;
  let state: AutosaveState = { status: "saved" };
  let lastSaved =
    options.savedContent === undefined
      ? undefined
      : JSON.stringify(options.savedContent);
  let pending: unknown;
  let hasPending = false;
  let refused: unknown;
  let hasRefused = false;
  let running: Promise<void> | null = null;

  const set = (next: AutosaveState) => {
    state = next;
    options.onState?.(next);
  };

  async function run() {
    while (hasPending && state.status !== "conflict") {
      const content = pending;
      hasPending = false;
      pending = undefined;
      set({ status: "saving" });
      let result: AutosaveSendResult;
      try {
        result = await options.send(content, version);
      } catch {
        result = {
          ok: false,
          failure: { kind: "error", message: "Couldn't reach the server to save." },
        };
      }
      if (result.ok) {
        version = result.contentVersion;
        lastSaved = JSON.stringify(content);
        hasRefused = false;
        refused = undefined;
        set(hasPending ? { status: "pending" } : { status: "saved" });
        continue;
      }
      const { failure } = result;
      if (failure.kind === "conflict") {
        hasPending = false;
        pending = undefined;
        set({ status: "conflict" });
        break;
      }
      refused = content;
      hasRefused = true;
      if (hasPending) continue; // A newer document may fix it; send that.
      set(
        failure.kind === "invalid"
          ? { status: "invalid", diagnostics: failure.diagnostics }
          : { status: "error", message: failure.message },
      );
    }
    running = null;
  }

  function change(content: unknown) {
    if (state.status === "conflict") return;
    const serialized = JSON.stringify(content);
    if (!running && !hasRefused && serialized === lastSaved) return;
    pending = content;
    hasPending = true;
    if (!running) {
      set({ status: "pending" });
      running = run();
    }
  }

  return {
    change,
    retry() {
      if (hasRefused && !hasPending) change(refused);
    },
    async flush() {
      while (running) await running;
      return state;
    },
    reset(next) {
      version = next.contentVersion;
      lastSaved = JSON.stringify(next.savedContent);
      pending = undefined;
      hasPending = false;
      refused = undefined;
      hasRefused = false;
      set({ status: "saved" });
    },
    markConflict() {
      pending = undefined;
      hasPending = false;
      set({ status: "conflict" });
    },
    get state() {
      return state;
    },
    get contentVersion() {
      return version;
    },
  };
}

/** The status line next to the editor. */
export function autosaveLabel(state: AutosaveState): string {
  switch (state.status) {
    case "saved":
      return "All changes saved";
    case "pending":
    case "saving":
      return "Saving…";
    case "conflict":
      return "Changed elsewhere";
    case "invalid":
      return "Not saved: fix the problems below";
    case "error":
      return "Not saved";
  }
}
