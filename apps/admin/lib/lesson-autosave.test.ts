import { describe, expect, it } from "bun:test";
import {
  type AutosaveSendResult,
  type AutosaveState,
  autosaveLabel,
  createLessonAutosave,
} from "./lesson-autosave";

type Call = {
  content: unknown;
  version: number;
  resolve(result: AutosaveSendResult): void;
};

/** A `send` whose requests the test answers one by one. */
function controlledSend() {
  const calls: Call[] = [];
  const send = (content: unknown, version: number) =>
    new Promise<AutosaveSendResult>((resolve) => {
      calls.push({ content, version, resolve });
    });
  return { calls, send };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", text }] });

describe("createLessonAutosave", () => {
  it("sends the document with the version it is based on, then the new version", async () => {
    const { calls, send } = controlledSend();
    const states: AutosaveState["status"][] = [];
    const autosave = createLessonAutosave({
      contentVersion: 3,
      send,
      onState: (state) => states.push(state.status),
    });
    autosave.change(doc("a"));
    await tick();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.version).toBe(3);
    calls[0]!.resolve({ ok: true, contentVersion: 4 });
    expect(await autosave.flush()).toEqual({ status: "saved" });
    expect(autosave.contentVersion).toBe(4);
    autosave.change(doc("b"));
    await tick();
    expect(calls[1]!.version).toBe(4);
    calls[1]!.resolve({ ok: true, contentVersion: 5 });
    await autosave.flush();
    expect(states).toEqual([
      "pending",
      "saving",
      "saved",
      "pending",
      "saving",
      "saved",
    ]);
  });

  it("sends one request at a time and only the latest edit made meanwhile", async () => {
    const { calls, send } = controlledSend();
    const autosave = createLessonAutosave({ contentVersion: 1, send });
    autosave.change(doc("a"));
    await tick();
    autosave.change(doc("b"));
    autosave.change(doc("c"));
    expect(calls).toHaveLength(1);
    calls[0]!.resolve({ ok: true, contentVersion: 2 });
    await tick();
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ content: doc("c"), version: 2 });
    calls[1]!.resolve({ ok: true, contentVersion: 3 });
    expect((await autosave.flush()).status).toBe("saved");
  });

  it("doesn't send a document that matches what is saved", async () => {
    const { calls, send } = controlledSend();
    const autosave = createLessonAutosave({
      contentVersion: 1,
      savedContent: doc("a"),
      send,
    });
    autosave.change(doc("a"));
    await tick();
    expect(calls).toHaveLength(0);
    expect(autosave.state.status).toBe("saved");
  });

  it("stops for good on a version conflict and drops later edits", async () => {
    const { calls, send } = controlledSend();
    const autosave = createLessonAutosave({ contentVersion: 1, send });
    autosave.change(doc("a"));
    await tick();
    autosave.change(doc("b"));
    calls[0]!.resolve({ ok: false, failure: { kind: "conflict" } });
    expect(await autosave.flush()).toEqual({ status: "conflict" });
    autosave.change(doc("c"));
    autosave.retry();
    await tick();
    expect(calls).toHaveLength(1);
    expect(autosave.state.status).toBe("conflict");
  });

  it("reports diagnostics and sends the next edit, which may fix them", async () => {
    const { calls, send } = controlledSend();
    const autosave = createLessonAutosave({ contentVersion: 1, send });
    autosave.change(doc("bad"));
    await tick();
    const diagnostics = [{ code: "quiz_limit", message: "One quiz." }];
    calls[0]!.resolve({ ok: false, failure: { kind: "invalid", diagnostics } });
    expect(await autosave.flush()).toEqual({ status: "invalid", diagnostics });
    autosave.change(doc("good"));
    await tick();
    expect(calls[1]).toMatchObject({ content: doc("good"), version: 1 });
    calls[1]!.resolve({ ok: true, contentVersion: 2 });
    expect((await autosave.flush()).status).toBe("saved");
  });

  it("resends a document that failed to reach the server on retry", async () => {
    const { calls, send } = controlledSend();
    const autosave = createLessonAutosave({ contentVersion: 1, send });
    autosave.change(doc("a"));
    await tick();
    calls[0]!.resolve({ ok: false, failure: { kind: "error", message: "Offline" } });
    expect(await autosave.flush()).toEqual({ status: "error", message: "Offline" });
    autosave.retry();
    await tick();
    expect(calls[1]).toMatchObject({ content: doc("a"), version: 1 });
    calls[1]!.resolve({ ok: true, contentVersion: 2 });
    expect((await autosave.flush()).status).toBe("saved");
  });

  it("treats a thrown request as a retryable error", async () => {
    const autosave = createLessonAutosave({
      contentVersion: 1,
      send: () => Promise.reject(new Error("network")),
    });
    autosave.change(doc("a"));
    const state = await autosave.flush();
    expect(state.status).toBe("error");
  });

  it("resends the saved document after a refusal, so reverting a bad edit saves", async () => {
    const { calls, send } = controlledSend();
    const autosave = createLessonAutosave({
      contentVersion: 1,
      savedContent: doc("a"),
      send,
    });
    autosave.change(doc("bad"));
    await tick();
    calls[0]!.resolve({ ok: false, failure: { kind: "invalid", diagnostics: [] } });
    await autosave.flush();
    autosave.change(doc("a"));
    await tick();
    expect(calls).toHaveLength(2);
  });
});

describe("reset and markConflict", () => {
  it("starts over from discarded content: no resend, next save on the new version", async () => {
    const { calls, send } = controlledSend();
    const autosave = createLessonAutosave({
      contentVersion: 1,
      savedContent: doc("draft"),
      send,
    });
    autosave.change(doc("edited"));
    await tick();
    calls[0]!.resolve({
      ok: false,
      failure: { kind: "error", message: "offline" },
    });
    expect((await autosave.flush()).status).toBe("error");
    autosave.reset({ contentVersion: 3, savedContent: doc("published") });
    expect(autosave.state).toEqual({ status: "saved" });
    expect(autosave.contentVersion).toBe(3);
    autosave.retry(); // the refused edit was dropped
    autosave.change(doc("published")); // the reloaded content isn't resent
    await tick();
    expect(calls).toHaveLength(1);
    autosave.change(doc("new"));
    await tick();
    expect(calls[1]).toMatchObject({ content: doc("new"), version: 3 });
  });

  it("stops saving after a conflict found by another write", async () => {
    const { calls, send } = controlledSend();
    const states: AutosaveState["status"][] = [];
    const autosave = createLessonAutosave({
      contentVersion: 1,
      send,
      onState: (state) => states.push(state.status),
    });
    autosave.markConflict();
    autosave.change(doc("a"));
    await tick();
    expect(calls).toHaveLength(0);
    expect(states).toEqual(["conflict"]);
  });
});

describe("autosaveLabel", () => {
  it("says whether the page is saved", () => {
    expect(autosaveLabel({ status: "saved" })).toBe("All changes saved");
    expect(autosaveLabel({ status: "saving" })).toBe("Saving…");
    expect(autosaveLabel({ status: "conflict" })).toBe("Changed elsewhere");
    expect(autosaveLabel({ status: "error", message: "x" })).toBe("Not saved");
  });
});
