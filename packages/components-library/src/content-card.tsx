import { Card, CardContent } from "@/components/ui/card";
import Link from "./link";
import Image from "next/image";

import { cn } from "@/lib/utils";

interface ContentCardImageProps extends React.HTMLAttributes<HTMLDivElement> {
    src: string;
    alt?: string;
}

export function ContentCardImage({
    src,
    alt,
    className,
    ...props
}: ContentCardImageProps) {
    return (
        <div className={cn("relative aspect-video", className)} {...props}>
            <Image
                src={src || "/courselit_backdrop_square.webp"}
                alt={alt || ""}
                fill
                className="object-cover"
                priority
            />
        </div>
    );
}

interface ContentCardHeaderProps
    extends React.HTMLAttributes<HTMLHeadingElement> {
    children: React.ReactNode;
}

export function ContentCardHeader({
    children,
    className,
    ...props
}: ContentCardHeaderProps) {
    return (
        <h3 className={cn("text-xl font-semibold mb-3", className)} {...props}>
            {children}
        </h3>
    );
}

interface ContentCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export function ContentCardContent({
    children,
    className,
    ...props
}: ContentCardContentProps) {
    return (
        <CardContent className={cn("p-4", className)} {...props}>
            {children}
        </CardContent>
    );
}

interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    href: string;
}

export function ContentCard({ children, href }: ContentCardProps) {
    return (
        <Link href={href}>
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {children}
            </Card>
        </Link>
    );
}
