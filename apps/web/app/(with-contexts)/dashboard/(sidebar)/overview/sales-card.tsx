import { SiteInfoContext } from "@components/contexts";
import { Card, CardContent, CardTitle, CardHeader } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";
import { getSymbolFromCurrency } from "@courselit/components-library";
import { useContext } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export default function SalesCard({
    data,
    loading,
}: {
    data: any;
    loading: boolean;
}) {
    const siteinfo = useContext(SiteInfoContext);

    return (
        <div className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Sales</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <Skeleton className="h-[240px] w-full" />
                    ) : (
                        <div className="">
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart
                                    width={300}
                                    height={200}
                                    data={data?.points}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#e5e7eb"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        strokeWidth={2}
                                        stroke="#000000"
                                        dot={false}
                                    />
                                    <XAxis
                                        dataKey="date"
                                        className="text-xs"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tickFormatter={(value) =>
                                            `${getSymbolFromCurrency(siteinfo.currencyISOCode || "USD")}${value}`
                                        }
                                        className="text-xs"
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#333",
                                            border: "none",
                                            borderRadius: "4px",
                                            padding: "4px 8px",
                                            fontSize: "12px",
                                            color: "white",
                                        }}
                                        itemStyle={{ color: "white" }}
                                        formatter={(value) => [
                                            `Sales: ${value}`,
                                        ]}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
