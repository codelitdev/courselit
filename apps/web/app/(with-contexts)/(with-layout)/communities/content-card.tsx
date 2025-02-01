import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Community } from "@courselit/common-models";
import { Link } from "@courselit/components-library";

export function ContentCard({ community }: { community: Community }) {
    return (
        <Link href={`/p/${community.pageId}`}>
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="relative aspect-video">
                    <Image
                        src={
                            community.featuredImage?.thumbnail ||
                            "/courselit_backdrop_square.webp"
                        }
                        alt={community.name}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
                <CardContent className="p-4">
                    <h3 className="text-xl font-semibold mb-3">
                        {community.name}
                    </h3>
                    {community.membersCount && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="h-4 w-4 mr-2" />
                            <span>
                                {community.membersCount.toLocaleString()}{" "}
                                members
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}
