import { ThemeContext } from "@components/contexts";
import { Community } from "@courselit/common-models";
import { useContext } from "react";
import {
    PageCard,
    PageCardContent,
    PageCardHeader,
    PageCardImage,
    Text2,
} from "@courselit/page-primitives";
import Link from "next/link";
import { CheckCircle, CircleDashed, Users } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@components/ui/tooltip";

export function CommunityContentCard({
    community,
    publicView = true,
}: {
    community: Community;
    publicView?: boolean;
}) {
    const { theme: uiTheme } = useContext(ThemeContext);
    const { theme } = uiTheme;

    return (
        <PageCard isLink={true} className="overflow-hidden" theme={theme}>
            <Link
                href={
                    publicView
                        ? `/p/${community.pageId}`
                        : `/dashboard/community/${community.communityId}`
                }
                style={{
                    height: "100%",
                    display: "block",
                }}
            >
                <PageCardImage
                    src={
                        community.featuredImage?.file ||
                        "/courselit_backdrop_square.webp"
                    }
                    alt={community.name}
                    className="aspect-video object-cover"
                    theme={theme}
                />
                <PageCardContent theme={theme}>
                    <PageCardHeader theme={theme}>
                        {community.name}
                    </PageCardHeader>
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            <Text2 theme={theme}>
                                {community.membersCount.toLocaleString()}{" "}
                                members
                            </Text2>
                        </div>
                        {!publicView && (
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
                                        {community.enabled
                                            ? "Enabled"
                                            : "Draft"}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </PageCardContent>
            </Link>
        </PageCard>
    );
}
