import { getSitemap } from '../../graphql/sitemap/logic';
import { headers } from 'next/headers';
import Page from '../../models/Page';

export async function GET() {
  const headersList = headers();
  const domain = headersList.get('host') || '';
  const sitemap = await getSitemap(domain);
  const blogs = sitemap.publishLatestBlogs ? await Page.find({ domain, type: 'blogPage' }) : [];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemap.items
    .map(
      (item) => `
    <url>
      <loc>${new URL(item.loc, `https://${domain}`).href}</loc>
      ${item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : ''}
    </url>
  `
    )
    .join('')}
  ${blogs
    .map(
      (blog) => `
    <url>
      <loc>${new URL(`/blog/${blog.slug}`, `https://${domain}`).href}</loc>
      <lastmod>${new Date(blog.updatedAt).toISOString()}</lastmod>
    </url>
  `
    )
    .join('')}
</urlset>`;

  return new Response(sitemapXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
