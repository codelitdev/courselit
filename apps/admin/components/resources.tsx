import { ExternalLink } from "lucide-react";

type ResourceLink = {
  href: string;
  text: string;
};

export function Resources({ links }: { links: ResourceLink[] }) {
  if (links.length === 0) return null;

  return (
    <section className="mt-8 mb-8" aria-labelledby="admin-resources-heading">
      <h2 id="admin-resources-heading" className="text-base font-medium">
        Resources
      </h2>
      <ul className="mt-2 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {link.text}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
