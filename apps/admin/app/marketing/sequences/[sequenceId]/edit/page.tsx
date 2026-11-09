"use client";

import { useParams } from "next/navigation";
import { MailSequenceEditor } from "@/components/mails/sequence-editor";

export default function MailSequenceEditorRoute() {
  const params = useParams<{ sequenceId: string }>();
  return <MailSequenceEditor sequenceId={params.sequenceId} />;
}
