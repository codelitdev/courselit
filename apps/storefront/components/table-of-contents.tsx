"use client";

import { extractHeadings } from "@frontlit/text-editor";
import type { PublicArticle } from "@/lib/courselit-public";
import {
  LearnerHeader2,
  LearnerInset,
  LearnerLink,
} from "@/components/themed-page-builder";

interface TableOfContentsProps {
  json: PublicArticle["content"];
  contentTableHeader?: string;
}

export function TableOfContents({
  json,
  contentTableHeader = "Table of Contents",
}: TableOfContentsProps) {
  let headings: ReturnType<typeof extractHeadings> = [];

  try {
    headings = json
      ? extractHeadings(json as Parameters<typeof extractHeadings>[0])
      : [];
  } catch (error) {
    console.error("Error extracting headings", error);
  }

  if (headings.length === 0) return null;

  return (
    <nav aria-label={contentTableHeader}>
      <LearnerInset>
        {contentTableHeader ? (
          <LearnerHeader2 className="mb-4">{contentTableHeader}</LearnerHeader2>
        ) : null}
        <ul className="flex flex-col gap-2">
          {headings.map(({ text, id }) => (
            <li key={id}>
              <LearnerLink href={`#${id}`}>{text}</LearnerLink>
            </li>
          ))}
        </ul>
      </LearnerInset>
    </nav>
  );
}
