import { useEffect, useState } from "react";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { useToast } from "@courselit/components-library";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { Sequence } from "@courselit/common-models";
import SubscribersList from "./subscribers-list";
import { HelpCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@components/ui/tooltip";

interface EmailAnalyticsProps {
    sequence: Sequence;
}

interface AnalyticsData {
    totalEmailsSent: number;
    openRate: number;
    clickThroughRate: number;
    clickToOpenRate: number;
}

export default function EmailAnalytics({ sequence }: EmailAnalyticsProps) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const fetch = useGraphQLFetch();

    useEffect(() => {
        if (sequence?.sequenceId && sequence.entrantsCount > 0) {
            loadAnalytics();
        }
    }, [sequence]);

    const loadAnalytics = async () => {
        setLoading(true);

        const query = `
            query GetEmailAnalytics($sequenceId: String!) {
                totalEmailsSent: getEmailSentCount(sequenceId: $sequenceId)
                openRate: getSequenceOpenRate(sequenceId: $sequenceId)
                clickThroughRate: getSequenceClickThroughRate(sequenceId: $sequenceId)
            }
        `;

        const fetcher = fetch
            .setPayload({
                query,
                variables: { sequenceId: sequence.sequenceId },
            })
            .build();

        try {
            const response = await fetcher.exec();

            if (response) {
                const { totalEmailsSent, openRate, clickThroughRate } =
                    response;

                // Calculate CTOR (Click-to-Open Rate) = CTR / Open Rate
                const clickToOpenRate =
                    openRate > 0 ? (clickThroughRate / openRate) * 100 : 0;

                setAnalytics({
                    totalEmailsSent,
                    openRate: openRate,
                    clickThroughRate: clickThroughRate,
                    clickToOpenRate,
                });
            }
        } catch (e: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col gap-4">
                <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    // Show placeholder for broadcast that has been sent but analytics not yet available
    if (sequence.entrantsCount <= 0) {
        return (
            <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
                <div className="max-w-md mx-auto">
                    <div className="mb-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-muted-foreground"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            Analytics Not Available
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            Analytics will be available once the{" "}
                            {sequence.type.toLowerCase()} is sent to a few
                            subscribers.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-muted-foreground">
                No analytics data available for this sequence.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Compact Analytics Summary */}
            <div className="bg-white rounded-lg border shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-4">
                    Email Performance
                </h3>
                <TooltipProvider>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <div className="text-xs text-muted-foreground">
                                    Subscribers
                                </div>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Total number of people subscribed to
                                            this sequence
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="text-2xl font-bold">
                                {sequence.entrantsCount.toLocaleString()}
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <div className="text-xs text-muted-foreground">
                                    Emails Sent
                                </div>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Total number of emails delivered to
                                            subscribers
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="text-2xl font-bold">
                                {analytics.totalEmailsSent.toLocaleString()}
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <div className="text-xs text-muted-foreground">
                                    Open Rate
                                </div>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Percentage of recipients who opened
                                            the email
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="text-2xl font-bold">
                                {analytics.openRate.toFixed(1)}%
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <div className="text-xs text-muted-foreground">
                                    Click Rate
                                </div>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Percentage of recipients who clicked
                                            a link in the email
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="text-2xl font-bold">
                                {analytics.clickThroughRate.toFixed(1)}%
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 mb-1">
                                <div className="text-xs text-muted-foreground">
                                    Click-to-Open
                                </div>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Percentage of email openers who
                                            clicked a link
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="text-2xl font-bold">
                                {analytics.clickToOpenRate.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </TooltipProvider>
            </div>

            <SubscribersList sequenceId={sequence.sequenceId} />
        </div>
    );
}
