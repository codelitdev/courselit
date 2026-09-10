"use client";

import { useParams } from "next/navigation";
import { FrontLitBlogEditor } from "@/components/content/frontlit-blog-editor";

export default function EditWebsiteBlogRoute() {
  const params = useParams<{ blogId: string }>();
  return <FrontLitBlogEditor blogId={params.blogId} />;
}
