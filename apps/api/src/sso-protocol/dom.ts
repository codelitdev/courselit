import { DOMParser } from "@xmldom/xmldom";

/** The small part of the DOM this module reads. */
export interface XmlNode {
  nodeType: number;
  localName: string | null;
  namespaceURI: string | null;
  textContent: string | null;
  childNodes: { length: number; [index: number]: XmlNode };
  getAttribute(name: string): string;
  hasAttribute(name: string): boolean;
}

export interface XmlDocument extends XmlNode {
  documentElement: XmlNode;
}

export function parseXmlDocument(xml: string): XmlDocument | null {
  const fail = (message: string) => {
    throw new Error(message);
  };
  try {
    const document = new DOMParser({
      errorHandler: { warning: () => {}, error: fail, fatalError: fail },
    }).parseFromString(xml, "text/xml") as unknown as XmlDocument;
    if (!document?.documentElement) {
      return null;
    }
    return document;
  } catch {
    return null;
  }
}
