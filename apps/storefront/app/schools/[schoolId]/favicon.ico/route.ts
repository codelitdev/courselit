import { NextResponse } from "next/server";
import { getSettings } from "@/lib/courselit-public";
import { requestHost } from "@/lib/request-host";

const COURSELIT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g fill="oklch(0.62 0.16 30 / 0.18)" stroke="oklch(0.62 0.16 30)" stroke-width="2.6" stroke-linejoin="round"><path d="M32,10 L38,28 L32,34 L26,28 Z"></path><path d="M32,10 L38,28 L32,34 L26,28 Z" transform="rotate(90 32 32)"></path><path d="M32,10 L38,28 L32,34 L26,28 Z" transform="rotate(180 32 32)"></path><path d="M32,10 L38,28 L32,34 L26,28 Z" transform="rotate(270 32 32)"></path></g></svg>`;

export async function GET() {
  const host = await requestHost();
  const settings = await getSettings(host);
  const siteLogoUrl =
    typeof settings?.logo?.url === "string" && settings.logo.url.trim()
      ? settings.logo.url.trim()
      : null;

  if (siteLogoUrl) {
    try {
      const imageResponse = await fetch(siteLogoUrl);
      if (imageResponse.ok) {
        const contentType = imageResponse.headers.get("content-type") || "image/x-icon";
        const buffer = await imageResponse.arrayBuffer();
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=3600",
          },
        });
      }
    } catch {
      // Fall back to CourseLit default favicon if fetching fails
    }
  }

  return new NextResponse(COURSELIT_ICON_SVG, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=86400",
    },
  });
}
