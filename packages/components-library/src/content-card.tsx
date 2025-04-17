import { Card, CardContent } from "@/components/ui/card";
import Link from "./link";
import { cn } from "@/lib/utils";
import { Image } from "./image";

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
        <div className={cn("", className)} {...props}>
            <Image src={src} alt={alt} loading="lazy" />
        </div>
    );
}

interface ContentCardHeaderProps
    extends React.HTMLAttributes<HTMLHeadingElement> {
    children: string | JSX.Element;
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
    children: string | JSX.Element | (string | JSX.Element)[];
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
    children: string | JSX.Element | (string | JSX.Element)[];
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
