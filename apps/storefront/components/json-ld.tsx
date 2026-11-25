import { serializeJsonLd } from "@frontlit/site-seo";

/** A schema.org block for search engines and AI answers; renders nothing
 * without data. */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: serializeJsonLd escapes `<`.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
