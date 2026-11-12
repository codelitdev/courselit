"use client";

import { marketingPreviewContext } from "@sendlit/email-blocks/footer";
import { type Email, EmailEditor } from "@sendlit/email-editor";
import { useEffect, useState } from "react";
import { MARKETING_EMAIL_BLOCKS, MARKETING_VARIABLES } from "@/lib/email-editor-blocks";

type SchoolsBody = { items?: Array<{ name?: string; selected?: boolean }> } | null;

/** The selected school's name from `/api/v1/schools`, or the first school's. */
export function selectedSchoolName(body: SchoolsBody): string | undefined {
  const school = body?.items?.find((item) => item.selected) ?? body?.items?.[0];
  return school?.name?.trim() || undefined;
}

/** The selected school's name, shown as the sender in inbox previews. */
function useSelectedSchoolName(): string | undefined {
  const [name, setName] = useState<string>();
  useEffect(() => {
    let active = true;
    void fetch("/api/v1/schools", { credentials: "include", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: SchoolsBody) => {
        const schoolName = selectedSchoolName(body);
        if (active && schoolName) setName(schoolName);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return name;
}

/**
 * The email editor every admin screen uses. The subject, merge tags and the
 * "before you send" checks live inside the editor, so screens only add their
 * own actions (save, send, schedule) around it.
 *
 * `marketing` emails get the managed footer (address and unsubscribe) and the
 * subscriber merge tags. Course emails go out as written, with neither.
 */
export function CourseLitEmailEditor({
  email,
  onChange,
  subject,
  onSubjectChange,
  marketing = true,
  viewInBrowser,
}: {
  email: Email;
  onChange: (email: Email) => void;
  /** Omit both to leave the subject to the screen, e.g. for templates. */
  subject?: string;
  onSubjectChange?: (subject: string) => void;
  marketing?: boolean;
  /** The broadcast's or sequence's setting; off hides the footer link. */
  viewInBrowser?: boolean;
}) {
  const senderName = useSelectedSchoolName();
  return (
    <EmailEditor
      email={email}
      onChange={onChange}
      subject={subject}
      onSubjectChange={onSubjectChange}
      senderName={senderName}
      {...(marketing
        ? {
            blocks: MARKETING_EMAIL_BLOCKS,
            renderContext: marketingPreviewContext({ viewInBrowser }),
            variables: MARKETING_VARIABLES,
          }
        : {})}
    />
  );
}
