"use client";

import { useParams } from "next/navigation";
import { WebsiteBlogEditor } from "@/components/content/website-blog-editor";

export default function EditBlogRoute() {
  const params = useParams<{ blogId: string }>();
  return <WebsiteBlogEditor blogId={params.blogId} />;
}
