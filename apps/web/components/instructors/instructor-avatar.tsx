import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Instructor } from "@courselit/common-models";

export function getInitials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

export default function InstructorAvatar({
    instructor,
    className,
}: {
    instructor: Pick<Instructor, "name" | "avatar">;
    className?: string;
}) {
    const src = instructor.avatar?.file || instructor.avatar?.thumbnail;
    return (
        <Avatar className={className}>
            {src && <AvatarImage src={src} alt="" />}
            <AvatarFallback>{getInitials(instructor.name)}</AvatarFallback>
        </Avatar>
    );
}
