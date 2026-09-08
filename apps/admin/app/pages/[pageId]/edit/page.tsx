"use client";

import { useParams } from "next/navigation";
import { FrontLitPageEditor } from "@/components/content/frontlit-page-editor";

export default function EditPageRoute() {
  const params = useParams<{ pageId: string }>();
  return <FrontLitPageEditor pageId={params.pageId} />;
}
