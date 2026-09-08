import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const FALLBACK_IMAGE = "/courselit_backdrop_square.webp";

export function FeaturedCard({
  href,
  title,
  titleHref,
  imageUrl,
  imageAlt,
  children,
  className,
}: {
  href?: string;
  title: string;
  titleHref?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  children: ReactNode;
  className?: string;
}) {
  const content = (
    <>
      <div className="relative h-36 w-full shrink-0">
        <Image
          src={imageUrl || FALLBACK_IMAGE}
          alt={imageAlt || ""}
          aria-hidden={imageAlt ? undefined : true}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          unoptimized
          className="object-cover"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4">
        {titleHref ? (
          <Link href={titleHref} className="group/title">
            <h2 className="truncate text-base font-semibold group-hover/title:text-primary">
              {title}
            </h2>
          </Link>
        ) : (
          <h2 className="truncate text-base font-semibold group-hover:text-primary">
            {title}
          </h2>
        )}
        {children}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors hover:border-primary/60 hover:bg-muted/20",
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-colors hover:border-primary/60 hover:bg-muted/20",
        className,
      )}
    >
      {content}
    </article>
  );
}
