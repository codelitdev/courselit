import type { XmlNode } from "./dom.js";

export const ELEMENT_NODE = 1;

export const NS = {
  protocol: "urn:oasis:names:tc:SAML:2.0:protocol",
  assertion: "urn:oasis:names:tc:SAML:2.0:assertion",
  metadata: "urn:oasis:names:tc:SAML:2.0:metadata",
  dsig: "http://www.w3.org/2000/09/xmldsig#",
} as const;

/** DTDs and entities are never accepted, in any document this module reads. */
export function hasDtdOrEntity(xml: string): boolean {
  return /<!\s*(DOCTYPE|ENTITY)/i.test(xml);
}

export function childElements(
  node: XmlNode,
  localName: string,
  namespaceURI: string,
): XmlNode[] {
  const found: XmlNode[] = [];
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    if (
      child.nodeType === ELEMENT_NODE &&
      child.localName === localName &&
      child.namespaceURI === namespaceURI
    ) {
      found.push(child);
    }
  }
  return found;
}

export function descendantElements(
  node: XmlNode,
  localName: string,
  namespaceURI: string,
): XmlNode[] {
  const found: XmlNode[] = [];
  const walk = (current: XmlNode) => {
    for (let i = 0; i < current.childNodes.length; i++) {
      const child = current.childNodes[i];
      if (child.nodeType !== ELEMENT_NODE) {
        continue;
      }
      if (child.localName === localName && child.namespaceURI === namespaceURI) {
        found.push(child);
      }
      walk(child);
    }
  };
  walk(node);
  return found;
}

export function attribute(node: XmlNode, name: string): string | null {
  return node.hasAttribute(name) ? node.getAttribute(name) : null;
}

export function text(node: XmlNode): string {
  return (node.textContent ?? "").trim();
}

const XS_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Strict xs:dateTime with a time zone; null when missing or malformed. */
export function parseDateTime(value: string | null): Date | null {
  if (!value || !XS_DATE_TIME.test(value)) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms);
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
