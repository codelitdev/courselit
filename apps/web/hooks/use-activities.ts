import { useState, useEffect, useContext } from "react";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext } from "@components/contexts";

interface MetricsData {
    count: number;
    growth: number;
    points: { date: string; count: number }[];
}

export function useActivities(
    type: string,
    duration: string,
    entityId?: string,
    points?: boolean,
) {
    const address = useContext(AddressContext);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<MetricsData>({
        count: 0,
        growth: 0,
        points: [],
    });

    useEffect(() => {
        const getData = async () => {
            const query = `
                query getActivities($type: ActivityType!, $duration: DurationType!, $growth: Boolean!, $points: Boolean, $entityId: String) {
                    activities: getActivities(
                        type: $type, 
                        duration: $duration,
                        growth: $growth,
                        points: $points,
                        entityId: $entityId
                    ) {
                        count
                        growth
                        points {
                            date
                            count
                        }
                    }
                }
                `;

            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        type: type.toUpperCase(),
                        duration: `_${duration.toUpperCase()}`,
                        growth: true,
                        points: points,
                        entityId: entityId,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();

            try {
                setLoading(true);
                const response = await fetch.exec();
                if (response.activities) {
                    setData({
                        count: response.activities.count,
                        growth: response.activities.growth,
                        points: response.activities.points?.map(
                            (point: { date: string; count: number }) => {
                                return {
                                    // date: new Date(
                                    //     +point.date,
                                    // ).toLocaleDateString(),
                                    // date: new Date(+point.date).toLocaleDateString('en-US', {
                                    //     day: '2-digit',
                                    //     month: 'short',
                                    //     year: '2-digit'
                                    // }),
                                    date: (() => {
                                        const dateObj = new Date(+point.date);
                                        const currentYear =
                                            new Date().getFullYear();
                                        return dateObj.toLocaleDateString(
                                            "en-US",
                                            {
                                                day: "2-digit",
                                                month: "short",
                                                ...(dateObj.getFullYear() !==
                                                    currentYear && {
                                                    year: "2-digit",
                                                }),
                                            },
                                        );
                                    })(),
                                    count: point.count,
                                };
                            },
                        ),
                    });
                }
            } catch (err: any) {
                console.log("Error in fetching activities"); // eslint-disable-line
            } finally {
                setLoading(false);
            }
        };

        getData();
    }, [type, duration, address.backend]);

    return { data, loading };
}
