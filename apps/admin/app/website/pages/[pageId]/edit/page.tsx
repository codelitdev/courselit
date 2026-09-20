"use client";

import { useParams } from "next/navigation";
import { FrontLitPageEditor } from "@/components/content/frontlit-page-editor";

export default function EditWebsitePageRoute() {
  const params = useParams<{ pageId: string }>();
  return <FrontLitPageEditor pageId={params.pageId} />;
}
