import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, CircleDashed, Users } from "lucide-react";
import { Community } from "@courselit/common-models";
import { Link } from "@courselit/components-library";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@components/ui/tooltip";

export function ContentCard({
    community,
    publicView = true,
}: {
    community: Community;
    publicView?: boolean;
}) {
    return (
        <Link
            href={
                publicView
                    ? `/p/${community.pageId}`
                    : `/dashboard/community/${community.communityId}`
            }
        >
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
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="h-4 w-4 mr-2" />
                            <span>
                                {community.membersCount.toLocaleString()}{" "}
                                members
                            </span>
                        </div>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {community.enabled ? (
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <CircleDashed className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    {community.enabled ? "Enabled" : "Draft"}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
