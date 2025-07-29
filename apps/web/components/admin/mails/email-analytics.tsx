import { useEffect, useState } from "react";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { useToast } from "@courselit/components-library";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { Sequence, SequenceReport } from "@courselit/common-models";
import Link from "next/link";

interface EmailAnalyticsProps {
    sequence: Sequence;
    report?: SequenceReport;
}

interface AnalyticsData {
    totalEmailsSent: number;
    openRate: number;
    clickThroughRate: number;
    clickToOpenRate: number;
}

export default function EmailAnalytics({
    sequence,
    report,
}: EmailAnalyticsProps) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const fetch = useGraphQLFetch();

    // Get subscriber count from report
    const subscriberCount = report?.sequence?.subscribers?.length || 0;

    useEffect(() => {
        if (sequence?.sequenceId) {
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
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="text-gray-500">
                No analytics data available for this sequence.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Subscribers
                </h3>
                <p className="text-3xl font-bold text-gray-900">
                    {sequence.entrantsCount.toLocaleString()}
                </p>
                <Link
                    href={`/dashboard/mails/${sequence.type}/${sequence.sequenceId}`}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                >
                    View all subscribers →
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Total Emails Sent
                </h3>
                <p className="text-3xl font-bold text-gray-900">
                    {analytics.totalEmailsSent.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Total number of emails delivered
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Open Rate
                </h3>
                <p className="text-3xl font-bold text-gray-900">
                    {analytics.openRate.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Percentage of recipients who opened the email
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Click-Through Rate
                </h3>
                <p className="text-3xl font-bold text-gray-900">
                    {analytics.clickThroughRate.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Percentage of recipients who clicked a link
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Click-to-Open Rate
                </h3>
                <p className="text-3xl font-bold text-gray-900">
                    {analytics.clickToOpenRate.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Percentage of openers who clicked a link
                </p>
            </div>
        </div>
    );
}
