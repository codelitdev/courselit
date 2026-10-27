"use client";

import { useParams } from "next/navigation";
import { WebsitePageEditor } from "@/components/content/website-page-editor";

export default function EditWebsitePageRoute() {
  const params = useParams<{ pageId: string }>();
  return <WebsitePageEditor pageId={params.pageId} />;
}
