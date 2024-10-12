"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Select,
    Skeleton,
} from "@courselit/components-library";
import constants from "@config/constants";
import { useEffect, useState } from "react";
import { FetchBuilder } from "@courselit/utils";
import { AppState } from "@courselit/state-management";
import { Address } from "@courselit/common-models";
import { connect } from "react-redux";
import {
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { DASHBOARD_SELECT_HEADER } from "@ui-config/strings";
const { analyticsDurations, activityTypes } = constants;

type Duration = (typeof analyticsDurations)[number];

interface MetricProps {
    title: string;
    type: (typeof activityTypes)[number];
    duration?: Duration;
    description?: string;
    address: Address;
}

export const Metric = ({
    title,
    duration = "7d",
    type,
    description,
    address,
}: MetricProps) => {
    const [data, setData] = useState<{
        count: number;
        points: { date: string; count: number }[];
    }>();
    const [internalDuration, setInternalDuration] = useState(duration);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const getData = async () => {
            const query = `
            query {
                activities: getActivities(
                    type: ${type.toUpperCase()}, 
                    duration: _${internalDuration.toUpperCase()}
                ) {
                    count,
                    points {
                        date,
                        count
                    } 
                }
            }
            `;

            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();

            try {
                setLoading(true);
                const response = await fetch.exec();
                if (response.activities) {
                    const pointsWithDate = response.activities.points.map(
                        (point: { date: string; count: number }) => {
                            return {
                                date: new Date(
                                    +point.date,
                                ).toLocaleDateString(),
                                count: point.count,
                            };
                        },
                    );

                    setData({
                        count: response.activities.count,
                        points: pointsWithDate,
                    });
                }
            } catch (err: any) {
                console.log("Error in fetching activities"); // eslint-disable-line
            } finally {
                setLoading(false);
            }
        };

        getData();
    }, [internalDuration]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <CardTitle>{title}</CardTitle>
                    <div className="w-[90px]">
                        <Select
                            value={internalDuration}
                            disabled={loading}
                            onChange={(e: Duration) => setInternalDuration(e)}
                            options={[
                                { label: "7d", value: "7d" },
                                { label: "30d", value: "30d" },
                                { label: "90d", value: "90d" },
                                { label: "1y", value: "1y" },
                                { label: "Lifetime", value: "lifetime" },
                            ]}
                            variant="without-label"
                            title={DASHBOARD_SELECT_HEADER}
                        />
                    </div>
                </div>
                {description && (
                    <CardDescription>
                        Number of users who enrolled in a course
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {loading && (
                    <div>
                        <Skeleton className="h-8 w-full mb-2" />
                        <Skeleton className="h-[200px] w-full" />
                    </div>
                )}
                {!loading && (
                    <>
                        <div className="flex text-sm text-slate-500 mb-4 font-bold justify-between">
                            <span>Total</span>
                            <span>{data?.count}</span>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart
                                width={300}
                                height={200}
                                data={data?.points}
                            >
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#8884d8"
                                />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                            </LineChart>
                        </ResponsiveContainer>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(Metric);
