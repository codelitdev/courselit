"use client";

import { useEffect, useState } from "react";
import { readSignedInHint } from "@/lib/header-account";
import { learnerHeaders } from "@/lib/school";

type InjectionSection = "head" | "body";

const injectedHtmlByDocument = new WeakMap<Document, Map<InjectionSection, string>>();

function copyAttributes(source: Element, target: HTMLScriptElement) {
  for (const attr of Array.from(source.attributes)) {
    target.setAttribute(attr.name, attr.value);
  }
}

function injectCodeIn(targetHTMLTag: InjectionSection, html: string) {
  if (typeof document === "undefined") return;
  const destination = document[targetHTMLTag];
  if (!destination) return;
  const existingNodes = Array.from(
    destination.querySelectorAll(`[data-cl-code-injection="${targetHTMLTag}"]`),
  );
  const injectedHtml = injectedHtmlByDocument.get(document);
  if (
    html.trim() &&
    existingNodes.length > 0 &&
    injectedHtml?.get(targetHTMLTag) === html
  ) {
    return;
  }
  existingNodes.forEach((node) => {
    node.remove();
  });
  if (!html.trim()) {
    injectedHtml?.delete(targetHTMLTag);
    return;
  }

  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = html;
  for (let elem of Array.from(tempContainer.children)) {
    if (elem.nodeName === "SCRIPT") {
      const script = document.createElement("script");
      script.innerHTML = elem.innerHTML;
      copyAttributes(elem, script);
      elem = script;
    }
    elem.setAttribute("data-cl-code-injection", targetHTMLTag);
    destination.appendChild(elem);
  }

  const currentInjections = injectedHtml ?? new Map<InjectionSection, string>();
  currentInjections.set(targetHTMLTag, html);
  if (!injectedHtml) injectedHtmlByDocument.set(document, currentInjections);
}

/**
 * Injects the school's code. While the plan keeps the code private (a trial),
 * the public settings carry none and `ownerOnly` is set: the code is then
 * fetched through the visitor's own session, and the API returns it only to
 * the school's owner (docs/wip/plan-limits.md, S25). Anonymous visitors never
 * make that call.
 */
export function CodeInjector({
  head,
  body,
  ownerOnly = false,
}: {
  head?: string | null;
  body?: string | null;
  ownerOnly?: boolean;
}) {
  const [ownerCode, setOwnerCode] = useState<{ head: string; body: string } | null>(
    null,
  );

  useEffect(() => {
    if (!ownerOnly || !readSignedInHint()) return;
    let active = true;
    void fetch("/api/v1/learner/site/code-injection", {
      cache: "no-store",
      credentials: "include",
      headers: learnerHeaders(),
    })
      .then(async (response) => {
        if (!active || !response.ok) return;
        const code = (await response.json()) as {
          codeInjectionHead?: string;
          codeInjectionBody?: string;
        };
        setOwnerCode({
          head: code.codeInjectionHead ?? "",
          body: code.codeInjectionBody ?? "",
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [ownerOnly]);

  const headHtml = ownerCode?.head ?? head ?? "";
  const bodyHtml = ownerCode?.body ?? body ?? "";
  useEffect(() => {
    injectCodeIn("head", headHtml);
    injectCodeIn("body", bodyHtml);
  }, [headHtml, bodyHtml]);

  return null;
}
