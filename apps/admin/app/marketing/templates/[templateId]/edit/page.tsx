"use client";

import { useParams } from "next/navigation";
import { MailTemplateEditor } from "@/components/mails/template-editor";

export default function MailTemplateEditorRoute() {
  const params = useParams<{ templateId: string }>();
  return <MailTemplateEditor templateId={params.templateId} />;
}
