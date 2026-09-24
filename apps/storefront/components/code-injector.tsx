"use client";

import { useEffect } from "react";

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

export function CodeInjector({
  head,
  body,
}: {
  head?: string | null;
  body?: string | null;
}) {
  useEffect(() => {
    injectCodeIn("head", head ?? "");
    injectCodeIn("body", body ?? "");
  }, [head, body]);

  return null;
}
