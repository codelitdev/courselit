"use client";

import { useEffect } from "react";

type InjectionSection = "head" | "body";

function copyAttributes(source: Element, target: HTMLScriptElement) {
  for (const attr of Array.from(source.attributes)) {
    target.setAttribute(attr.name, attr.value);
  }
}

function injectCodeIn(targetHTMLTag: InjectionSection, html: string) {
  if (typeof document === "undefined") return;
  const destination = document[targetHTMLTag];
  if (!destination) return;
  destination
    .querySelectorAll(`[data-cl-code-injection="${targetHTMLTag}"]`)
    .forEach((node) => node.remove());
  if (!html.trim()) return;
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
